import React, { useMemo } from 'react';
import { s, Badge } from './UI';
import { calcBreakdownItem } from '../utils/breakdownCalc';

export default function BOMPage({ breakdown = [], spec = {}, sections = [], parts = [] }) {
  
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

  // Only components (not parent modules)
  const components = useMemo(() => {
    return processedData.filter(d => !d.isParent && d.komp);
  }, [processedData]);

  // Download CNC CSV helper
  const handleDownloadCSV = () => {
    if (components.length === 0) return;
    
    // CNC CSV content without headers, raw rows joined by newline
    const csvContent = components
      .map(c => c.csv_format)
      .filter(Boolean)
      .join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CNC_Cutting_Order_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const bomThStyle = { ...s.th, padding: '6px 10px', fontSize: 11, border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700 };
  const bomTdStyle = { ...s.td, padding: '6px 10px', fontSize: 11, border: '1px solid #f1f5f9', textAlign: 'center' };

  return (
    <div style={{ ...s.page, maxWidth: '100%', overflowX: 'auto' }}>
      <div style={s.pageHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={s.pageTitle}>Cutting List & CNC Output</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>Daftar komponen fisik siap potong dengan kalkulasi toleransi edging & CSV CNC.</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...s.btnSm, background: '#10b981', color: '#fff', border: 'none' }} onClick={handleDownloadCSV}>
            📥 Ekspor CSV CNC
          </button>
          <button style={s.btnSm} onClick={() => window.print()}>
            ⎙ Cetak BOM
          </button>
        </div>
      </div>

      <div style={s.tableWrap}>
        <table style={{ ...s.table, borderCollapse: 'collapse', minWidth: 2000 }}>
          <thead style={{ background: '#f8fafc' }}>
            <tr>
              <th rowSpan="2" style={bomThStyle}>ID</th>
              <th rowSpan="2" style={bomThStyle}>Cat</th>
              <th rowSpan="2" style={bomThStyle}>Type</th>
              <th rowSpan="2" style={bomThStyle}>Kod</th>
              <th rowSpan="2" style={bomThStyle}>Tpk</th>
              <th rowSpan="2" style={bomThStyle}>No</th>
              <th rowSpan="2" style={{ ...bomThStyle, textAlign: 'left', minWidth: 400, background: '#eff6ff' }}>Nama Komponen BOM (Otomatis)</th>
              <th colSpan="3" style={{ ...bomThStyle, background: '#fef3c7' }}>Dimensi Fisik (mm)</th>
              <th rowSpan="2" style={bomThStyle}>Sub</th>
              <th rowSpan="2" style={bomThStyle}>Jml</th>
              <th colSpan="3" style={{ ...bomThStyle, background: '#ecfdf5' }}>Dimensi Mentah CNC (mm)</th>
              <th rowSpan="2" style={{ ...bomThStyle, background: '#e0f2fe' }}>Lap</th>
              <th rowSpan="2" style={{ ...bomThStyle, background: '#e0f2fe' }}>Edg</th>
              <th rowSpan="2" style={bomThStyle}>Luas (M²)</th>
              <th rowSpan="2" style={bomThStyle}>Volume (M³)</th>
              <th colSpan="2" style={{ ...bomThStyle, background: '#fee2e2' }}>Hardware Agregat</th>
            </tr>
            <tr>
              {/* Dimensi Fisik */}
              <th style={{ ...bomThStyle, background: '#fef3c7' }}>P</th>
              <th style={{ ...bomThStyle, background: '#fef3c7' }}>L</th>
              <th style={{ ...bomThStyle, background: '#fef3c7' }}>T</th>
              {/* Dimensi CNC */}
              <th style={{ ...bomThStyle, background: '#ecfdf5' }}>P (Cnc)</th>
              <th style={{ ...bomThStyle, background: '#ecfdf5' }}>L (Cnc)</th>
              <th style={{ ...bomThStyle, background: '#ecfdf5' }}>Ukuran CNC</th>
              {/* Hardware */}
              <th style={{ ...bomThStyle, background: '#fee2e2' }}>Siku</th>
              <th style={{ ...bomThStyle, background: '#fee2e2' }}>Screw</th>
            </tr>
          </thead>
          <tbody>
            {components.length === 0 ? (
              <tr><td colSpan={22} style={s.empty}>Tidak ada data komponen untuk BOM</td></tr>
            ) : components.map((item, i) => {
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={bomTdStyle}>{item.bid}</td>
                  <td style={bomTdStyle}>{item.cat}</td>
                  <td style={bomTdStyle}><Badge color="gray">{item.type}</Badge></td>
                  <td style={bomTdStyle}>{item.kode}</td>
                  <td style={bomTdStyle}>{item.tpk}</td>
                  <td style={bomTdStyle}>{item.no}</td>
                  <td style={{ ...bomTdStyle, textAlign: 'left', fontWeight: 600, background: '#eff6ff' }}>{item.nama_komp}</td>
                  
                  {/* Dimensi Fisik */}
                  <td style={{ ...bomTdStyle, fontWeight: 700 }}>{item._p}</td>
                  <td style={{ ...bomTdStyle, fontWeight: 700 }}>{item._l}</td>
                  <td style={{ ...bomTdStyle, color: '#b45309' }}>{item._t}</td>
                  
                  <td style={bomTdStyle}>{item.sub}</td>
                  <td style={bomTdStyle}>{item.jml}</td>

                  {/* Dimensi CNC */}
                  <td style={{ ...bomTdStyle, fontWeight: 700, color: '#047857', background: '#f0fdf4' }}>{item.p_cnc}</td>
                  <td style={{ ...bomTdStyle, fontWeight: 700, color: '#047857', background: '#f0fdf4' }}>{item.l_cnc}</td>
                  <td style={{ ...bomTdStyle, fontSize: 10, color: '#047857', background: '#f0fdf4', fontWeight: 600 }}>{item.ukuran_cnc}</td>
                  
                  {/* Digit Codes */}
                  <td style={{ ...bomTdStyle, background: '#f0f9ff' }}><Badge color="blue">{item.v_lap}</Badge></td>
                  <td style={{ ...bomTdStyle, background: '#f0f9ff' }}><Badge color="green">{item.v_edg}</Badge></td>

                  {/* Luas / Volume */}
                  <td style={{ ...bomTdStyle, fontWeight: 600 }}>{item.area_m2.toFixed(3)}</td>
                  <td style={bomTdStyle}>{item.vol_m3.toFixed(4)}</td>

                  {/* Hardware */}
                  <td style={{ ...bomTdStyle, background: '#fef2f2', fontWeight: 600 }}>{item.hardware.siku || '-'}</td>
                  <td style={{ ...bomTdStyle, background: '#fef2f2', fontWeight: 600 }}>{item.hardware.screw || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: 20, display: 'flex', gap: 20 }}>
        <div style={{ flex: 1, padding: 15, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 8, color: '#475569' }}>Ringkasan Produksi & Manufaktur:</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>TOTAL PANELS / PARTS</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{components.length}</div>
                </div>
                <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>TOTAL LUAS PANEL</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2563eb' }}>
                      {components.reduce((acc, c) => acc + c.area_m2, 0).toFixed(3)} M²
                    </div>
                </div>
                <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>TOTAL VOLUME PANEL</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f766e' }}>
                      {components.reduce((acc, c) => acc + c.vol_m3, 0).toFixed(4)} M³
                    </div>
                </div>
                <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>TOTAL KEBUTUHAN EDGING</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#047857' }}>
                      {components.reduce((acc, c) => acc + c.keliling_m, 0).toFixed(1)} M¹
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
