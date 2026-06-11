import React, { useState } from 'react';
import { api } from '../api/client';
import { s, Modal, FormGroup, FormRow, Badge } from './UI';
import SpekPage from './SpekPage';
import BreakdownPage from './BreakdownPage';
import BOMPage from './BOMPage';
import RekapPage from './RekapPage';
import ReportPage from './ReportPage';
import ProductionRekapPage from './ProductionRekapPage';
import StockPage from './StockPage';
import PartPage from './PartPage';
import SetupItemPage from './SetupItemPage';
import CategoryRefPage from './CategoryRefPage';
import { defaultSpekVals } from '../defaultSpekVals';
import { buildAliasMap, resolveAlias } from '../utils/resolveAlias';
import { syncCategoriesWithSpek } from '../utils/categorySync';
import { buildHashRoute } from '../utils/routeParser';

export default function ProjectPage({
  projects,
  moduls,
  subModuls,
  sections,
  categories,
  parts,
  stock,
  setupItems,
  globalConstants = {},
  onChange,
  onTplChange,
  onPartsChange,
  onStockChange,
  onSetupItemsChange,
  projectId,
  step,
  subTab
}) {
  const [highlightedSpekField, setHighlightedSpekField] = useState(null);
  const [creating, setCreating] = useState(false);

  const activeId = projectId;
  const stepVal = step || 'spek';
  const breakdownTab = subTab || 'breakdown';

  const activeProject = projects.find(p => String(p.id) === String(activeId));

  // Guard: redirect to list if no project found and we're not in the middle of creating one
  React.useEffect(() => {
    if (activeId && !activeProject && !creating) {
      window.location.hash = '#/project';
    }
  }, [activeId, activeProject, creating]);

  const changeRoute = (newStep, newSubTab) => {
    window.location.hash = buildHashRoute({
      page: 'project',
      projectId: activeId,
      step: newStep,
      subTab: newSubTab
    });
  };

  const openProject = (id) => {
    window.location.hash = buildHashRoute({
      page: 'project',
      projectId: id,
      step: 'spek'
    });
  };

  const closeProject = () => {
    window.location.hash = '#/project';
  };

  // Resolve semua nilai "=varname" di parts sesuai spek project aktif
  // Ini yang di-pass ke breakdown supaya selalu sinkron dengan spek
  const activeSpec = activeProject?.speks?.[0] || {};

  // Sync categories with active project's Spek values
  const syncedCategories = React.useMemo(() => {
    return syncCategoriesWithSpek(categories, activeSpec, stock);
  }, [categories, activeSpec, stock]);

  // Merge globalConstants, stock, and categories into spec so evaluateFormula/calcBreakdownItem can access them
  const activeSpecWithGC = React.useMemo(
    () => ({ ...activeSpec, id: activeProject?.id, globalConstants, stock, categories: syncedCategories }),
    [activeSpec, activeProject?.id, globalConstants, stock, syncedCategories]
  );
  const aliasMap = React.useMemo(() => buildAliasMap(activeSpecWithGC), [activeSpecWithGC]);
  const resolvedParts = React.useMemo(() => {
    if (!parts || !aliasMap) return parts;
    return parts.map(p => {
      const resolved = { ...p };
      ['bhn', 'lap_luar', 'lap_dalam', 'edg_p1', 'edg_p2', 'edg_l1', 'edg_l2', 't_bhn'].forEach(field => {
        if (typeof resolved[field] === 'string' && resolved[field].startsWith('=')) {
          const key = resolved[field].slice(1).trim();
          const val = aliasMap[key] ?? aliasMap[key.toLowerCase()] ?? aliasMap[key.toUpperCase()]
            ?? aliasMap[key.replace(/_/g, '')] ?? aliasMap[key.replace(/_/g, '').toLowerCase()];
          if (val !== undefined) resolved[field] = val;
        }
      });
      return resolved;
    });
  }, [parts, aliasMap]);

  async function createProject() {
    if (creating) return;
    setCreating(true);
    const spekData = {
      tanggal: new Date().toISOString().slice(0, 10),
      norekap: '', estimator: '', koord: '', kontrak: '', nip: '',
      produk: '', proyek: '',
      statusPend: false, statusTidakPend: false,
      statusAntiRayap: false, statusTidakAntiRayap: false,
      vals: { ...defaultSpekVals }, modulRefs: []
    };
    try {
      // POST directly to DB to get the real UUID immediately —
      // this avoids navigating with a temp ID that later gets swapped,
      // which was causing the spurious redirect back to the project list.
      const res = await api.post('/projects', {
        name: 'Project Baru',
        client: '',
        status: 'active',
        speks: spekData
      });
      const newProj = {
        id: res.id,
        name: res.name || 'Project Baru',
        client: res.client || '',
        speks: [spekData],
        breakdown: []
      };
      onChange([...projects, newProj]);
      window.location.hash = buildHashRoute({
        page: 'project',
        projectId: res.id,
        step: 'spek',
        subTab: 'breakdown'
      });
    } catch (err) {
      console.error('Gagal membuat project:', err);
      alert('Gagal membuat project baru. Coba lagi.');
    } finally {
      setCreating(false);
    }
  }

  function updateProject(updated) {
    const next = projects.map(p => String(p.id) === String(activeId) ? updated : p);
    onChange(next);
  }

  function deleteProject(id) {
    if (window.confirm("Apakah Anda yakin ingin menghapus project ini beserta seluruh komponen breakdown-nya? Tindakan ini juga akan menghapus data di database secara permanen.")) {
      const next = projects.filter(p => p.id !== id);
      onChange(next);
    }
  }

  if (!activeId || !activeProject) {
    return (
      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
        <div style={s.pageHeader}>
          <span style={s.pageTitle}>Daftar Project</span>
          <button style={{ ...s.btnPrimary, opacity: creating ? 0.6 : 1, cursor: creating ? 'wait' : 'pointer' }} onClick={createProject} disabled={creating}>
            {creating ? '⏳ Membuat...' : '+ Project Baru'}
          </button>
        </div>

        <div style={s.tableWrap}>
          <style>{`
            .project-row {
              transition: background-color 0.15s ease;
            }
            .project-row:hover {
              background-color: #fafaf5 !important;
            }
            .project-link {
              font-weight: 500;
              color: #111;
              cursor: pointer;
              transition: color 0.15s ease;
            }
            .project-link:hover {
              color: #2563eb;
              text-decoration: underline;
            }
            .btn-action {
              transition: all 0.15s ease;
            }
            .btn-action:hover {
              transform: translateY(-1px);
              box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            }
            .btn-action:active {
              transform: translateY(0);
            }
          `}</style>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, padding: '10px 14px' }}>Tanggal</th>
                <th style={{ ...s.th, padding: '10px 14px' }}>NIP</th>
                <th style={{ ...s.th, padding: '10px 14px' }}>Nama Proyek</th>
                <th style={{ ...s.th, padding: '10px 14px' }}>Nama Produk</th>
                <th style={{ ...s.th, padding: '10px 14px' }}>Estimator</th>
                <th style={{ ...s.th, padding: '10px 14px' }}>Koordinator Rekap</th>
                <th style={{ ...s.th, padding: '10px 14px', width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={7} style={s.empty}>Belum ada project</td></tr>
              ) : projects.map(p => {
                const spec = p.speks?.[0] || {};
                return (
                  <tr key={p.id} className="project-row" style={{ borderBottom: '0.5px solid #eeeee8' }}>
                    <td style={{ ...s.td, padding: '10px 14px' }}>{spec.tanggal || '-'}</td>
                    <td style={{ ...s.td, padding: '10px 14px' }}>{spec.nip || '-'}</td>
                    <td style={{ ...s.td, padding: '10px 14px' }} onClick={() => openProject(p.id)}>
                      <span className="project-link">
                        {spec.proyek || p.name || '-'}
                      </span>
                    </td>
                    <td style={{ ...s.td, padding: '10px 14px' }}>{spec.produk || '-'}</td>
                    <td style={{ ...s.td, padding: '10px 14px' }}>{spec.estimator || '-'}</td>
                    <td style={{ ...s.td, padding: '10px 14px' }}>{spec.koord || '-'}</td>
                    <td style={{ ...s.td, padding: '10px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn-action" style={{ ...s.btnSm, fontWeight: 500 }} onClick={() => openProject(p.id)}>Buka</button>
                      <button
                        className="btn-action"
                        style={{ ...s.btnSm, background: '#ef4444', color: '#fff', border: 'none', marginLeft: 8, fontWeight: 500 }}
                        onClick={() => deleteProject(p.id)}
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ background: '#fff', borderBottom: '0.5px solid #d5d5cd', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button style={s.btnSm} onClick={closeProject}>← Kembali</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{activeProject.speks[0]?.proyek || activeProject.name}</span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          <button style={s.navBtn(stepVal === 'spek')} onClick={() => changeRoute('spek')}>1. Spek</button>
          <button style={s.navBtn(stepVal === 'breakdown')} onClick={() => changeRoute('breakdown')}>2. Breakdown</button>
          <button style={s.navBtn(stepVal === 'bom')} onClick={() => changeRoute('bom')}>3. Cutting List (CNC)</button>
          <button style={s.navBtn(stepVal === 'rekap')} onClick={() => changeRoute('rekap')}>4. Report (Rekap & BOM)</button>
          <button style={s.navBtn(stepVal === 'prod')} onClick={() => changeRoute('prod')}>5. Produksi & QC</button>
        </nav>
      </div>

      <div style={{ flex: 1, padding: stepVal === 'breakdown' ? 0 : 14, overflow: stepVal === 'breakdown' ? 'hidden' : 'auto', background: '#f5f5f0', display: 'flex', flexDirection: 'column' }}>
        {stepVal === 'spek' && (
          <SpekPage
            speks={activeProject.speks}
            sections={sections}
            categories={syncedCategories}
            stock={stock}
            moduls={moduls}
            onChange={(newSpeks) => updateProject({ ...activeProject, speks: newSpeks })}
            onTplChange={onTplChange}
            isProjectForm={true}
            highlightedField={highlightedSpekField}
            onClearHighlight={() => setHighlightedSpekField(null)}
          />
        )}
        {stepVal === 'breakdown' && (
          <>
            <div style={{ display: breakdownTab === 'breakdown' ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <BreakdownPage
                data={activeProject.breakdown}
                parts={resolvedParts}
                moduls={moduls}
                subModuls={subModuls}
                setupItems={setupItems}
                categories={syncedCategories}
                spec={activeSpecWithGC}
                sections={sections}
                onChange={(newBreakdown) => updateProject({ ...activeProject, breakdown: newBreakdown })}
                onVariableClick={(specKey) => {
                  setHighlightedSpekField(specKey);
                  changeRoute('spek');
                }}
              />
            </div>
            {breakdownTab === 'stock' && (
              <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <StockPage data={stock} onChange={onStockChange || (() => {})} readOnly={false} />
              </div>
            )}
            {breakdownTab === 'part' && (
              <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <PartPage data={parts} onChange={onPartsChange || (() => {})} readOnly={false} spec={activeSpecWithGC} />
              </div>
            )}
            {breakdownTab === 'setup' && (
              <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <SetupItemPage data={setupItems} onChange={onSetupItemsChange || (() => {})} readOnly={false} />
              </div>
            )}
            {breakdownTab === 'category' && (
              <div style={{ height: '100%', overflowY: 'auto' }}>
                <CategoryRefPage categories={syncedCategories} />
              </div>
            )}
          </>
        )}
        {stepVal === 'bom' && (
          <BOMPage
            breakdown={activeProject.breakdown}
            spec={activeSpecWithGC}
            sections={sections}
          />
        )}
        {stepVal === 'rekap' && (
          <ReportPage
            projectId={activeProject.id}
            breakdown={activeProject.breakdown}
            parts={parts}
            stock={stock}
            spec={activeSpecWithGC}
            sections={sections}
          />
        )}
        {stepVal === 'prod' && (
          <ProductionRekapPage
            breakdown={activeProject.breakdown}
            spec={activeSpecWithGC}
            sections={sections}
          />
        )}
      </div>

      {stepVal === 'spek' && (
        <div style={{ padding: '12px 20px', background: '#fff', borderTop: '0.5px solid #d5d5cd', textAlign: 'right', flexShrink: 0 }}>
          <button style={s.btnPrimary} onClick={() => changeRoute('breakdown', 'breakdown')}>Lanjut ke Breakdown →</button>
        </div>
      )}

      {stepVal === 'breakdown' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderTop: '0.5px solid #d5d5cd', padding: '6px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {['breakdown', 'stock', 'part', 'setup', 'category'].map(tab => (
              <button
                key={tab}
                style={{
                  padding: '6px 16px', borderRadius: '6px', border: 'none',
                  background: breakdownTab === tab ? '#e0e0d8' : 'transparent',
                  fontWeight: breakdownTab === tab ? 600 : 400,
                  cursor: 'pointer', fontSize: 13, color: '#111'
                }}
                onClick={() => changeRoute('breakdown', tab)}
              >
                {tab === 'breakdown' ? 'Breakdown Komponen' : tab === 'stock' ? 'Cek Stock' : tab === 'part' ? 'Data Part' : tab === 'setup' ? 'Set-up' : 'Referensi'}
              </button>
            ))}
          </div>
          <button style={s.btnPrimary} onClick={() => changeRoute('bom')}>Lihat BOM Master →</button>
        </div>
      )}

      {stepVal === 'bom' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderTop: '0.5px solid #d5d5cd', padding: '12px 20px', flexShrink: 0 }}>
          <button style={s.btn} onClick={() => changeRoute('breakdown')}>← Kembali ke Breakdown</button>
          <button style={s.btnPrimary} onClick={() => changeRoute('rekap')}>Lihat Hasil Rekap & Stok →</button>
        </div>
      )}

      {stepVal === 'rekap' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderTop: '0.5px solid #d5d5cd', padding: '12px 20px', flexShrink: 0 }}>
          <button style={s.btn} onClick={() => changeRoute('bom')}>← Kembali ke BOM</button>
          <button style={s.btnPrimary} onClick={() => changeRoute('prod')}>Lihat Rekap Produksi (QC) →</button>
        </div>
      )}

      {stepVal === 'prod' && (
        <div style={{ padding: '12px 20px', background: '#fff', borderTop: '0.5px solid #d5d5cd', textAlign: 'right', flexShrink: 0 }}>
          <button style={s.btn} onClick={() => changeRoute('rekap')}>← Kembali ke Rekap Material</button>
        </div>
      )}
    </div>
  );
}