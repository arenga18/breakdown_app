import { evaluateFormula } from './calc.js';
import { buildAliasMap, resolveBreakdownItem } from './resolveAlias.js';


// 1. Mappings derived directly from master rekap 2025_Bom.xlsb data scan
export const HPL_MAP = {
  'DSK_5450_SM': '1',
  'HB_41130': '2',
  'Polos': '3',
  '(DSK_5450_SM rangka……+Aica)': '4',
  '[Aica]': '5',
  'SK_10455_UW': '6',
  'Aica': '7',
  '(SK_10455_UW rangka……+Aica)': '8'
};

export const EDG_MAP = {
  'Edg_Décor_1723_B': '1',
  'Edg_Decor_1723_B_(55x1)': '1',   // variant ukuran 55x1, same base edging
  'Melanor': '2',
  '': '3', // mapped to '3' in master but default to '0' if empty/none
  'Edg_DSS_00206_SM': '4',
  'Trim 21 S2/S4 Black Doff ( Alm. 75181 ) P3': '5',
  'Trim 22 S2/S4 Black Doff ( Alm. 75270 ) P3': '6',
  'LS-01 Black Gloss ( Alm. 86599 ) P3': '7',
  'ST-36 Black Doff ( Alm. 2351 ) P3 P3': '7',
  'Alm. 75283 ( M-FRM-05 ) MENTAH P6': '8',
  'Alm. 75284 ( M-FRM-05 ) MENTAH P6': '9',
  'Edg_DSS_00206_SM_(45X1)': '9',
  'M-FRM Tutup Belakang Black Doff ( Alm. 75225 ) P3': '1',
  'M-FRM Body Black Doff ( Alm. 75226 ) P3': '2',
  'M-FRM-02 Black Doff ( Alm. 75227 ) P3': '4',
  'M-FRM-03 Brown Gloss ( Alm. 75229 ) P3': '5',
  'M-SHF-01/02 Brown Gloss ( Alm. 75109 ) P3': '6',
  'M-FRM-07 Black Doff ( Alm. 75355 ) P3': '3',
  // Edging SK_10455_UW family (underscore format, selaras dg partsData.js)
  'Edg_u/_SK_10455_UW': '5',
  'Edg_u/_SK_10455_UW_(45x1)': '5',  // variant ukuran 45x1
  // Edging GM_86 & EAP families
  'Edg_u/_GM_86': '6',
  'Edg_EAP_5342_M0': '7',
  '0x2a': '0'
};

// Mappings of edging name to its thickness in mm
export const EDG_THICKNESS = {
  'Melanor':                  0.5,
  'Edg_Décor_1723_B':         2.0,
  'Edg_Decor_1723_B_(55x1)':  2.0,
  'Edg_DSS_00206_SM':         2.0,
  'Edg_DSS_00206_SM_(45X1)':  2.0,
  'Edg_u/_SK_10455_UW':       2.0,
  'Edg_u/_SK_10455_UW_(45x1)': 2.0,
  'Edg_u/_GM_86':             2.0,
  'Edg_EAP_5342_M0':          2.0,
  'Edg_EAW_5216D1':           2.0,
  'Edg_HB_41130':             2.0,
  'Edg_DXP_5342_XM':          2.0,
  // Aluminium profile trims (thickness is 1.0mm)
  'Trim 21 S2/S4 Black Doff ( Alm. 75181 ) P3': 1.0,
  'Trim 22 S2/S4 Black Doff ( Alm. 75270 ) P3': 1.0,
};

export function getEdgingThickness(edgName) {
  if (!edgName || edgName === '-' || edgName === '0x2a') return 0;
  return EDG_THICKNESS[edgName] ?? 2.0; // default to 2.0mm if unknown but active
}


/**
 * Formats HPL description dinamis.
 */
export function formatHplDesc(luar, dalam, tLuar = 1) {
  const l = luar ? luar.trim() : '';
  const d = dalam ? dalam.trim() : '';
  const muka = Number(tLuar) || 1; // W: jumlah muka luar
  
  if (!l && !d) return '-';
  if (l === 'Polos' && !d) return 'Polos';
  if (l === d) {
    return muka >= 2 ? `${l}_2mk` : `${l}_1mk`;
  }
  if (l === 'Polos' && d) return `${d}_1mk_Polos`;
  if (d === 'Polos' && l) return `${l}_1mk_Polos`;
  
  // Checking if there is a 'rangka' format
  if (l.includes('rangka') && d && !d.includes('rangka')) {
    return `${l} 1mk Full ${d}`;
  }
  if (d.includes('rangka') && l && !l.includes('rangka')) {
    return `${l}_Full 1mk ${d}`;
  }
  
  if (!d) return `${l}_${muka}mk`;
  return `${l}_${muka}mk_${d}`;
}

/**
 * Formats Edging description dinamis.
 */
export function formatEdgingDesc(p1, p2, l1, l2) {
  const sides = [
    { name: 'P1', val: p1 ? p1.trim() : '', isP: true },
    { name: 'P2', val: p2 ? p2.trim() : '', isP: true },
    { name: 'L1', val: l1 ? l1.trim() : '', isP: false },
    { name: 'L2', val: l2 ? l2.trim() : '', isP: false }
  ];

  const activeSides = sides.filter(s => s.val && s.val !== '0x2a' && s.val !== '-');
  if (activeSides.length === 0) {
    if (p1 === '0x2a' || p2 === '0x2a' || l1 === '0x2a' || l2 === '0x2a') return '0x2a';
    return '-';
  }

  // Check if all active sides are '0x2a'
  if (p1 === '0x2a' && p2 === '0x2a' && l1 === '0x2a' && l2 === '0x2a') return '0x2a';

  // Group by edging name
  const groups = {};
  activeSides.forEach(s => {
    if (!groups[s.val]) {
      groups[s.val] = { pCount: 0, lCount: 0 };
    }
    if (s.isP) groups[s.val].pCount++;
    else groups[s.val].lCount++;
  });

  const parts = [];
  Object.entries(groups).forEach(([edgName, countInfo]) => {
    const { pCount, lCount } = countInfo;
    if (pCount === 2 && lCount === 2) {
      parts.push(`${edgName}_Keliling`);
    } else {
      const sideParts = [];
      if (pCount > 0) sideParts.push(`${pCount}sisi_pjg`);
      if (lCount > 0) sideParts.push(`${lCount}sisi_lbr`);
      parts.push(`${edgName}_${sideParts.join(',')}`);
    }
  });

  return parts.join(' + ');
}

/**
 * Calculates raw CNC size, digit codes, dynamic names, areas, and volumes for a single component.
 */
export function calcBreakdownItem(item, rows = [], spec = {}, parent = {}) {
  const specAliases = buildAliasMap(spec);
  const resolvedItem = resolveBreakdownItem(item, specAliases);

  const pVal = Math.round(parseFloat(evaluateFormula(resolvedItem.p, rows, spec, parent)) || 0);
  const lVal = Math.round(parseFloat(evaluateFormula(resolvedItem.l, rows, spec, parent)) || 0);
  const tVal = parseFloat(evaluateFormula(resolvedItem.t, rows, spec, parent)) || 0;
  const subVal = Math.round(parseFloat(evaluateFormula(resolvedItem.sub, rows, spec, parent)) || 1);
  const jmlVal = Math.round(parseFloat(evaluateFormula(resolvedItem.jml, rows, spec, parent)) || 1);
  const qtyTotal = subVal * jmlVal;

  const isSetUp = resolvedItem.type === 'Set_up';
  if (isSetUp) {
    const formattedTVal = String(tVal).replace('.', ',');
    return {
      p_val: pVal,
      l_val: lVal,
      t_val: tVal,
      sub_val: subVal,
      jml_val: jmlVal,
      qty_total: qtyTotal,
      p_cnc: 0,
      l_cnc: 0,
      ukuran_cnc: `- x - x ${formattedTVal}`,
      v_lap: '00',
      v_edg: '3333',
      desc_lap: '-',
      desc_edg: '-',
      desc_komp: resolvedItem.komp || '',
      nama_komp: resolvedItem.komp || '',
      area_panel: 0,
      area_m2: 0,
      vol_m3: 0,
      keliling_panel: 0,
      keliling_m: 0,
      csv_format: ' ',
      hardware: { engsel: 0, rel: 0, dormec: 0, minifix: 0, dowel: 0, siku: 0, screw: 0 },
      t_p1: 0,
      t_p2: 0,
      t_l1: 0,
      t_l2: 0,
    };
  }

  // Get dynamic edging thickness per side
  const tP1 = getEdgingThickness(resolvedItem.edg_p1);
  const tP2 = getEdgingThickness(resolvedItem.edg_p2);
  const tL1 = getEdgingThickness(resolvedItem.edg_l1);
  const tL2 = getEdgingThickness(resolvedItem.edg_l2);

  const pCnc = pVal - tP1 - tP2;
  const lCnc = lVal - tL1 - tL2;

  // V_lap (2 digits)
  const d1 = resolvedItem.lap_luar ? (HPL_MAP[resolvedItem.lap_luar] || '0') : '0';
  const d2 = resolvedItem.lap_dalam ? (HPL_MAP[resolvedItem.lap_dalam] || '0') : '0';
  const vLap = `${d1}${d2}`;

  // V_edg (4 digits)
  const getEdgDigit = (val) => {
    if (!val || val === '-' || val === '0x2a') return '0';
    return EDG_MAP[val] || '0';
  };
  const e1 = getEdgDigit(resolvedItem.edg_p1);
  const e2 = getEdgDigit(resolvedItem.edg_p2);
  const e3 = getEdgDigit(resolvedItem.edg_l1);
  const e4 = getEdgDigit(resolvedItem.edg_l2);
  const vEdg = `${e1}${e2}${e3}${e4}`;

  // Descriptions
  const descLap = formatHplDesc(resolvedItem.lap_luar, resolvedItem.lap_dalam, resolvedItem.t_luar);
  const descEdg = formatEdgingDesc(resolvedItem.edg_p1, resolvedItem.edg_p2, resolvedItem.edg_l1, resolvedItem.edg_l2);

  // Auto component names
  const cleanNo = resolvedItem.no ? String(resolvedItem.no).trim() : '';
  const noPrefix = cleanNo ? `${cleanNo})` : '';
  let cleanKomp = resolvedItem.komp ? String(resolvedItem.komp).trim() : '';
  if (!cleanKomp && (resolvedItem.kabinet || resolvedItem.modul)) {
    cleanKomp = String(resolvedItem.kabinet || resolvedItem.modul).trim();
  }
  const descKomp = `${noPrefix}${cleanKomp}_${descLap}`;
  
  const formattedTVal = String(tVal).replace('.', ',');
  const namaKomp = `${noPrefix}${cleanKomp} ${resolvedItem.bhn || ''} ${resolvedItem.t_bhn || ''}mm - ${descLap} ; ${descEdg}`;

  // Area & volume calculations
  const areaPanel = (pVal / 1000) * (lVal / 1000);
  const areaM2 = areaPanel * qtyTotal;
  const volM3 = areaM2 * (tVal / 1000);
  const kelilingPanel = (2 * (pVal + lVal)) / 1000;
  const kelilingM = kelilingPanel * qtyTotal;

  // CSV CNC Format
  const csvFormat = generateCSVFormat(resolvedItem, pVal, lVal, formattedTVal, descLap, tP1, tP2, tL1, tL2);

  // Hardware multiplication
  const hardware = {
    engsel: (Number(resolvedItem.q_engsel) || 0) * qtyTotal,
    rel: (Number(resolvedItem.q_rel) || 0) * qtyTotal,
    dormec: (Number(resolvedItem.q_dormec) || 0) * qtyTotal,
    minifix: (Number(resolvedItem.q_minifix) || 0) * qtyTotal,
    dowel: (Number(resolvedItem.q_dowel) || 0) * qtyTotal,
    siku: (Number(resolvedItem.q_siku) || 0) * qtyTotal,
    screw: (Number(resolvedItem.q_screw) || 0) * qtyTotal,
  };

  return {
    p_val: pVal,
    l_val: lVal,
    t_val: tVal,
    sub_val: subVal,
    jml_val: jmlVal,
    qty_total: qtyTotal,
    p_cnc: pCnc,
    l_cnc: lCnc,
    ukuran_cnc: `${pCnc} x ${lCnc} x ${formattedTVal}`,
    v_lap: vLap,
    v_edg: vEdg,
    desc_lap: descLap,
    desc_edg: descEdg,
    desc_komp: descKomp,
    nama_komp: namaKomp,
    area_panel: areaPanel,
    area_m2: areaM2,
    vol_m3: volM3,
    keliling_panel: kelilingPanel,
    keliling_m: kelilingM,
    csv_format: csvFormat,
    hardware,
    t_p1: tP1,
    t_p2: tP2,
    t_l1: tL1,
    t_l2: tL2,
  };
}

/**
 * Formats exact CSV line for CNC machine import.
 */
export function generateCSVFormat(item, pVal, lVal, tValStr, descLap, tP1, tP2, tL1, tL2) {
  const qtyTotal = (Number(item.sub) || 1) * (Number(item.jml) || 1);
  const BP = `${item.bhn || ''} ${item.t_bhn || ''}mm ${descLap}`.trim();
  
  const fmtThk = (t) => t > 0 ? String(t).replace('.', ',') : '';

  const fields = [
    pVal,                                                               // [0] J  — Panjang
    lVal,                                                               // [1] L  — Lebar
    qtyTotal,                                                           // [2] Q  — Jumlah
    BP,                                                                 // [3] BP — Deskripsi bahan
    tValStr,                                                            // [4] N  — Tebal
    item.komp || '',                                                    // [5] H  — Nama komponen
    item.opt !== undefined && item.opt !== '' ? Number(item.opt) : 0,    // [6] F  — Opsi
    fmtThk(tP1),                                                        // [7] BY — Tebal edging P1
    fmtThk(tP2),                                                        // [8] BZ — Tebal edging P2
    fmtThk(tL1),                                                        // [9] CA — Tebal edging L1
    fmtThk(tL2),                                                        // [10] CB — Tebal edging L2
    '',                                                                 // [11]    — Reserved
    // [12] AZ — Nama/deskripsi edging (edg aktif pertama, atau kosong)
    (item.edg_p1 && item.edg_p1 !== '-' && item.edg_p1 !== '0x2a') ? item.edg_p1
      : (item.edg_p2 && item.edg_p2 !== '-' && item.edg_p2 !== '0x2a') ? item.edg_p2 : '',
    // [13] Y — Tebal lapisan dalam (mm, format koma)
    item.t_dalam > 0 ? String(item.t_dalam).replace('.', ',') : '',
  ];
  
  return fields.join(';');
}
