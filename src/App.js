import React, { useState, useEffect } from 'react';
import { migrateAllToBackend } from './api/migrate';
import { initialState } from './initialState';
import { api } from './api/client';
import { syncStateWithDB } from './api/sync';
import { s } from './components/UI';
import StockPage from './components/StockPage';
import PartPage from './components/PartPage';
import CategoryPage from './components/CategoryPage';
import ModulPage from './components/ModulPage';
import ModulMasterPage from './components/ModulMasterPage';
import ProjectPage from './components/ProjectPage';
import SubModulPage from './components/SubModulPage';
import SetupItemPage from './components/SetupItemPage';
import DefinedNamesPage from './components/DefinedNamesPage';
import { buildStockDerivedCategories } from './utils/stockCategoryMap';
import { parseHashRoute, buildHashRoute } from './utils/routeParser';
import { autoFillRowFromPart } from './utils/autoFill';

const PAGES = [
  { key: 'modul', label: 'Modul' },
  { key: 'project', label: 'Project' },
];

// Aliases that belong to "Lapisan Standard" section
const LAPISAN_STANDARD_ALIASES = ['lap_blk_pintu', 'lap_inv_kab', 'lap_pintu_mlp', 'tip_lap_inv'];

export default function App() {
  const [route, setRoute] = useState(() => parseHashRoute(window.location.hash));
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [showModulMaster, setShowModulMaster] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [migrasi, setMigrasi] = useState({ open: false, running: false, logs: [], done: false, errors: [] });
  const [syncStatus, setSyncStatus] = useState('saved'); // 'saved', 'saving', 'error'
  const stateRef = React.useRef(state);
  const pendingSyncs = React.useRef({});
  const lastSyncedState = React.useRef({});
  const syncInProgress = React.useRef({});

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Sync state with URL hash updates
  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHashRoute(window.location.hash));
    };
    window.addEventListener('hashchange', handleHashChange);
    if (!window.location.hash || window.location.hash === '#/') {
      window.location.hash = '#/modul';
    }
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load all data from PostgreSQL database on startup
  useEffect(() => {
    async function fetchDBData() {
      try {
        console.log("🔄 Fetching application data from PostgreSQL...");
        const [
          categoriesRes,
          tplSectionsRes,
          modulMasterDataRes,
          setupItemsRes,
          partsRes,
          stockRes,
          projectsRes,
          modulsRes,
          globalConstantsRes
        ] = await Promise.all([
          api.get('/categories').catch(() => null),
          api.get('/settings/tplSections').catch(() => null),
          api.get('/settings/modulMasterData').catch(() => null),
          api.get('/setup-items').catch(() => null),
          api.get('/parts?limit=2000').catch(() => null),
          api.get('/stock?limit=9999').catch(() => null),
          api.get('/projects?limit=500').catch(() => null),
          api.get('/moduls?limit=500').catch(() => null),
          api.get('/settings/globalConstants').catch(() => null)
        ]);

        const dbState = {};

        if (categoriesRes && (categoriesRes.data || categoriesRes.length)) {
          dbState.categories = categoriesRes.data || categoriesRes;
        }

        if (tplSectionsRes && tplSectionsRes.value) {
          let loadedSections = tplSectionsRes.value;
          let changed = false;
          loadedSections = loadedSections.map(sec => {
            if (sec.name === 'Spesifikasi Lapisan') {
              const originalCount = sec.rows.length;
              const newRows = sec.rows.filter(row => {
                const match = row.label.match(/\d+/);
                const num = match ? parseInt(match[0]) : null;
                const isKab = row.label.toLowerCase().includes('kabinet') || row.label.toLowerCase().includes('edgingkab');
                if (isKab && num >= 4) return false;
                return true;
              });
              if (newRows.length !== originalCount) {
                changed = true;
                return { ...sec, rows: newRows };
              }
            }
            return sec;
          });
          dbState.tplSections = loadedSections;
          if (changed) {
            // Optimistically sync the updated template back to DB
            api.put('/settings/tplSections', { value: loadedSections }).catch(console.error);
          }
        }

        if (modulMasterDataRes && modulMasterDataRes.value) {
          dbState.modulMasterData = modulMasterDataRes.value;
        }

        if (setupItemsRes && (setupItemsRes.data || setupItemsRes.length)) {
          dbState.setupItems = setupItemsRes.data || setupItemsRes;
        }

        if (partsRes && (partsRes.data || partsRes.length)) {
          const rawParts = partsRes.data || partsRes;
          // Build fallback map from initialState (already has minifix/dowel from partsData.js)
          const defaultPartMap = {};
          (initialState.parts || []).forEach(dp => { if (dp.val) defaultPartMap[dp.val] = dp; });
          dbState.parts = rawParts.map(p => {
            let extra = {};
            if (p.keterangan) {
              try { extra = JSON.parse(p.keterangan); } catch (_) { }
            }
            const def = defaultPartMap[p.val];
            return {
              ...p,
              name: p.name || p.val || '',
              minifix: p.minifix || (def ? def.minifix : '') || '',
              dowel: p.dowel || (def ? def.dowel : '') || '',
              ...extra
            };
          });
        }

        if (stockRes && (stockRes.data || stockRes.length)) {
          const rawStock = stockRes.data || stockRes;
          dbState.stock = rawStock
            .map(s => ({
              id: s.kode || '',
              _uuid: s.id,
              kode: s.kode || '',
              kat: s.kat || '',
              nama: s.nama || '',
              tebal: parseFloat(s.tebal) || 0,
              sat: s.satuan || '',
              satuan: s.satuan || '',
              ket: s.keterangan || '',
              keterangan: s.keterangan || ''
            }))
            .sort((a, b) => {
              // Urut berdasarkan kode (ID Barang) dari terkecil
              if (!a.kode && !b.kode) return 0;
              if (!a.kode) return 1;  // item tanpa kode di akhir
              if (!b.kode) return -1;
              const ka = a.kode.padStart(20, '0');
              const kb = b.kode.padStart(20, '0');
              return ka < kb ? -1 : ka > kb ? 1 : 0;
            });
        }

        if (projectsRes && (projectsRes.data || projectsRes.length)) {
          const rawProjects = projectsRes.data || projectsRes;
          dbState.projects = rawProjects.map(p => ({
            id: p.id,
            name: p.name || '',
            client: p.client || '',
            speks: p.speks || [],
            breakdown: (p.breakdown || []).map(r => {
              const rowCopy = { ...r, isParent: r.is_parent || false };
              return autoFillRowFromPart(rowCopy, dbState.parts || []);
            })
          }));
        }

        if (modulsRes && (modulsRes.data || modulsRes.length)) {
          const rawModuls = modulsRes.data || modulsRes;
          // Filter to only include master templates (no project-specific modules)
          const masterModuls = rawModuls.filter(m => !m.project_id || m.project_name?.toLowerCase() === 'master templates');
          dbState.moduls = masterModuls.map(m => ({
            ...m,
            komponen: (m.komponen || []).map(k => {
              const rowCopy = { ...k, isParent: k.is_parent || false };
              return autoFillRowFromPart(rowCopy, dbState.parts || []);
            })
          }));
        }
        if (state.subModuls && state.subModuls.length > 0) {
          dbState.subModuls = state.subModuls.map(sub => ({
            ...sub,
            komponen: (sub.komponen || []).map(k => autoFillRowFromPart(k, dbState.parts || []))
          }));
        }

        if (globalConstantsRes && globalConstantsRes.value) {
          dbState.globalConstants = globalConstantsRes.value;
        }

        // Apply to React state
        setState(prev => ({
          ...prev,
          ...dbState
        }));

        console.log("✅ Data successfully loaded from PostgreSQL!");
      } catch (err) {
        console.error("❌ Failed to load data from PostgreSQL, falling back to initialState:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDBData();
  }, []);

  // Keep window.__globalConstants in sync with React state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__globalConstants = state.globalConstants || {};
    }
  }, [state.globalConstants]);

  // One-time migration: split old "Spesifikasi Lapisan / Fin." into two sections
  useEffect(() => {
    const hasOldSection = state.tplSections.some(s => s.name === 'Spesifikasi Lapisan / Fin.');
    if (!hasOldSection) return;

    const newSections = [];
    for (const sec of state.tplSections) {
      if (sec.name === 'Spesifikasi Lapisan / Fin.') {
        const standardRows = sec.rows.filter(r => LAPISAN_STANDARD_ALIASES.includes(r.alias));
        const spekRows = sec.rows.filter(r => !LAPISAN_STANDARD_ALIASES.includes(r.alias));
        newSections.push({ name: 'Lapisan Standard', rows: standardRows });
        if (spekRows.length > 0) {
          newSections.push({ name: 'Spesifikasi Lapisan', rows: spekRows });
        }
      } else {
        newSections.push(sec);
      }
    }
    setState(prev => ({ ...prev, tplSections: newSections }));
  }, [loading]); // Run after loading is finished and state is loaded

  function update(key) {
    return (val) => {
      const prevVal = stateRef.current[key];
      // Optimistic update: Update frontend UI immediately for maximum speed
      setState(prev => ({ ...prev, [key]: val }));

      // Set the base state to compare against if not already set
      if (lastSyncedState.current[key] === undefined) {
        lastSyncedState.current[key] = prevVal;
      }

      setSyncStatus('saving');

      // Clear any pending timeout for this key
      if (pendingSyncs.current[key]) {
        clearTimeout(pendingSyncs.current[key]);
      }

      // Schedule the database sync
      pendingSyncs.current[key] = setTimeout(async function runSync() {
        if (syncInProgress.current[key]) {
          // Retry in 200ms if a sync is already active
          pendingSyncs.current[key] = setTimeout(runSync, 200);
          return;
        }

        const prev = lastSyncedState.current[key];
        const next = stateRef.current[key];

        console.log(`⏳ Debounced sync running for "${key}"...`);
        syncInProgress.current[key] = true;
        try {
          await syncStateWithDB(key, prev, next, stateRef.current, setState);
          // Once sync is successful, update the last synced state
          lastSyncedState.current[key] = next;
          setSyncStatus('saved');
          console.log(`✅ Debounced sync completed for "${key}"`);
        } catch (err) {
          setSyncStatus('error');
          console.error(`[Sync Error] Failed to replicate "${key}" changes to database:`, err);
        } finally {
          delete syncInProgress.current[key];
        }
        delete pendingSyncs.current[key];
      }, 1500); // 1.5 seconds debounce
    };
  }

  async function runMigrasi() {
    setMigrasi(m => ({ ...m, running: true, logs: ['🚀 Memulai migrasi...'], done: false, errors: [] }));
    const errors = await migrateAllToBackend(state, (msg) => {
      setMigrasi(m => ({ ...m, logs: [...m.logs, msg] }));
    });
    setMigrasi(m => ({
      ...m, running: false, done: true, errors,
      logs: [...m.logs, errors.length === 0 ? '\n✅ Semua data berhasil dimigrasi!' : `\n⚠ Selesai dengan ${errors.length} error.`]
    }));
  }

  const syncedCategories = React.useMemo(() => {
    const stock = state.stock || [];
    const categories = state.categories || [];

    const hplStockItems = stock
      .filter(s => (s.kat || '').toLowerCase() === 'hpl')
      .map((s, idx) => ({
        code: s.kode || s.id || '',
        val: idx + 1,
        name: s.nama || '',
        tebal: parseFloat(s.tebal) || 0.0
      }));

    hplStockItems.push(
      { code: '2', val: hplStockItems.length + 1, name: '(WY_5216_D(V) rangka......+Aica)', tebal: 1.0 },
      { code: '4', val: hplStockItems.length + 2, name: '(L-FA_0206_AP rangka......+Aica)', tebal: 1.0 }
    );

    const edgStockItems = stock
      .filter(s => ['edg', 'edging'].includes((s.kat || '').toLowerCase()))
      .map((s, idx) => ({
        code: s.kode || s.id || '',
        val: idx + 1,
        name: s.nama || '',
        tebal: parseFloat(s.tebal) || 0.0
      }));

    // Build stock-derived categories from Spek mapping
    const stockDerivedMap = buildStockDerivedCategories(stock);
    const stockDerivedCatList = Object.values(stockDerivedMap);

    // Merge: existing static categories + stock-derived
    const merged = categories.map(cat => {
      const codeLower = (cat.code || '').toLowerCase();
      if (codeLower === 'lap_luar' || codeLower === 'lap_dalam' || codeLower === 'hpl') {
        return { ...cat, items: hplStockItems };
      }
      if (codeLower === 'edg' || codeLower === 'edging') {
        return { ...cat, items: edgStockItems };
      }
      return cat;
    });

    // Append stock-derived categories, avoiding duplicates
    const existingCodes = new Set(merged.map(c => c.code));
    for (const cat of stockDerivedCatList) {
      if (!existingCodes.has(cat.code)) {
        merged.push(cat);
        existingCodes.add(cat.code);
      }
    }

    return merged;
  }, [state.categories, state.stock]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f5f0', fontFamily: "'Times New Roman', Times, serif" }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(124, 58, 237, 0.2)', borderTop: '3px solid #7c3aed', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 16 }}></div>
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 }}>Memuat Data PostgreSQL...</div>
        <div style={{ fontSize: 12, color: '#64748b' }}>Menyinkronkan data in-memory dengan basis data breakdown_db</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f5f0', fontFamily: "'Times New Roman', Times, serif", overflow: 'hidden' }}>
      <style>{`
        @keyframes pulse {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
      <nav style={s.nav}>
        {PAGES.map(p => (
          <button key={p.key} style={s.navBtn(route.page === p.key)} onClick={() => { window.location.hash = buildHashRoute({ page: p.key }); setShowModulMaster(false); setShowConfig(false); }}>
            {p.label}
          </button>
        ))}

        {/* Master Data Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            style={s.navBtn(route.page === 'masterModul')}
            onClick={() => { setShowModulMaster(!showModulMaster); setShowConfig(false); }}
          >
            Modul Master data {showModulMaster ? '▴' : '▾'}
          </button>
          {showModulMaster && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, background: '#fff',
              border: '0.5px solid #ddd', borderRadius: 8, marginTop: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: 200, padding: '4px 0'
            }}>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }} onClick={() => { window.location.hash = buildHashRoute({ page: 'masterModul' }); setShowModulMaster(false); }}>📁 All Categories</div>
            </div>
          )}
        </div>

        {/* Configuration Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            style={s.navBtn(['category', 'stock', 'part', 'submodul', 'setup', 'definedNames'].includes(route.page))}
            onClick={() => { setShowConfig(!showConfig); setShowModulMaster(false); }}
          >
            Configuration {showConfig ? '▴' : '▾'}
          </button>
          {showConfig && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, background: '#fff',
              border: '0.5px solid #ddd', borderRadius: 8, marginTop: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, width: 200, padding: '4px 0'
            }}>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { window.location.hash = buildHashRoute({ page: 'definedNames' }); setShowConfig(false); }}>🏷 Defined Names</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { window.location.hash = buildHashRoute({ page: 'category' }); setShowConfig(false); }}>🏷 Category</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { window.location.hash = buildHashRoute({ page: 'stock' }); setShowConfig(false); }}>📦 Stock / Inventory</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { window.location.hash = buildHashRoute({ page: 'part' }); setShowConfig(false); }}>🧩 Part Components</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '0.5px solid #f0f0f0' }} onClick={() => { window.location.hash = buildHashRoute({ page: 'submodul' }); setShowConfig(false); }}>🧊 Sub-Modul Template</div>
              <div style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13 }} onClick={() => { window.location.hash = buildHashRoute({ page: 'setup' }); setShowConfig(false); }}>🛠 Setup Items</div>
            </div>
          )}
        </div>

        <div style={{ marginLeft: 'auto', marginRight: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          {syncStatus === 'saving' && (
            <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
              Menyimpan...
            </span>
          )}
          {syncStatus === 'saved' && (
            <span style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669', display: 'inline-block' }} />
              Tersimpan
            </span>
          )}
          {syncStatus === 'error' && (
            <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
              Gagal Menyimpan
            </span>
          )}
        </div>

        {/* Tombol Migrasi ke Database */}
        <button
          style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '5px 13px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          onClick={() => setMigrasi(m => ({ ...m, open: true }))}
          title="Kirim semua data ke PostgreSQL backend"
        >
          Migrasi ke DB
        </button>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {route.page === 'modul' && (
          <ModulPage
            data={state.moduls}
            masterData={state.modulMasterData}
            parts={state.parts}
            setupItems={state.setupItems}
            subModuls={state.subModuls}
            categories={syncedCategories}
            sections={state.tplSections}
            stock={state.stock}
            onChange={update('moduls')}
          />
        )}
        {route.page === 'project' && (
          <ProjectPage
            projects={state.projects}
            moduls={state.moduls}
            subModuls={state.subModuls}
            sections={state.tplSections}
            categories={syncedCategories}
            parts={state.parts}
            stock={state.stock}
            setupItems={state.setupItems}
            globalConstants={state.globalConstants || {}}
            onChange={update('projects')}
            onTplChange={update('tplSections')}
            onPartsChange={update('parts')}
            onStockChange={update('stock')}
            onSetupItemsChange={update('setupItems')}
            projectId={route.projectId}
            step={route.step}
            subTab={route.subTab}
          />
        )}
        {route.page === 'masterModul' && <ModulMasterPage data={state.modulMasterData} onChange={update('modulMasterData')} />}
        {route.page === 'category' && (
          <CategoryPage
            data={syncedCategories}
            stock={state.stock || []}
            onChange={(nextCategories) => {
              const cleanCategories = nextCategories.map(cat => {
                const codeLower = (cat.code || '').toLowerCase();
                if (['lap_luar', 'lap_dalam', 'hpl', 'edg', 'edging'].includes(codeLower)) {
                  return { ...cat, items: [] };
                }
                return cat;
              });
              update('categories')(cleanCategories);
            }}
          />
        )}
        {route.page === 'stock' && <StockPage data={state.stock} onChange={update('stock')} />}
        {route.page === 'part' && <PartPage data={state.parts} onChange={update('parts')} />}
        {route.page === 'submodul' && (
          <SubModulPage
            data={state.subModuls}
            parts={state.parts}
            setupItems={state.setupItems}
            categories={syncedCategories}
            sections={state.tplSections}
            stock={state.stock}
            onChange={update('subModuls')}
          />
        )}
        {route.page === 'definedNames' && <DefinedNamesPage globalConstants={state.globalConstants || {}} onChange={update('globalConstants')} />}
        {route.page === 'setup' && <SetupItemPage data={state.setupItems} onChange={update('setupItems')} />}
      </div>

      {/* Modal Migrasi */}
      {migrasi.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1a1a2e', color: '#e2e8f0', borderRadius: 12, width: 620, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>Migrasi Data ke PostgreSQL</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Semua data in-memory akan dikirim ke backend API</div>
              </div>
              {!migrasi.running && (
                <button onClick={() => setMigrasi(m => ({ ...m, open: false, logs: [] }))} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>x</button>
              )}
            </div>
            <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {migrasi.logs.length === 0 && !migrasi.running && (
                <div style={{ color: '#94a3b8', padding: '20px 0' }}>
                  <div style={{ marginBottom: 8 }}>Data yang akan dimigrasi:</div>
                  <div style={{ paddingLeft: 12 }}>
                    <div>- {(state.categories || []).length} categories</div>
                    <div>- {(state.tplSections || []).length} template sections</div>
                    <div>- {(state.setupItems || []).length} setup items</div>
                    <div>- {(state.parts || []).length} template parts</div>
                    <div>- {(state.stock || []).length} stock records</div>
                    <div>- {(state.projects || []).length} projects</div>
                    <div>- {(state.moduls || []).length} Modul Kodifikasi templates</div>
                  </div>
                </div>
              )}
              {migrasi.logs.map((l, i) => (
                <div key={i} style={{ color: l.includes('[x]') ? '#f87171' : l.includes('[ok]') ? '#34d399' : l.startsWith('  ->') ? '#93c5fd' : '#e2e8f0' }}>{l}</div>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderTop: '0.5px solid #334155', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {!migrasi.running && !migrasi.done && (
                <>
                  <button onClick={() => setMigrasi(m => ({ ...m, open: false }))} style={{ padding: '7px 16px', borderRadius: 6, border: '0.5px solid #475569', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>Batal</button>
                  <button onClick={runMigrasi} style={{ padding: '7px 20px', borderRadius: 6, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Mulai Migrasi</button>
                </>
              )}
              {migrasi.running && (
                <div style={{ color: '#93c5fd', fontSize: 13 }}>Sedang memproses...</div>
              )}
              {migrasi.done && (
                <button onClick={() => setMigrasi(m => ({ ...m, open: false, logs: [], done: false }))} style={{ padding: '7px 20px', borderRadius: 6, border: 'none', background: '#059669', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Tutup</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
