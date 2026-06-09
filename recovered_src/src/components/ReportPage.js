import React, { useState, useMemo, useEffect } from 'react';
import { s, Badge } from './UI';
import { calcBreakdownItem } from '../utils/breakdownCalc';
import RekapPage from './RekapPage'; // Reusing existing RekapPage for BOM
import bpbSettingTemplate from '../utils/bpb_setting_full.json';
import { calculateBpbRows } from '../utils/bpbCalc';

const EditableDiv = ({ children, style, ...props }) => (
  <div 
    contentEditable 
    suppressContentEditableWarning 
    style={{ outline: 'none', minHeight: '18px', display: 'inline-block', minWidth: '100%', ...style }} 
    {...props}
  >
    {children}
  </div>
);

const PrintCheckItem = ({ label, checked, onClick }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }} onClick={onClick}>
    <div style={{ 
      width: 16, height: 16, border: '1.5px solid #111', borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' 
    }}>
      {checked && <span style={{ color: '#111', fontSize: 14, fontWeight: 'bold', lineHeight: 1, marginTop: -2 }}>✓</span>}
    </div>
    {label && <span style={{ fontSize: 13, color: '#111', fontWeight: checked ? 600 : 400 }}>{label}</span>}
  </div>
);

const ReportHeader = ({ title, spec = {} }) => {
  const [statusPend, setStatusPend] = useState(1); // 0 = ADA, 1 = TIDAK
  const [antiRayap, setAntiRayap] = useState(1); // 0 = YA, 1 = TIDAK

  return (
    <div style={{ padding: '30px 30px 10px 30px', fontFamily: 'sans-serif', background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#000' }}>
        <tbody>
          <tr>
            <td colSpan={5} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, textDecoration: 'underline', paddingBottom: 30 }}>
              <EditableDiv style={{ textAlign: 'center' }}>{title}</EditableDiv>
            </td>
          </tr>
          <tr>
            <td style={{ width: '15%', padding: '6px' }}>NO</td>
            <td style={{ width: '40%', padding: '6px', borderBottom: '1px dashed #ccc' }}><EditableDiv>{spec.norekap || ''}</EditableDiv></td>
            <td style={{ width: '5%' }}></td>
            <td colSpan={2} style={{ width: '40%', fontWeight: 'bold', padding: '6px' }}>STATUS PROYEK</td>
          </tr>
          <tr>
            <td style={{ padding: '6px' }}>NO KONTRAK</td>
            <td style={{ padding: '6px', borderBottom: '1px dashed #ccc' }}><EditableDiv>{spec.kontrak || ''}</EditableDiv></td>
            <td></td>
            <td colSpan={2} style={{ padding: '8px 6px 4px 6px' }}>
              <PrintCheckItem label="ADA PENDINGAN" checked={statusPend === 0} onClick={() => setStatusPend(0)} />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px' }}>NIP</td>
            <td style={{ padding: '6px', borderBottom: '1px dashed #ccc' }}><EditableDiv>{spec.nip || ''}</EditableDiv></td>
            <td></td>
            <td colSpan={2} style={{ padding: '4px 6px' }}>
              <PrintCheckItem label="TIDAK ADA PEND." checked={statusPend === 1} onClick={() => setStatusPend(1)} />
            </td>
          </tr>
          <tr>
            <td style={{ padding: '6px' }}>PROYEK</td>
            <td style={{ padding: '6px', borderBottom: '1px dashed #ccc' }}><EditableDiv>{spec.proyek || ''}</EditableDiv></td>
            <td colSpan={3}></td>
          </tr>
          <tr>
            <td style={{ padding: '6px' }}>TGL.ORDER</td>
            <td style={{ padding: '6px', borderBottom: '1px dashed #ccc' }}><EditableDiv>{spec.tanggal || ''}</EditableDiv></td>
            <td></td>
            <td colSpan={2} style={{ fontWeight: 'bold', padding: '16px 6px 6px 6px' }}>ANTI RAYAP/TIDAK</td>
          </tr>
          <tr>
            <td style={{ padding: '6px' }}>TGL.SELESAI</td>
            <td style={{ padding: '6px', borderBottom: '1px dashed #ccc' }}><EditableDiv /></td>
            <td></td>
            <td colSpan={2} style={{ padding: '6px' }}>
              <div style={{ display: 'flex', gap: 24 }}>
                <PrintCheckItem label="YA" checked={antiRayap === 0} onClick={() => setAntiRayap(0)} />
                <PrintCheckItem label="TIDAK" checked={antiRayap === 1} onClick={() => setAntiRayap(1)} />
              </div>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '16px 6px 6px 6px', fontWeight: 'bold' }}>ESTIMATOR PPIC</td>
            <td style={{ padding: '16px 6px 6px 6px', borderBottom: '1px dashed #ccc' }}><EditableDiv>{spec.estimator || ''}</EditableDiv></td>
            <td colSpan={3}></td>
          </tr>
          <tr>
            <td style={{ padding: '16px 6px 6px 6px', fontWeight: 'bold' }}>BAHAN / MATERIAL</td>
            <td style={{ padding: '16px 6px 6px 6px', fontWeight: 'bold', borderBottom: '1px dashed #ccc' }}><EditableDiv /></td>
            <td colSpan={3}></td>
          </tr>
          <tr>
            <td></td>
            <td style={{ padding: '6px', fontWeight: 'bold', borderBottom: '1px dashed #ccc' }}><EditableDiv /></td>
            <td colSpan={3}></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

"const BpbHeader = ({ spec = {}, componentCount = 0 }) => {\n  const [tukang, setTukang] = useState(localStorage.getItem(`bpb_tukang_${spec.id || 'default'}`) || '');\n\n  useEffect(() => {\n    localStorage.setItem(`bpb_tukang_${spec.id || 'default'}`, tukang);\n  }, [tukang, spec.id]);\n\n  const dateStr = spec.tanggal ? new Date(spec.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '';\n\n  return (\n    <div style={{ padding: '30px 30px 10px 30px', fontFamily: 'sans-serif', background: '#fff' }}>\n      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#000', marginBottom: 20 }}>\n        <tbody>\n          <tr>\n            <td colSpan={6} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, textDecoration: 'underline', paddingBottom: 15 }}>\n              BUKTI PENGAMBILAN BARANG\n            </td>\n          </tr>\n          <tr>\n            <td colSpan={4}></td>\n            <td style={{ fontWeight: 'bold', fontSize: 12, width: '150px', padding: '4px 0' }}>JUMLAH KOMPONEN :</td>\n            <td style={{ fontWeight: 'bold', fontSize: 13, width: '120px', padding: '4px 8px', borderBottom: '1px dashed #ccc', textAlign: 'left', color: '#16a34a' }}>\n              {componentCount}\n            </td>\n          </tr>\n          <tr>\n            <td style={{ width: '150px', padding: '6px 0', fontWeight: 'bold' }}>DEPARTEMENT</td>\n            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '250px' }}>\n              RAKIT\n            </td>\n            <td style={{ width: '40px' }}></td>\n            <td style={{ width: '100px' }}></td>\n            <td style={{ width: '100px', fontWeight: 'bold' }}>NO.</td>\n            <td style={{ padding: '6px 8px', borderBottom: '1px dashed #ccc', width: '150px' }}>\n              <EditableDiv>{spec.norekap ? `${spec.norekap}B` : 'RZ0458B'}</EditableDiv>\n            </td>\n          </tr>\n          <tr>\n            <td style={{ padding: '6px 0', fontWeight: 'b
<truncated 3169 bytes>

  // Process all breakdown data to get real numbers & auto calculations
  const processedData = useMemo(() => {
    let lastParent = null;
    return breakdown.map(item => {
      if (item.isParent) {
        lastParent = item;
        return { ...item, isParent: true };
      }
      
      const calcRes = calcBreakdownItem(item, breakdown, spec, lastParent || {});
      return {
        ...item,
        ...calcRes,
        _p: calcRes.p_val,
        _l: calcRes.l_val,
        _t: calcRes.t_val,
        _sub: calcRes.sub_val,
        _jml: calcRes.jml_val
      };
    });
  }, [breakdown, spec]);

  // All processed items (parents + children)
  const filteredComponents = useMemo(() => {
    if (activeTab === 'ks') {
      return processedData.filter(d => !d.isParent && d.komp && (d.kode === 'KS' || d.ks === 'KS'));
    }
    if (activeTab === 'non_ks') {
      return processedData.filter(d => !d.isParent && d.komp && (d.kode === '─' || d.kode === '-' || d.ks === '─' || d.ks === '-'));
    }
    // full_rekap -> Only parent modules
    return processedData.filter(d => d.isParent).map((p, i) => ({
      ...p,
      no: p.no || '1',
      nama_komp: p.komp || p.modul || p.kabinet,
      _p: p.p || 0,
      _l: p.l || 0,
      _t: p.t || 0,
      tpk: p.tpk || '-',
      kode: '(ks)',
      qty_total: p.jml || 1,
      keterangan: p.keterangan || '-'
    }));
  }, [processedData, activeTab]);

  // Group components by name, but distinct by size, tpk, kode
  const groupedComponents = useMemo(() => {
    const groups = [];
    filteredComponents.forEach((item) => {
      const name = item.nama_komp || item.komp || '-';
      const sizeStr = `${item._p} x ${item._l} x ${item._t}`;
      const tpk = item.tpk || '-';
      const kode = item.kode || '-';
      const qty = Number(item.qty_total) || Number(item._jml) || Number(item.jml) || 1;

      let existingGroup = groups.find(g => g.name === name);
      if (!existingGroup) {
        existingGroup = { name, items: [] };
        groups.push(existingGroup);
      }

      let existingItem = existingGroup.items.find(i => 
        `${i._p} x ${i._l} x ${i._t}` === sizeStr && 
        (i.tpk || '-') === tpk && 
        (i.kode || '-') === kode
      );

      if (existingItem) {
        existingItem.qty_grouped += qty;
      } else {
        existingGroup.items.push({ ...item, qty_grouped: qty });
      }
    });
    return groups;
  }, [filteredComponents]);

  const bpbRows = useMemo(() => {
    return calculateBpbRows(processedData, spec, stock, bpbSettingTemplate);
  }, [processedData, spec, stock]);

  const visibleBpbRows = useMemo(() => {
    if (!hideZeroQty) return bpbRows;
    return bpbRows.filter(row => {
      const isEmpty = !row.id_barang_display && !row.nama_barang_display && !row.satuan_display && !row.keterangan;
      if (isEmpty) return false;
      return Number(row.jml_display) > 0;
    });
  }, [bpbRows, hideZeroQty]);

  const thStyle = { ...s.th, padding: '10px 14px', fontSize: 13, border: '1px solid #cbd5e1', textAlign: 'center', background: '#f8fafc', color: '#334155' };
  const tdStyle = { ...s.td, padding: '10px 14px', fontSize: 13, border: '1px solid #cbd5e1', textAlign: 'center', color: '#0f172a' };

  return (
    <div style={{ ...s.page, maxWidth: '100%', overflowX: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 12, flexShrink: 0, alignItems: 'center' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginRight: 8 }}>Pilih Report:</span>
        {['full_rekap', 'ks', 'non_ks', 'bom'].map(tab => {
          const label = {
            full_rekap: 'Full Rekap',
            ks: 'KS',
            non_ks: 'Non KS',
            bom: 'BOM (Stok & Rekap)'
          }[tab];
          return (
            <button
              key={tab}
              style={{
                padding: '8px 20px', borderRadius: '999px', 
                border: activeTab === tab ? '1px solid #3b82f6' : '1px solid #cbd5e1',
                background: activeTab === tab ? '#eff6ff' : '#fff',
                color: activeTab === tab ? '#2563eb' : '#64748b',
                fontWeight: activeTab === tab ? 700 : 500,
                cursor: 'pointer', fontSize: 13, 
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab ? '0 1px 2px rgba(59, 130, 246, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)'
              }}
              onClick={() => setActiveTab(tab)}
              onMouseEnter={(e) => {
                if (activeTab !== tab) e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) e.currentTarget.style.background = '#fff';
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {activeTab === 'bom' ? (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <RekapPage breakdown={breakdown} parts={parts} stock={stock} spec={spec} sections={sections} />
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#0f172a' }}>
                Report {activeTab === 'full_rekap' ? 'Full Rekap' : activeTab === 'ks' ? 'KS' : 'Non KS'}
              </h3>
              <Badge color="blue">{filteredComponents.length} Komponen</Badge>
            </div>
            
            <ReportHeader title={`REKAPITULASI PEMAKAIAN BAHAN (${activeTab === 'full_rekap' ? 'FULL REKAP' : activeTab === 'ks' ? 'KS' : 'NON KS'})`} spec={spec} />
            
            <div style={{ ...s.tableWrap, padding: '0 20px 20px 20px', overflowX: 'auto' }}>
              <table style={{ ...s.table, borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>No</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Nama Komponen</th>
                    <th style={thStyle}>Ukuran</th>
                    <th style={thStyle}>Tpk</th>
                    <th style={thStyle}>Kode</th>
                    <th style={thStyle}>Total</th>
                    <th style={thStyle}>QC</th>
                    <th style={thStyle}>KETERANGAN</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedComponents.length === 0 ? (
                    <tr><td colSpan={8} style={{ ...s.empty, padding: 30 }}>Tidak ada data.</td></tr>
                  ) : groupedComponents.map((group, gIdx) => (
                    <React.Fragment key={gIdx}>
                      {group.items.map((item, iIdx) => (
                        <tr key={`${gIdx}-${iIdx}`} style={{ background: '#fff' }}>
                          {iIdx === 0 && (
                            <td rowSpan={group.items.length} style={tdStyle}>
                              <EditableDiv>{gIdx + 1}</EditableDiv>
                            </td>
                          )}
                          {iIdx === 0 && (
                            <td rowSpan={group.items.length} style={{ ...tdStyle, textAlign: 'left', fontWeight: 600 }}>
                              <EditableDiv>{group.name}</EditableDiv>
                            </td>
                          )}
                          <td style={tdStyle}>
                            <EditableDiv>{item._p} x {item._l} x {item._t}</EditableDiv>
                          </td>
                          <td style={tdStyle}>
                            <EditableDiv>{item.tpk || '-'}</EditableDiv>
                          </td>
                          <td style={tdStyle}>
                            <EditableDiv>{item.kode || '-'}</EditableDiv>
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 700, color: '#2563eb' }}>
                            <EditableDiv>{item.qty_grouped}</EditableDiv>
                          </td>
                          <td style={tdStyle}>
                            <EditableDiv></EditableDiv>
                          </td>
                          <td style={tdStyle}>
                            <EditableDiv>{item.keterangan || '-'}</EditableDiv>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
"          </div>\n        )}\n      </div>\n\n      {/* Sidebar Variables Panel */}\n      {showVariables && (\n        <div className=\"no-print\" style={{\n          width: 320,\n          borderLeft: '1px solid #e2e8f0',\n          background: '#ffffff',\n          display: 'flex',\n          flexDirection: 'column',\n          height: '100%',\n          flexShrink: 0,\n          boxShadow: '-2px 0 8px rgba(0,0,0,0.04)',\n          zIndex: 10\n        }}>\n          {/* Header */}\n          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>\n            <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>\n              🏷️ Daftar Variabel\n            </span>\n            <button \n              onClick={() => setShowVariables(false)}\n              style={{\n                background: 'none', border: 'none', fontSize: 18, color: '#64748b', cursor: 'pointer',\n                padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center'\n              }}\n            >\n              ✕\n            </button>\n          </div>\n          \n          {/* Search Input */}\n          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>\n            <input \n              type=\"text\"\n              placeholder=\"Cari variabel...\"\n              value={varSearch}\n              onChange={(e) => setVarSearch(e.target.value)}\n              style={{\n                width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1',\n                fontSize: 13, outline: 'none', boxSizing: 'border-box'\n              }}\n            />\n            <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, fontStyle: 'italic', lineHeight: 1.4 }}>\n              💡 Klik nama variabel untuk menyalin formula (awalan '=').\n            </div>\n          </div>\n\n          {/* List scroll container *
<truncated 5863 bytes>

