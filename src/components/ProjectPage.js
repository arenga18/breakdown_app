import React, { useState } from 'react';
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
import { defaultSpekVals } from '../defaultSpekVals';
import { buildAliasMap, resolveAlias } from '../utils/resolveAlias';

export default function ProjectPage({ projects, moduls, subModuls, sections, categories, parts, stock, setupItems, onChange, onTplChange }) {
  const [activeId, setActiveId] = useState(null); // ID of the selected project
  const [step, setStep] = useState('spek'); // 'spek' or 'breakdown'
  const [breakdownTab, setBreakdownTab] = useState('breakdown'); // 'breakdown', 'stock', 'part'

  const activeProject = projects.find(p => p.id === activeId);

  // Resolve semua nilai "=varname" di parts sesuai spek project aktif
  // Ini yang di-pass ke breakdown supaya selalu sinkron dengan spek
  const activeSpec = activeProject?.speks?.[0] || {};
  const aliasMap = React.useMemo(() => buildAliasMap(activeSpec), [activeSpec]);
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

  function createProject() {
    const newProj = {
      id: Date.now(),
      name: 'Project Baru',
      client: '',
      speks: [{ tanggal: new Date().toISOString().slice(0, 10), norekap: '', estimator: '', koord: '', kontrak: '', nip: '', produk: '', proyek: '', statusPend: false, statusTidakPend: false, statusAntiRayap: false, statusTidakAntiRayap: false, vals: { ...defaultSpekVals }, modulRefs: [] }],
      breakdown: []
    };
    onChange([...projects, newProj]);
    setActiveId(newProj.id);
    setStep('spek');
    setBreakdownTab('breakdown');
  }

  function updateProject(updated) {
    const next = projects.map(p => p.id === activeId ? updated : p);
    onChange(next);
  }

  if (!activeId || !activeProject) {
    return (
      <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
        <div style={s.pageHeader}>
          <span style={s.pageTitle}>Daftar Project</span>
          <button style={s.btnPrimary} onClick={createProject}>+ Project Baru</button>
        </div>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nama Project</th>
                <th style={s.th}>Client</th>
                <th style={s.th}>Status Spek</th>
                <th style={s.th}>Status Breakdown</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={5} style={s.empty}>Belum ada project</td></tr>
              ) : projects.map(p => (
                <tr key={p.id}>
                  <td style={s.td} onClick={() => setActiveId(p.id)}>
                    <span style={{ fontWeight: 500, color: '#111', cursor: 'pointer' }}>
                      {p.speks[0]?.proyek || p.name}
                    </span>
                  </td>
                  <td style={s.td}>{p.client}</td>
                  <td style={s.td}><Badge color={p.speks.length > 0 ? 'green' : 'gray'}>{p.speks.length} Spek</Badge></td>
                  <td style={s.td}><Badge color={p.breakdown.length > 0 ? 'blue' : 'gray'}>{p.breakdown.length} Komponen</Badge></td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button style={s.btnSm} onClick={() => setActiveId(p.id)}>Buka</button>
                  </td>
                </tr>
              ))}
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
          <button style={s.btnSm} onClick={() => setActiveId(null)}>← Kembali</button>
          <span style={{ fontWeight: 600, fontSize: 15 }}>{activeProject.speks[0]?.proyek || activeProject.name}</span>
        </div>
        <nav style={{ display: 'flex', gap: 4 }}>
          <button style={s.navBtn(step === 'spek')} onClick={() => setStep('spek')}>1. Spek</button>
          <button style={s.navBtn(step === 'breakdown')} onClick={() => setStep('breakdown')}>2. Breakdown</button>
          <button style={s.navBtn(step === 'bom')} onClick={() => setStep('bom')}>3. Cutting List (CNC)</button>
          <button style={s.navBtn(step === 'rekap')} onClick={() => setStep('rekap')}>4. Report (Rekap & BOM)</button>
          <button style={s.navBtn(step === 'prod')} onClick={() => setStep('prod')}>5. Produksi & QC</button>
        </nav>
      </div>

      <div style={{ flex: 1, padding: 14, overflowY: 'auto', background: '#f5f5f0' }}>
        {step === 'spek' && (
          <SpekPage
            speks={activeProject.speks}
            sections={sections}
            categories={categories}
            moduls={moduls}
            onChange={(newSpeks) => updateProject({ ...activeProject, speks: newSpeks })}
            onTplChange={onTplChange}
            isProjectForm={true} // New prop for SpekPage
          />
        )}
        {step === 'breakdown' && (
          <>
            <div style={{ display: breakdownTab === 'breakdown' ? 'block' : 'none', height: '100%' }}>
              <BreakdownPage
                data={activeProject.breakdown}
                parts={resolvedParts}
                moduls={moduls}
                subModuls={subModuls}
                setupItems={setupItems}
                categories={categories}
                spec={activeProject.speks[0] || {}}
                sections={sections}
                onChange={(newBreakdown) => updateProject({ ...activeProject, breakdown: newBreakdown })}
              />
            </div>
            {breakdownTab === 'stock' && (
              <div style={{ height: '100%' }}>
                <StockPage data={stock} onChange={() => { }} readOnly={true} />
              </div>
            )}
            {breakdownTab === 'part' && (
              <div style={{ height: '100%' }}>
                <PartPage data={parts} onChange={() => { }} readOnly={true} spec={activeProject.speks[0] || {}} />
              </div>
            )}
            {breakdownTab === 'setup' && (
              <div style={{ height: '100%' }}>
                <SetupItemPage data={setupItems} onChange={() => { }} readOnly={true} />
              </div>
            )}
          </>
        )}
        {step === 'bom' && (
          <BOMPage
            breakdown={activeProject.breakdown}
            spec={activeProject.speks[0] || {}}
            sections={sections}
          />
        )}
        {step === 'rekap' && (
          <ReportPage
            breakdown={activeProject.breakdown}
            parts={parts}
            stock={stock}
            spec={activeProject.speks[0] || {}}
            sections={sections}
          />
        )}
        {step === 'prod' && (
          <ProductionRekapPage
            breakdown={activeProject.breakdown}
            spec={activeProject.speks[0] || {}}
            sections={sections}
          />
        )}
      </div>

      {step === 'spek' && (
        <div style={{ padding: '12px 20px', background: '#fff', borderTop: '0.5px solid #d5d5cd', textAlign: 'right', flexShrink: 0 }}>
          <button style={s.btnPrimary} onClick={() => { setStep('breakdown'); setBreakdownTab('breakdown'); }}>Lanjut ke Breakdown →</button>
        </div>
      )}

      {step === 'breakdown' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderTop: '0.5px solid #d5d5cd', padding: '6px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {['breakdown', 'stock', 'part', 'setup'].map(tab => (
              <button
                key={tab}
                style={{
                  padding: '6px 16px', borderRadius: '6px', border: 'none',
                  background: breakdownTab === tab ? '#e0e0d8' : 'transparent',
                  fontWeight: breakdownTab === tab ? 600 : 400,
                  cursor: 'pointer', fontSize: 13, color: '#111'
                }}
                onClick={() => setBreakdownTab(tab)}
              >
                {tab === 'breakdown' ? 'Breakdown Komponen' : tab === 'stock' ? 'Cek Stock' : tab === 'part' ? 'Data Part' : 'Set-up'}
              </button>
            ))}
          </div>
          <button style={s.btnPrimary} onClick={() => setStep('bom')}>Lihat BOM Master →</button>
        </div>
      )}

      {step === 'bom' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderTop: '0.5px solid #d5d5cd', padding: '12px 20px', flexShrink: 0 }}>
          <button style={s.btn} onClick={() => setStep('breakdown')}>← Kembali ke Breakdown</button>
          <button style={s.btnPrimary} onClick={() => setStep('rekap')}>Lihat Hasil Rekap & Stok →</button>
        </div>
      )}

      {step === 'rekap' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderTop: '0.5px solid #d5d5cd', padding: '12px 20px', flexShrink: 0 }}>
          <button style={s.btn} onClick={() => setStep('bom')}>← Kembali ke BOM</button>
          <button style={s.btnPrimary} onClick={() => setStep('prod')}>Lihat Rekap Produksi (QC) →</button>
        </div>
      )}

      {step === 'prod' && (
        <div style={{ padding: '12px 20px', background: '#fff', borderTop: '0.5px solid #d5d5cd', textAlign: 'right', flexShrink: 0 }}>
          <button style={s.btn} onClick={() => setStep('rekap')}>← Kembali ke Rekap Material</button>
        </div>
      )}
    </div>
  );
}