import React, { useMemo } from 'react';
import { s, Badge } from './UI';
import { calcBreakdownItem } from '../utils/breakdownCalc';

export default function RekapPage({ breakdown = [], parts = [], stock = [], spec = {}, globalConstants = {} }) {
  
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

  // Only components
  const components = useMemo(() => {
    return processedData.filter(d => !d.isParent && d.komp);
  }, [processedData]);

  // 2. Aggregate Panels (Plywood / Boards) using Gross Area (with CNC tolerances)
  const panelRekap = useMemo(() => {
    const groups = {};
    components.forEach(d => {
      const bhnName = d.bhn || 'Ply';
      const thk = d.t_bhn || '18';
      const key = `${bhnName} ${thk}mm`;
      
      if (!groups[key]) {
        groups[key] = { bhn: bhnName, t: thk, totalArea: 0 };
      }
      // Task 4.2 — Use area_gross (with tol_p/tol_l) instead of area_m2 + flat 15%
      groups[key].totalArea += d.area_gross || d.area_m2;
    });
    
    const sheetArea = 2.9768; // Standard sheet: 1.22m x 2.44m
    return Object.values(groups).map(g => ({
      ...g,
      sheets: Math.ceil(g.totalArea / sheetArea)
    }));
  }, [components]);

  // 3. Aggregate HPL Sheets (Finishing Lapisan)
  const hplRekap = useMemo(() => {
    const groups = {};
    const sheetArea = 2.9768; // Standard HPL sheet: 1.22m x 2.44m
    
    components.forEach(d => {
      const itemArea = (d._p / 1000) * (d._l / 1000) * d.qty_total;
      
      // Lapisan Luar HPL
      if (d.lap_luar && d.lap_luar !== 'Polos' && d.lap_luar !== '-') {
        const key = d.lap_luar;
        if (!groups[key]) groups[key] = { name: key, totalArea: 0 };
        groups[key].totalArea += itemArea;
      }
      // Lapisan Dalam HPL
      if (d.lap_dalam && d.lap_dalam !== 'Polos' && d.lap_dalam !== '-') {
        const key = d.lap_dalam;
        if (!groups[key]) groups[key] = { name: key, totalArea: 0 };
        groups[key].totalArea += itemArea;
      }
    });
    
    return Object.values(groups).map(g => {
      const rawSheets = g.totalArea / sheetArea;
      return {
        ...g,
        sheets: Math.ceil(rawSheets * 1.15) // +15% waste factor
      };
    });
  }, [components]);

  // 4. Aggregate Edging (Linear Meters)
  const edgingRekap = useMemo(() => {
    const groups = {};
    
    components.forEach(d => {
      // P1 Edging
      if (d.edg_p1 && d.edg_p1 !== '0x2a' && d.edg_p1 !== '-') {
        const key = d.edg_p1;
        if (!groups[key]) groups[key] = { name: key, totalLength: 0 };
        groups[key].totalLength += (d._p / 1000) * d.qty_total;
      }
      // P2 Edging
      if (d.edg_p2 && d.edg_p2 !== '0x2a' && d.edg_p2 !== '-') {
        const key = d.edg_p2;
        if (!groups[key]) groups[key] = { name: key, totalLength: 0 };
        groups[key].totalLength += (d._p / 1000) * d.qty_total;
      }
      // L1 Edging
      if (d.edg_l1 && d.edg_l1 !== '0x2a' && d.edg_l1 !== '-') {
        const key = d.edg_l1;
        if (!groups[key]) groups[key] = { name: key, totalLength: 0 };
        groups[key].totalLength += (d._l / 1000) * d.qty_total;
      }
      // L2 Edging
      if (d.edg_l2 && d.edg_l2 !== '0x2a' && d.edg_l2 !== '-') {
        const key = d.edg_l2;
        if (!groups[key]) groups[key] = { name: key, totalLength: 0 };
        groups[key].totalLength += (d._l / 1000) * d.qty_total;
      }
    });
    
    return Object.values(groups).map(g => ({
      ...g,
      totalLength: Math.ceil(g.totalLength * 1.1) // +10% trimming margin
    }));
  }, [components]);

  // 5. Aggregate Hardware & Fittings
  const hardwareRekap = useMemo(() => {
    const itemsMap = {
      'Minifix': { qty: 0, stockName: 'MINIFIX HETTICH' },
      'Dowel': { qty: 0, stockName: 'DOWEL KAYU 4X8' },
      'Engsel': { qty: 0, stockName: spec.vals?.engsel1 || 'ENGSEL CLIP TOP' }, // Fallback to generic spec if not defined
      'Rel Laci': { qty: 0, stockName: spec.vals?.rel1 || 'REL TANDEM BLUM' },
      'Dormec': { qty: 0, stockName: 'DORMEC / AVENTOS' },
      'Siku L': { qty: 0, stockName: 'PLAT BESI SIKU 2 MM' }
    };

    components.forEach(d => {
      itemsMap['Engsel'].qty += d.hardware.engsel;
      itemsMap['Rel Laci'].qty += d.hardware.rel;
      itemsMap['Dormec'].qty += d.hardware.dormec;
      itemsMap['Minifix'].qty += d.hardware.minifix;
      itemsMap['Dowel'].qty += d.hardware.dowel;
      itemsMap['Siku L'].qty += d.hardware.siku;
    });

    return Object.entries(itemsMap)
      .filter(([_, data]) => data.qty > 0)
      .map(([name, data]) => ({ name, qty: data.qty, stockName: data.stockName, unit: 'pcs/set' }));
  }, [components, spec]);

  // 6. Aggregate Consumables (Bahan Penolong / Turunan)
  const consumableRekap = useMemo(() => {
    let totalEngsel = 0;
    let totalSiku = 0;
    let totalEdging = 0; // In meters
    
    components.forEach(d => {
      totalEngsel += d.hardware.engsel;
      totalSiku += d.hardware.siku;
      if (d.edg_p1 && d.edg_p1 !== '0x2a' && d.edg_p1 !== '-') totalEdging += (d._p / 1000) * d.qty_total;
      if (d.edg_p2 && d.edg_p2 !== '0x2a' && d.edg_p2 !== '-') totalEdging += (d._p / 1000) * d.qty_total;
      if (d.edg_l1 && d.edg_l1 !== '0x2a' && d.edg_l1 !== '-') totalEdging += (d._l / 1000) * d.qty_total;
      if (d.edg_l2 && d.edg_l2 !== '0x2a' && d.edg_l2 !== '-') totalEdging += (d._l / 1000) * d.qty_total;
    });

    // Logical derivations:
    // 4 screws per hinge + 4 screws per siku
    const screws = (totalEngsel * 4) + (totalSiku * 4); 
    // 1 kaleng lem Fox per 50m edging
    const lem = Math.ceil(totalEdging / 50); 
    // 1 tube silicon & lakban per 50 komponen (rough production volume logic)
    const volumeIndex = Math.ceil(components.length / 50); 

    const items = [];
    if (screws > 0) items.push({ stockName: 'SCREW JF 4X6', qty: screws, unit: 'pcs', desc: 'Turunan Engsel & Siku' });
    if (lem > 0) items.push({ stockName: 'LEM KUNING / FOX', qty: lem, unit: 'klg', desc: 'Lem khusus Edging' });
    if (volumeIndex > 0) items.push({ stockName: 'SILICONE SIKAFLEX 221', qty: volumeIndex, unit: 'tub', desc: 'Berdasarkan vol produksi' });
    if (volumeIndex > 0) items.push({ stockName: 'LAKBAN KERTAS', qty: volumeIndex, unit: 'rol', desc: 'Berdasarkan vol produksi' });
    
    return items;
  }, [components]);

  // 7. Stock Matcher helper
  function getStockInfo(name) {
    if (!name) return { qty: 0, unit: '' };
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const item = stock.find(s => {
      if (!s.nama) return false;
      const cleanStockName = s.nama.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanStockName.includes(cleanName) || cleanName.includes(cleanStockName);
    });
    return item || { qty: 0, unit: '' };
  }

  const cardStyle = {
    background: '#fff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  };

  const headerLabelStyle = {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#1e293b'
  };

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={s.pageTitle}>Rekapitulasi Kebutuhan Material Manufaktur</span>
          <span style={{ fontSize: 12, color: '#64748b' }}>Ringkasan agregat kebutuhan bahan dasar, lembaran HPL, edging, dan hardware.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        
        {/* plywood panel Rekap */}
        <div style={cardStyle}>
          <div style={headerLabelStyle}>
            🪵 Rekap Panel & Papan Dasar
            <Badge color="blue">{panelRekap.length} Jenis</Badge>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 90 }}>ID Barang</th>
                <th style={s.th}>Material Dasar</th>
                <th style={s.th}>Luas (m²)</th>
                <th style={s.th}>Kebutuhan (Lembar)</th>
                <th style={s.th}>Stok Gudang</th>
              </tr>
            </thead>
            <tbody>
              {panelRekap.map((p, i) => {
                const itemStock = getStockInfo(p.bhn);
                const isShort = itemStock.qty < p.sheets;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {itemStock.id || '-'}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{itemStock.nama || `${p.bhn} ${p.t}mm`}</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Input Drafter: {p.bhn} (Tebal: {p.t}mm)</div>
                    </td>
                    <td style={s.td}>{p.totalArea.toFixed(2)}</td>
                    <td style={s.td}>{p.sheets} <span style={{ fontSize: 10, color: '#94a3b8' }}>(+15% waste)</span></td>
                    <td style={s.td}>
                      <Badge color={isShort ? 'amber' : 'green'}>{itemStock.qty !== undefined ? `${itemStock.qty} ${itemStock.unit || 'lbr'}` : '0 lbr'}</Badge>
                      {isShort && <div style={{ fontSize: 10, color: '#b45309', marginTop: 4, fontWeight: 600 }}>Beli: {p.sheets - (itemStock.qty || 0)}</div>}
                    </td>
                  </tr>
                );
              })}
              {panelRekap.length === 0 && <tr><td colSpan={5} style={s.empty}>Tidak ada data panel dasar</td></tr>}
            </tbody>
          </table>
        </div>

        {/* HPL Sheet Rekap */}
        <div style={cardStyle}>
          <div style={headerLabelStyle}>
            🎨 Rekap Lapisan Finishing (HPL Sheets)
            <Badge color="purple">{hplRekap.length} Varian</Badge>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 90 }}>ID Barang</th>
                <th style={s.th}>Kode HPL</th>
                <th style={s.th}>Luas (m²)</th>
                <th style={s.th}>Kebutuhan (Lembar)</th>
                <th style={s.th}>Stok Gudang</th>
              </tr>
            </thead>
            <tbody>
              {hplRekap.map((h, i) => {
                const itemStock = getStockInfo(h.name);
                const isShort = itemStock.qty < h.sheets;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {itemStock.id || '-'}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{itemStock.nama || h.name}</div>
                      {itemStock.nama && <div style={{ fontSize: 11, color: '#64748b' }}>Input Drafter: {h.name}</div>}
                    </td>
                    <td style={s.td}>{h.totalArea.toFixed(2)}</td>
                    <td style={s.td}>{h.sheets} <span style={{ fontSize: 10, color: '#94a3b8' }}>(+15% waste)</span></td>
                    <td style={s.td}>
                      <Badge color={isShort ? 'amber' : 'green'}>{itemStock.qty !== undefined ? `${itemStock.qty} lbr` : '0 lbr'}</Badge>
                      {isShort && <div style={{ fontSize: 10, color: '#b45309', marginTop: 4, fontWeight: 600 }}>Beli: {h.sheets - (itemStock.qty || 0)}</div>}
                    </td>
                  </tr>
                );
              })}
              {hplRekap.length === 0 && <tr><td colSpan={5} style={s.empty}>Tidak ada data HPL</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Edging Roll/Meter Rekap */}
        <div style={cardStyle}>
          <div style={headerLabelStyle}>
            🟢 Rekap Edging Linear
            <Badge color="green">{edgingRekap.length} Jenis</Badge>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 90 }}>ID Barang</th>
                <th style={s.th}>Spesifikasi Edging</th>
                <th style={s.th}>Kebutuhan (M¹)</th>
                <th style={s.th}>Stok Gudang</th>
              </tr>
            </thead>
            <tbody>
              {edgingRekap.map((e, i) => {
                const itemStock = getStockInfo(e.name);
                const isShort = itemStock.qty < e.totalLength;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {itemStock.id || '-'}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{itemStock.nama || e.name}</div>
                      {itemStock.nama && <div style={{ fontSize: 11, color: '#64748b' }}>Input Drafter: {e.name}</div>}
                    </td>
                    <td style={s.td}>{e.totalLength} M¹ <span style={{ fontSize: 10, color: '#94a3b8' }}>(+10% trim)</span></td>
                    <td style={s.td}>
                      <Badge color={isShort ? 'amber' : 'green'}>{itemStock.qty !== undefined ? `${itemStock.qty} m` : '0 m'}</Badge>
                      {isShort && <div style={{ fontSize: 10, color: '#b45309', marginTop: 4, fontWeight: 600 }}>Beli: {e.totalLength - (itemStock.qty || 0)}m</div>}
                    </td>
                  </tr>
                );
              })}
              {edgingRekap.length === 0 && <tr><td colSpan={4} style={s.empty}>Tidak ada data edging</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Hardware & Accessories Rekap */}
        <div style={cardStyle}>
          <div style={headerLabelStyle}>
            🔩 Rekap Aksesoris & Hardware Agregat
            <Badge color="pink">{hardwareRekap.length} Jenis</Badge>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 90 }}>ID Barang</th>
                <th style={s.th}>Nama Aksesoris</th>
                <th style={s.th}>Kebutuhan</th>
                <th style={s.th}>Stok Gudang</th>
              </tr>
            </thead>
            <tbody>
              {hardwareRekap.map((f, i) => {
                const itemStock = getStockInfo(f.stockName);
                const isShort = itemStock.qty < f.qty;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {itemStock.id || f.stockName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '-'}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{itemStock.nama || f.stockName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>Kategori: {f.name}</div>
                    </td>
                    <td style={s.td}>{f.qty} {f.unit}</td>
                    <td style={s.td}>
                      <Badge color={isShort ? 'amber' : 'green'}>{itemStock.qty !== undefined ? `${itemStock.qty} ${itemStock.unit || 'pcs'}` : '0 pcs'}</Badge>
                      {isShort && <div style={{ fontSize: 10, color: '#b45309', marginTop: 4, fontWeight: 600 }}>Beli: {f.qty - (itemStock.qty || 0)}</div>}
                    </td>
                  </tr>
                );
              })}
              {hardwareRekap.length === 0 && <tr><td colSpan={4} style={s.empty}>Tidak ada data fitting/aksesoris</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Consumables (Bahan Penolong) Rekap */}
        <div style={cardStyle}>
          <div style={headerLabelStyle}>
            🛠️ Rekap Bahan Penolong (Consumables)
            <Badge color="amber">{consumableRekap.length} Jenis</Badge>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: 90 }}>ID Barang</th>
                <th style={s.th}>Nama Item</th>
                <th style={s.th}>Est. Kebutuhan</th>
                <th style={s.th}>Stok Gudang</th>
              </tr>
            </thead>
            <tbody>
              {consumableRekap.map((c, i) => {
                const itemStock = getStockInfo(c.stockName);
                const isShort = itemStock.qty < c.qty;
                return (
                  <tr key={i}>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontWeight: 600, color: '#475569' }}>
                      {itemStock.id || c.stockName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '-'}
                    </td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600 }}>{itemStock.nama || c.stockName}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>{c.desc}</div>
                    </td>
                    <td style={s.td}>{c.qty} {c.unit}</td>
                    <td style={s.td}>
                      <Badge color={isShort ? 'amber' : 'green'}>{itemStock.qty !== undefined ? `${itemStock.qty} ${itemStock.unit || c.unit}` : `0 ${c.unit}`}</Badge>
                      {isShort && <div style={{ fontSize: 10, color: '#b45309', marginTop: 4, fontWeight: 600 }}>Beli: {c.qty - (itemStock.qty || 0)}</div>}
                    </td>
                  </tr>
                );
              })}
              {consumableRekap.length === 0 && <tr><td colSpan={4} style={s.empty}>Tidak ada data bahan penolong</td></tr>}
            </tbody>
          </table>
        </div>

      </div>
      
      <div style={{ marginTop: 24, padding: 18, background: '#fffbeb', borderRadius: 10, border: '1px solid #fef3c7' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#b45309', marginBottom: 6 }}>💡 Catatan Manufaktur & Estimasi:</div>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12, color: '#78350f', lineHeight: 1.6 }}>
          <li>Estimasi lembaran panel (plywood) dasar & HPL sudah ditambahkan waste margin **15%** untuk mengantisipasi sisa potongan.</li>
          <li>Kebutuhan edging ditambahkan margin trimming keliling **10%** dari keliling bersih panel terhitung.</li>
          <li>Data stok gudang ter-sinkronisasi langsung dengan manajemen inventory master secara real-time.</li>
        </ul>
      </div>
    </div>
  );
}
