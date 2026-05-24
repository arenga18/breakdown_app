import React, { useState, useMemo } from 'react';
import { s, Badge } from './UI';
import { calcBreakdownItem } from '../utils/breakdownCalc';

export default function ProductionRekapPage({ breakdown = [], spec = {}, sections = [] }) {
  
  // 1. Process all breakdown data to get real numbers & auto calculations
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

  // Aggregate by component and size for QC list
  const productionList = useMemo(() => {
    return processedData.filter(d => !d.isParent && d.komp);
  }, [processedData]);

  // 2. Interactive QC Checklist state
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (idx) => {
    setCheckedItems(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const checkAll = () => {
    const next = {};
    productionList.forEach((_, idx) => {
      next[idx] = true;
    });
    setCheckedItems(next);
  };

  const resetQC = () => {
    setCheckedItems({});
  };

  const thStyle = {
    ...s.th,
    padding: '8px 12px',
    fontSize: 12,
    border: '1px solid #cbd5e1',
    textAlign: 'center',
    fontWeight: 700
  };

  const tdStyle = {
    ...s.td,
    padding: '8px 12px',
    fontSize: 12,
    border: '1px solid #e2e8f0',
    verticalAlign: 'middle'
  };

  return (
    <div style={{ ...s.page, background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #e2e8f0' }}>
      
      {/* Inject print styles directly */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            color: #000 !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .table-print {
            border: 2px solid #000 !important;
            width: 100% !important;
          }
          .th-print {
            border: 1px solid #000 !important;
            background: #f1f5f9 !important;
            color: #000 !important;
          }
          .td-print {
            border: 1px solid #000 !important;
            color: #000 !important;
            background: transparent !important;
          }
          .signature-box {
            break-inside: avoid;
          }
        }
      `}} />

      <div className="print-full-width">
        {/* Header Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px double #0f172a', paddingBottom: 12, marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '0.5px' }}>
              LEMBAR PERINTAH KERJA & KENDALI MUTU (QC)
            </span>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4, fontWeight: 500 }}>
              Proyek: <strong style={{ color: '#0f172a' }}>{spec.proyek || 'Project Baru'}</strong> | No Rekap: <strong>{spec.norekap || '-'}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div>Estimator: <strong style={{ color: '#0f172a' }}>{spec.estimator || '-'}</strong></div>
            <div>Koordinator: <strong>{spec.koord || '-'}</strong></div>
            <div>Tgl Order: <strong>{spec.tanggal || '-'}</strong></div>
          </div>
        </div>

        {/* Bulk Action Buttons (no-print) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{ ...s.btnSm, background: '#0f172a', color: '#fff', border: 'none' }} onClick={checkAll}>
              ✅ Tandai Selesai Semua
            </button>
            <button style={{ ...s.btnSm, background: '#ef4444', color: '#fff', border: 'none' }} onClick={resetQC}>
              🔄 Reset QC checklist
            </button>
          </div>
          <div>
            <button style={{ ...s.btnSm, background: '#10b981', color: '#fff', border: 'none', fontWeight: 600 }} onClick={() => window.print()}>
              ⎙ Cetak Lembar QC / Simpan PDF
            </button>
          </div>
        </div>

        {/* QC Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table-print" style={{ ...s.table, borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th className="th-print" style={{ ...thStyle, width: 40 }}>No</th>
                <th className="th-print" style={{ ...thStyle, textAlign: 'left', minWidth: 250 }}>Nama Komponen / Spesifikasi BOM</th>
                <th className="th-print" style={{ ...thStyle, width: 140 }}>Bahan Dasar</th>
                <th className="th-print" style={{ ...thStyle, width: 150 }}>Ukuran Potong CNC (Mentah)</th>
                <th className="th-print" style={{ ...thStyle, width: 220, textAlign: 'left' }}>Pengerjaan Lapisan & Edging</th>
                <th className="th-print" style={{ ...thStyle, width: 100 }}>Kode Barcode</th>
                <th className="th-print" style={{ ...thStyle, width: 70 }}>QC Status</th>
              </tr>
            </thead>
            <tbody>
              {productionList.length === 0 ? (
                <tr><td colSpan={7} style={s.empty}>Belum ada data komponen produksi</td></tr>
              ) : productionList.map((item, i) => {
                const isChecked = !!checkedItems[i];
                return (
                  <tr
                    key={i}
                    style={{
                      background: isChecked ? '#f0fdf4' : (i % 2 === 0 ? '#fff' : '#f8fafc'),
                      transition: 'background-color 0.2s ease',
                      textDecoration: isChecked ? 'line-through' : 'none',
                      color: isChecked ? '#64748b' : 'inherit'
                    }}
                  >
                    <td className="td-print" style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>{i + 1}</td>
                    <td className="td-print" style={{ ...tdStyle, fontWeight: 700, fontSize: 13 }}>
                      {item.no ? `${item.no}) ` : ''}{item.komp}
                    </td>
                    <td className="td-print" style={{ ...tdStyle, textAlign: 'center', fontWeight: 500 }}>
                      {item.bhn} {item.t_bhn || item.t}mm
                    </td>
                    <td className="td-print" style={{ ...tdStyle, textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#047857', background: isChecked ? 'transparent' : '#f0fdf4', fontSize: 13 }}>
                      {item.ukuran_cnc}
                    </td>
                    <td className="td-print" style={{ ...tdStyle, fontSize: 11, lineHeight: 1.4 }}>
                      <div style={{ color: '#0284c7', fontWeight: 600 }}>Lap: {item.desc_lap}</div>
                      <div style={{ color: '#059669', fontWeight: 600, marginTop: 2 }}>Edg: {item.desc_edg}</div>
                    </td>
                    <td className="td-print" style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>{item.v_lap}</span>
                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>{item.v_edg}</span>
                      </div>
                    </td>
                    <td className="td-print" style={{ ...tdStyle, textAlign: 'center' }}>
                      {/* Printable Checkbox */}
                      <div
                        className="no-print"
                        style={{
                          width: 22,
                          height: 22,
                          border: isChecked ? '2px solid #10b981' : '2px solid #cbd5e1',
                          borderRadius: 6,
                          background: isChecked ? '#10b981' : '#fff',
                          margin: 'auto',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: 14,
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={() => toggleCheck(i)}
                      >
                        {isChecked && '✓'}
                      </div>
                      {/* Printed check box frame */}
                      <div
                        style={{
                          display: 'none',
                          width: 16,
                          height: 16,
                          border: '1.5px solid #000',
                          margin: 'auto'
                        }}
                        className="print-only"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signature Blocks */}
        <div
          className="signature-box"
          style={{
            marginTop: 40,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
            textAlign: 'center'
          }}
        >
          {[
            { role: 'Dept. Panel (CNC/Cutting)', desc: 'Operator Potong' },
            { role: 'Dept. Rakit / Perakitan', desc: 'Assembling' },
            { role: 'Kadept Perakitan', desc: 'Supervisor' },
            { role: 'Dept. QC / Inspeksi Mutu', desc: 'Quality Control' }
          ].map((dept, i) => (
            <div
              key={i}
              style={{
                padding: 14,
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                background: '#f8fafc',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: 120
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                {dept.role}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginBottom: 20 }}>
                {dept.desc}
              </div>
              <div style={{ borderTop: '1px dashed #64748b', fontSize: 11, paddingTop: 4, fontWeight: 600, color: '#334155' }}>
                ( ................................... )
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
