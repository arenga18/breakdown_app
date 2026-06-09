import { evaluateFormula } from './calc.js';
import { buildAliasMap, resolveBreakdownItem } from './resolveAlias.js';
import { parts } from '../partsData.js';

export function getPartDefaultValue(compName, fieldKey) {
  if (!compName) return '';
  const cleanComp = compName.toString().trim().toLowerCase();
  const partMatch = parts.find(p => p.name?.trim().toLowerCase() === cleanComp);
  if (!partMatch) return '';

  const mapping = {
    profil3: 'profil3',
    profil2: 'profil2',
    profil: 'profil',
    siku_joint: 'tipe_siku',
    screw_jf: 'tipe_screw',
    dormec: 'q_dormec',
    rel: 'rel',
    engsel: 'engsel',
    v: 'v',
    v2: 'v2',
    h: 'h',
    anodize: 'anodize',
    q_siku: 'q_siku',
    q_screw: 'q_screw',
    q_anodize: 'q_anodize',
    q_dormec: 'q_dormec',
    q_rel: 'q_rel',
    q_engsel: 'q_engsel',
    // BD/BE flag: 1 = has hardware (auto-calculate), 0 = skip
    q_minifix: 'q_minifix',
    q_dowel: 'q_dowel'
  };

  const partKey = mapping[fieldKey];
  if (!partKey) return '';
  const val = partMatch[partKey];
  return val !== undefined && val !== null ? val : '';
}


// 1. Mappings derived directly from master rekap 2025_Bom.xlsb data scan (as fallback)
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
  // Wood Edging (te / cte)
  'Edg_Décor_1723_B': '11',
  'Edg_DSS_00206_SM': '3',
  'Melanor': '9',
  'Edg_EAP_5342_M0': '5',
  'Edg_Decor_1723_B_(55x1)': '22',
  'Edg_DSS_00206_SM_(45X1)': '4',
  'Edg_EAW_5216D1': '1',
  'Edg_EAW_5216_D1(44x1)': '2',
  'Trim 21 S2/S4 Brown Doff ( Alm. 75181 ) P3': '7',
  'Trim 22 S2/S4 Brown Doff ( Alm. 75270 ) P3': '8',
  'ST-36 Brown Doff ( Alm. 2351 ) P3 P3': '6',
  'Edg_EAP_1338_DO': '5',
  'Edg_Decor_2023_B': '66',

  // Aluminium Profiles (Fr / cfr) - as fallback in map
  'M-FRM Tutup Belakang Black Doff ( Alm. 75225 ) P3': '1',
  'M-FRM Body Black Doff ( Alm. 75226 ) P3': '2',
  'M-FRM-07 Black Doff ( Alm. 75355 ) P3': '3',
  'M-FRM-02 Black Doff ( Alm. 75227 ) P3': '4',
  'M-FRM-03 Brown Gloss ( Alm. 75229 ) P3': '5',
  'M-SHF-01/02 Brown Gloss ( Alm. 75109 ) P3': '6',
  '0x2a': '0'
};

export function getEdgingNameFromCode(code, cat) {
  if (!code) return '';
  const cleanCode = code.toString().trim();
  const isAlu = cat && cat.toString().toLowerCase() === 'alu';

  if (isAlu) {
    const aluMap = {
      '1': 'M-FRM Tutup Belakang Black Doff ( Alm. 75225 ) P3',
      '2': 'M-FRM Body Black Doff ( Alm. 75226 ) P3',
      '3': 'M-FRM-07 Black Doff ( Alm. 75355 ) P3',
      '4': 'M-FRM-02 Black Doff ( Alm. 75227 ) P3',
      '5': 'M-FRM-03 Brown Gloss ( Alm. 75229 ) P3',
      '6': 'M-SHF-01/02 Brown Gloss ( Alm. 75109 ) P3',
      '0': '0x2a'
    };
    return aluMap[cleanCode] || '';
  } else {
    const woodMap = {
      '11': 'Edg_Décor_1723_B',
      '3': 'Edg_DSS_00206_SM',
      '9': 'Melanor',
      '5': 'Edg_EAP_5342_M0',
      '22': 'Edg_Decor_1723_B_(55x1)',
      '4': 'Edg_DSS_00206_SM_(45X1)',
      '1': 'Edg_EAW_5216D1',
      '2': 'Edg_EAW_5216_D1(44x1)',
      '7': 'Trim 21 S2/S4 Brown Doff ( Alm. 75181 ) P3',
      '8': 'Trim 22 S2/S4 Brown Doff ( Alm. 75270 ) P3',
      '6': 'ST-36 Brown Doff ( Alm. 2351 ) P3 P3',
      '66': 'Edg_Decor_2023_B',
      '0': '0x2a'
    };
    return woodMap[cleanCode] || '';
  }
}

export function resolveEdgingFromCode(code, cat, categories = []) {
  if (code === undefined || code === null || code === '' || code === '0x2a' || code === '-') return '';
  const targetCode = String(code).trim();
  const isAlu = cat && cat.toString().toLowerCase() === 'alu';
  const catCode = isAlu ? 'alu' : 'te';

  const category = categories.find(c => c.code === catCode);
  if (category && Array.isArray(category.items)) {
    const found = category.items.find(item => {
      if (item && typeof item === 'object' && item.code !== undefined && item.code !== null) {
        return String(item.code).trim() === targetCode;
      }
      return false;
    });
    if (found) return found.name;
  }

  return getEdgingNameFromCode(code, cat);
}

export function getHplNameFromCode(code) {
  if (!code) return '';
  const cleanCode = code.toString().trim();
  const preferred = {
    '1': 'DSK_5450_SM',
    '2': 'HB_41130',
    '3': 'Polos',
    '4': '(DSK_5450_SM rangka……+Aica)',
    '5': '[Aica]',
    '6': 'SK_10455_UW',
    '7': 'Aica',
    '8': '(SK_10455_UW rangka……+Aica)',
    '11': 'HB_41130'
  };

  if (preferred[cleanCode]) return preferred[cleanCode];

  const entry = Object.entries(HPL_MAP).find(([name, c]) => c === cleanCode);
  return entry ? entry[0] : '';
}

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

export function extractEdgingThickness(item) {
  if (!item) return null;
  // 1. Ambil dari kolom edg_thk jika ada
  if (item.edg_thk !== undefined && item.edg_thk !== null && item.edg_thk !== '') {
    const val = parseFloat(item.edg_thk);
    if (!isNaN(val)) return val;
  }
  
  // 2. Ambil dari keterangan/ket (JSON atau teks biasa format "edg_thk: 2")
  const ketStr = item.keterangan || item.ket || '';
  if (ketStr) {
    try {
      if (ketStr.trim().startsWith('{')) {
        const obj = JSON.parse(ketStr);
        if (obj && obj.edg_thk !== undefined) {
          const val = parseFloat(obj.edg_thk);
          if (!isNaN(val)) return val;
        }
      }
    } catch (e) {}
    const matchKet = ketStr.match(/edg_thk\s*[:=]\s*([\d.,]+)/i);
    if (matchKet) {
      const val = parseFloat(matchKet[1].replace(',', '.'));
      if (!isNaN(val)) return val;
    }
  }

  // 3. Auto-extract dari Nama Barang (contoh: "22X0.4" -> 0.4mm, "29x1" -> 1.0mm, "22X0,45" -> 0.45mm)
  const nameStr = item.nama || '';
  if (nameStr) {
    const matchName = nameStr.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)/);
    if (matchName) {
      const val = parseFloat(matchName[2].replace(',', '.'));
      if (!isNaN(val) && val > 0 && val < 10) {
        return val;
      }
    }
  }

  return null;
}

export function getFinishingThickness(name, categories = []) {
  if (name === undefined || name === null) return 0;
  const nameStr = String(name).trim();
  if (!nameStr || nameStr === '-' || nameStr === '0' || nameStr.toLowerCase() === 'polos' || nameStr.toLowerCase() === 'mentah' || nameStr.toLowerCase() === 'polos/mentah') return 0;

  const targetName = nameStr.toLowerCase();
  for (const catCode of ['lap_luar', 'lap_dalam', 'tf']) {
    const cat = categories.find(c => c.code === catCode);
    if (cat && Array.isArray(cat.items)) {
      const found = cat.items.find(item => {
        if (typeof item === 'string') return item.toLowerCase().trim() === targetName;
        return (item.name || '').toLowerCase().trim() === targetName;
      });
      if (found && typeof found === 'object' && found.tebal !== undefined && found.tebal !== '') {
        return parseFloat(found.tebal) || 0;
      }
    }
  }

  // Fallback to hardcoded defaults for safety
  if (targetName.includes('hpl') || targetName.includes('wy_') || targetName.includes('dsk_') || targetName.includes('sk_') || targetName.includes('gm_') || targetName.includes('dxp_')) {
    return 1.0;
  }
  if (targetName.includes('duco') || targetName.includes('veneer') || targetName.includes('hb_') || targetName.includes('[aica]') || targetName === 'aica') {
    return 0.5;
  }

  return 0; // default fallback
}

export function getEdgingThickness(edgName, stockItems = [], categories = []) {
  if (edgName === undefined || edgName === null) return 0;
  const edgNameStr = String(edgName).trim();
  if (!edgNameStr || edgNameStr === '-' || edgNameStr === '0x2a') return 0;

  // 1. Look up in dynamic categories first ('te' or 'edg')
  const target = edgNameStr.toLowerCase();
  for (const catCode of ['te', 'edg']) {
    const cat = categories.find(c => c.code === catCode);
    if (cat && Array.isArray(cat.items)) {
      const found = cat.items.find(item => {
        if (typeof item === 'string') return item.toLowerCase().trim() === target;
        return (item.name || '').toLowerCase().trim() === target;
      });
      if (found && typeof found === 'object' && found.tebal !== undefined && found.tebal !== '') {
        return parseFloat(found.tebal) || 0;
      }
    }
  }

  // 2. Cari kecocokan di stock items (case-insensitive / contains)
  const found = stockItems.find(s => {
    const sNama = (s.nama || '').toLowerCase().trim();
    const sKode = (s.kode || s.id || '').toLowerCase().trim();
    return sNama === target || sKode === target || sNama.includes(target) || target.includes(sNama);
  });

  if (found) {
    const thk = extractEdgingThickness(found);
    if (thk !== null) return thk;
  }

  // 3. Fallback ke hardcoded map (backward compatibility)
  const fallback = EDG_THICKNESS[edgName];
  if (fallback !== undefined) return fallback;

  // 4. Fallback ekstraksi langsung dari string edgName itu sendiri jika mengandung ukuran
  const matchName = edgName.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)/);
  if (matchName) {
    const val = parseFloat(matchName[2].replace(',', '.'));
    if (!isNaN(val) && val > 0 && val < 10) {
      return val;
    }
  }

  return 2.0; // ultimate default fallback
}

export function isFinishingEmpty(code) {
  if (code === undefined || code === null) return true;
  const s = String(code).trim();
  return s === '' || s === '-';
}

export function resolveLapisanFromCode(code, categories = []) {
  if (isFinishingEmpty(code)) return '';
  const targetCode = String(code).trim();
  const cat = categories.find(c => c.code === 'tf');
  if (cat && Array.isArray(cat.items)) {
    const found = cat.items.find(item => {
      if (typeof item === 'string') return false;
      return String(item.code).trim() === targetCode;
    });
    if (found) return found.name;
  }
  return '';
}


export function resolveDescFromCode(catCode, targetCode, categories = []) {
  if (targetCode === undefined || targetCode === null || targetCode === '' || targetCode === '0' || targetCode === '00' || targetCode === '0000') return '';
  const cleanTarget = String(targetCode).trim();
  const cat = categories.find(c => c.code === catCode);
  if (cat && Array.isArray(cat.items)) {
    const found = cat.items.find(item => {
      if (item && typeof item === 'object' && item.code !== undefined && item.code !== null) {
        return String(item.code).trim() === cleanTarget;
      }
      return false;
    });
    if (found) return found.name;
  }
  return '';
}

const hplMapCache = new WeakMap();
const edgMapCache = new WeakMap();

export function buildHplMap(categories = []) {
  if (!categories || typeof categories !== 'object') {
    return buildHplMapRaw(categories);
  }
  let cached = hplMapCache.get(categories);
  if (!cached) {
    cached = buildHplMapRaw(categories);
    hplMapCache.set(categories, cached);
  }
  return cached;
}

function buildHplMapRaw(categories = []) {
  const map = {};

  // 1. Populate ONLY from category 'tf' (Type Finished) which maps name -> val
  const tfCat = categories.find(c => c.code === 'tf');
  if (tfCat && Array.isArray(tfCat.items)) {
    tfCat.items.forEach(item => {
      if (item && typeof item === 'object' && item.name && item.val !== undefined) {
        const lName = item.name.toLowerCase().trim();
        if (map[lName] === undefined) {
          map[lName] = String(item.val);
        }
      }
    });
  }

  // 2. Fallback to hardcoded HPL_MAP (with lowercase keys)
  Object.entries(HPL_MAP).forEach(([key, val]) => {
    const lKey = key.toLowerCase().trim();
    if (map[lKey] === undefined) {
      map[lKey] = val;
    }
  });

  return map;
}

export function buildEdgMap(categories = []) {
  if (!categories || typeof categories !== 'object') {
    return buildEdgMapRaw(categories);
  }
  let cached = edgMapCache.get(categories);
  if (!cached) {
    cached = buildEdgMapRaw(categories);
    edgMapCache.set(categories, cached);
  }
  return cached;
}

function buildEdgMapRaw(categories = []) {
  const map = {};

  // 1. Populate ONLY from categories 'te' and 'alu' (ignoring legacy 'edg') using item.val
  const edgCats = categories.filter(c => c.code === 'te' || c.code === 'alu');
  edgCats.forEach(cat => {
    (cat.items || []).forEach(item => {
      if (item && typeof item === 'object' && item.name && item.val !== undefined && item.val !== null) {
        const lName = item.name.toLowerCase().trim();
        if (map[lName] === undefined) {
          map[lName] = String(item.val).trim();
        }
      }
    });
  });

  // 2. Fallback to hardcoded EDG_MAP (with lowercase keys)
  Object.entries(EDG_MAP).forEach(([key, val]) => {
    const lKey = key.toLowerCase().trim();
    if (map[lKey] === undefined) {
      map[lKey] = val;
    }
  });

  return map;
}


/**
 * Formats HPL description dinamis.
 */
export function formatHplDesc(luar, dalam, tLuar = 1) {
  const l = luar ? String(luar).trim() : '';
  const d = dalam ? String(dalam).trim() : '';
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

  const categoriesList = spec?.categories || [];
  const gc = spec?.globalConstants || {};
  const fp = Number(gc.fp) || 800;   // jarak engsel standar (mm)
  const fm = Number(gc.fm) || 256;   // faktor pembagi jml minifix (mm) — Excel = 256
  const fd = Number(gc.fd) || 196;   // faktor pembagi jml dowel (mm) — Excel = 196
  const tol_p = Number(gc.tol_p) || 40; // toleransi CNC panjang (mm)
  const tol_l = Number(gc.tol_l) || 40; // toleransi CNC lebar (mm)

  const pVal = Math.round(parseFloat(evaluateFormula(resolvedItem.p, rows, spec, parent)) || 0);
  const lVal = Math.round(parseFloat(evaluateFormula(resolvedItem.l, rows, spec, parent)) || 0);
  const subVal = Math.round(parseFloat(evaluateFormula(resolvedItem.sub, rows, spec, parent)) || 1);
  const jmlVal = Math.round(parseFloat(evaluateFormula(resolvedItem.jml, rows, spec, parent)) || 1);
  const qtyTotal = subVal * jmlVal;

  // Indonesian L & D Finishing code dynamic resolution
  const lFinCode = String(evaluateFormula(resolvedItem.l_fin || item.l_fin, rows, spec, parent) || '').trim();
  const dFinCode = String(evaluateFormula(resolvedItem.d_fin || item.d_fin, rows, spec, parent) || '').trim();

  let resolvedLapLuar = '';
  if (!isFinishingEmpty(lFinCode)) {
    resolvedLapLuar = resolveLapisanFromCode(lFinCode, categoriesList) || '';
  }

  let resolvedLapDalam = '';
  if (!isFinishingEmpty(dFinCode)) {
    resolvedLapDalam = resolveLapisanFromCode(dFinCode, categoriesList) || '';
  }

  // Task 2.1 — Auto-derive Tebal Aktual: t = t_bhn + t_luar + t_dalam (Gap #4)
  const tBhn = parseFloat(evaluateFormula(resolvedItem.t_bhn, rows, spec, parent)) || 0;
  
  let tLuarLayer = parseFloat(resolvedItem.t_luar) || 0;
  if (!tLuarLayer && resolvedLapLuar) {
    tLuarLayer = getFinishingThickness(resolvedLapLuar, categoriesList);
  }

  let tDalamLayer = parseFloat(resolvedItem.t_dalam) || 0;
  if (!tDalamLayer && resolvedLapDalam) {
    tDalamLayer = getFinishingThickness(resolvedLapDalam, categoriesList);
  }

  // Auto-derive if all three component fields are available, else fall back to manual t
  const tVal = (tBhn > 0)
    ? tBhn + tLuarLayer + tDalamLayer
    : (parseFloat(evaluateFormula(resolvedItem.t, rows, spec, parent)) || 0);

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
      area_gross: 0,
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

  const stockItems = spec?.stock || [];

  const dynamicHplMap = buildHplMap(categoriesList);
  const dynamicEdgMap = buildEdgMap(categoriesList);

  // Evaluate code values dynamically first (matching Excel Z146, AA146, AB146, AC146)
  const p1Code = String(evaluateFormula(resolvedItem.p1, rows, spec, parent) || '').trim();
  const p2Code = String(evaluateFormula(resolvedItem.p2, rows, spec, parent) || '').trim();
  const l1Code = String(evaluateFormula(resolvedItem.l1, rows, spec, parent) || '').trim();
  const l2Code = String(evaluateFormula(resolvedItem.l2, rows, spec, parent) || '').trim();

  // Dynamically resolve names from code and category (Alu or Wood)
  const edgP1Name = resolveEdgingFromCode(p1Code, resolvedItem.cat, categoriesList);
  const edgP2Name = resolveEdgingFromCode(p2Code, resolvedItem.cat, categoriesList);
  const edgL1Name = resolveEdgingFromCode(l1Code, resolvedItem.cat, categoriesList);
  const edgL2Name = resolveEdgingFromCode(l2Code, resolvedItem.cat, categoriesList);

  // Get dynamic edging thickness per side
  const tP1 = getEdgingThickness(edgP1Name, stockItems, categoriesList);
  const tP2 = getEdgingThickness(edgP2Name, stockItems, categoriesList);
  const tL1 = getEdgingThickness(edgL1Name, stockItems, categoriesList);
  const tL2 = getEdgingThickness(edgL2Name, stockItems, categoriesList);

  const pCnc = pVal - tL1 - tL2;
  const lCnc = lVal - tP1 - tP2;

  // V_lap (2 digits)
  const lookupLuar = resolvedLapLuar ? String(resolvedLapLuar).toLowerCase().trim() : '';
  const lookupDalam = resolvedLapDalam ? String(resolvedLapDalam).toLowerCase().trim() : '';
  const d1 = lookupLuar ? (dynamicHplMap[lookupLuar] || '0') : '0';
  const d2 = lookupDalam ? (dynamicHplMap[lookupDalam] || '0') : '0';
  const vLap = `${d1}${d2}`;

  // V_edg (4 digits)
  const getEdgDigit = (val) => {
    if (!val || val === '-' || val === '0x2a') return '0';
    const lVal = val.toLowerCase().trim();
    return dynamicEdgMap[lVal] || '0';
  };
  const e1 = getEdgDigit(edgP1Name);
  const e2 = getEdgDigit(edgP2Name);
  const e3 = getEdgDigit(edgL1Name);
  const e4 = getEdgDigit(edgL2Name);
  const vEdg = `${e1}${e2}${e3}${e4}`;

  // Descriptions (dynamic categories lookup with fallback)
  let descLap = resolveDescFromCode('descf', vLap, categoriesList);
  if (!descLap) {
    descLap = formatHplDesc(resolvedLapLuar, resolvedLapDalam, tLuarLayer);
  }

  const isAluCat = (resolvedItem.cat || '').toString().toLowerCase().trim() === 'alu';
  let descEdg = '';
  if (isAluCat) {
    descEdg = resolveDescFromCode('descfr', vEdg, categoriesList);
  } else {
    descEdg = resolveDescFromCode('desce', vEdg, categoriesList);
  }
  if (!descEdg) {
    descEdg = formatEdgingDesc(edgP1Name, edgP2Name, edgL1Name, edgL2Name);
  }

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

  // Task 4.3 — area_gross dengan toleransi CNC (Gap #8)
  const areaGrossPanel = ((pVal + tol_p) / 1000) * ((lVal + tol_l) / 1000);
  const areaGross = areaGrossPanel * qtyTotal;

  // CSV CNC Format
  const csvFormat = generateCSVFormat(
    { ...resolvedItem, edg_p1: edgP1Name, edg_p2: edgP2Name, edg_l1: edgL1Name, edg_l2: edgL2Name },
    pVal, lVal, formattedTVal, descLap, tP1, tP2, tL1, tL2, qtyTotal
  );

  // Task 2.2 — Auto-calc hardware Engsel, Minifix, Dowel
  // Logic mengikuti rumus Excel asli:
  //   Minifix @ : =IF($BD172=0;0;IF($L172<150;2;ROUNDUP($L172/fm;0)*2))*$Q172
  //   Dowel @   : =IF($BE172=0;0;IF($L172<150;2;ROUNDUP($L172/fd;0)*2))*$Q172
  //   Engsel    : =IF($BI172=0;0;IF($J172<=fp;2;ROUNDUP($J172/fp;0)))*$Q172
  // Kolom BD/BE/BI adalah flag biner dari master Part DB — bukan cek kategori.

  const catLower = (resolvedItem.cat || '').toLowerCase();
  const isPintu = catLower === 'pintu' || catLower === 'pintu kaca';

  // ── Engsel ──────────────────────────────────────────────────────────────────
  // BD analog: field engsel (nama merk engsel) — jika kosong/0/'–' → tidak ada engsel
  const resolvedEngselName = resolvedItem.engsel !== undefined && resolvedItem.engsel !== null && resolvedItem.engsel !== ''
    ? resolvedItem.engsel
    : getPartDefaultValue(resolvedItem.komp, 'engsel');

  let qEngselManual = 0;
  if (resolvedEngselName && resolvedEngselName !== '0' && resolvedEngselName !== '-') {
    const parseNum = Number(resolvedEngselName);
    if (!isNaN(parseNum) && parseNum > 0) {
      qEngselManual = parseNum;
    } else {
      qEngselManual = Number(getPartDefaultValue(resolvedItem.komp, 'q_engsel')) || 0;
    }
  }

  let autoEngsel = 0;
  if (isPintu && pVal > 0) {
    // =IF(J<=fp;2;ROUNDUP(J/fp;0))
    autoEngsel = pVal <= fp ? 2 : Math.ceil(pVal / fp);
  }
  const engselTotal = qEngselManual > 0
    ? qEngselManual * qtyTotal
    : (resolvedEngselName && resolvedEngselName !== '0' && resolvedEngselName !== '-') ? autoEngsel * qtyTotal : 0;

  // ── Minifix @ ───────────────────────────────────────────────────────────────
  // Setara Excel Kolom BD (flag: 0 = tidak ada, 1 = ada minifix)
  // Rumus: =IF($BD172=0;0;IF($L172<150;2;ROUNDUP($L172/fm;0)*2))*$Q172
  const rawMinifixFlag = resolvedItem.q_minifix !== undefined && resolvedItem.q_minifix !== null && resolvedItem.q_minifix !== ''
    ? resolvedItem.q_minifix
    : getPartDefaultValue(resolvedItem.komp, 'q_minifix');
  const minifixFlag = Number(rawMinifixFlag) || 0; // BD column: 0 = skip

  let minifixTotal = 0;
  if (minifixFlag !== 0 && lVal > 0) {
    // BD !== 0 → hitung: IF(L<150; 2; ROUNDUP(L/fm,0)*2)
    const autoMinifix = lVal < 150 ? 2 : Math.ceil(lVal / fm) * 2;
    minifixTotal = autoMinifix * qtyTotal;
  }

  // ── Dowel @ ─────────────────────────────────────────────────────────────────
  // Setara Excel Kolom BE (flag: 0 = tidak ada, 1 = ada dowel)
  // Rumus: =IF($BE172=0;0;IF($L172<150;2;ROUNDUP($L172/fd;0)*2))*$Q172
  const rawDowelFlag = resolvedItem.q_dowel !== undefined && resolvedItem.q_dowel !== null && resolvedItem.q_dowel !== ''
    ? resolvedItem.q_dowel
    : getPartDefaultValue(resolvedItem.komp, 'q_dowel');
  const dowelFlag = Number(rawDowelFlag) || 0; // BE column: 0 = skip

  let dowelTotal = 0;
  if (dowelFlag !== 0 && lVal > 0) {
    // BE !== 0 → hitung: IF(L<150; 2; ROUNDUP(L/fd,0)*2)
    const autoDowel = lVal < 150 ? 2 : Math.ceil(lVal / fd) * 2;
    dowelTotal = autoDowel * qtyTotal;
  }

  // Rel
  const resolvedRelName = resolvedItem.rel !== undefined && resolvedItem.rel !== null && resolvedItem.rel !== ''
    ? resolvedItem.rel
    : getPartDefaultValue(resolvedItem.komp, 'rel');

  let qRelManual = 0;
  if (resolvedRelName && resolvedRelName !== '0' && resolvedRelName !== '-') {
    const parseNum = Number(resolvedRelName);
    if (!isNaN(parseNum) && parseNum > 0) {
      qRelManual = parseNum;
    } else {
      qRelManual = Number(getPartDefaultValue(resolvedItem.komp, 'q_rel')) || 0;
    }
  }

  // Dormec
  const resolvedDormecName = resolvedItem.dormec !== undefined && resolvedItem.dormec !== null && resolvedItem.dormec !== ''
    ? resolvedItem.dormec
    : getPartDefaultValue(resolvedItem.komp, 'dormec');

  let qDormecManual = 0;
  if (resolvedDormecName && resolvedDormecName !== '0' && resolvedDormecName !== '-') {
    const parseNum = Number(resolvedDormecName);
    if (!isNaN(parseNum) && parseNum > 0) {
      qDormecManual = parseNum;
    } else {
      qDormecManual = Number(getPartDefaultValue(resolvedItem.komp, 'q_dormec')) || 0;
    }
  }

  // Siku
  const resolvedSiku = resolvedItem.q_siku !== undefined && resolvedItem.q_siku !== null && resolvedItem.q_siku !== ''
    ? resolvedItem.q_siku
    : getPartDefaultValue(resolvedItem.komp, 'q_siku');

  // Screw
  const resolvedScrew = resolvedItem.q_screw !== undefined && resolvedItem.q_screw !== null && resolvedItem.q_screw !== ''
    ? resolvedItem.q_screw
    : getPartDefaultValue(resolvedItem.komp, 'q_screw');

  const hardware = {
    engsel: engselTotal,
    rel: qRelManual * qtyTotal,
    dormec: qDormecManual * qtyTotal,
    minifix: minifixTotal,
    dowel: dowelTotal,
    siku: (Number(resolvedSiku) || 0) * qtyTotal,
    screw: (Number(resolvedScrew) || 0) * qtyTotal,
  };

  // Excel matching formulas:
  const pGross = ((pVal + tol_p) * qtyTotal) / 1000;
  const lGross = ((lVal + tol_p) * qtyTotal) / 1000;
  const keliling = (!resolvedItem.bhn || resolvedItem.bhn === '0') ? 0 : (2 * ((pVal + tol_p) + (lVal + tol_p)) * qtyTotal) / 1000;
  const luasGross = (!resolvedItem.bhn || resolvedItem.bhn === '0') ? 0 : ((pVal * lVal) / 1000000) * qtyTotal;
  const bhnDasar = `${resolvedItem.bhn || ''}_${resolvedItem.t_bhn || ''}`;
  const bhnDesc = `${resolvedItem.bhn || ''} ${resolvedItem.t_bhn || ''} ${descLap}`;
  const propHarga = (!resolvedItem.bhn || resolvedItem.bhn === '0') ? 0 : (((pVal * lVal * qtyTotal) / (2400 * 1200)) + 0.1);

  // Anodize qty
  const resolvedAnodize = resolvedItem.q_anodize !== undefined && resolvedItem.q_anodize !== null && resolvedItem.q_anodize !== ''
    ? resolvedItem.q_anodize
    : getPartDefaultValue(resolvedItem.komp, 'q_anodize');
  const qAnodizeStd = Number(resolvedAnodize) || 0;

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
    area_gross: areaGross,
    vol_m3: volM3,
    keliling_panel: kelilingPanel,
    keliling_m: kelilingM,
    csv_format: csvFormat,
    hardware,
    t_p1: tP1,
    t_p2: tP2,
    t_l1: tL1,
    t_l2: tL2,
    
    // Dynamic lookup fields resolved from partsData
    profil3: resolvedItem.profil3 || getPartDefaultValue(resolvedItem.komp, 'profil3'),
    profil2: resolvedItem.profil2 || getPartDefaultValue(resolvedItem.komp, 'profil2'),
    profil: resolvedItem.profil || getPartDefaultValue(resolvedItem.komp, 'profil'),
    siku_joint: resolvedItem.siku_joint || getPartDefaultValue(resolvedItem.komp, 'siku_joint'),
    screw_jf: resolvedItem.screw_jf || getPartDefaultValue(resolvedItem.komp, 'screw_jf'),
    v: resolvedItem.v || getPartDefaultValue(resolvedItem.komp, 'v'),
    v2: resolvedItem.v2 || getPartDefaultValue(resolvedItem.komp, 'v2'),
    h: resolvedItem.h || getPartDefaultValue(resolvedItem.komp, 'h'),
    anodize: resolvedItem.anodize || getPartDefaultValue(resolvedItem.komp, 'anodize'),
    
    // Resolved edging names (overwrite raw codes from autoFill)
    edg_p1: edgP1Name,
    edg_p2: edgP2Name,
    edg_l1: edgL1Name,
    edg_l2: edgL2Name,
    
    // Excel-derived columns
    p_gross: pGross,
    l_gross: lGross,
    keliling: keliling,
    luas_gross: luasGross,
    bhn_dasar: bhnDasar,
    bhn_desc: bhnDesc,
    prop_harga: propHarga,
    q_anodize_std: qAnodizeStd,
    q_minifix_total: hardware.minifix,
    q_dowel_total: hardware.dowel,
    q_siku_total: hardware.siku,
    q_screw_total: hardware.screw,
    q_dormec_total: hardware.dormec,
    q_engsel_total: hardware.engsel,
    q_rel_total: hardware.rel,
    m2: areaM2,
    m3: volM3,
  };
}

/**
 * Formats exact CSV line for CNC machine import.
 * Field order matches Excel §4: J;L;Q;BP;N;H;-1;AF;CA;AG;CB;AD;BY;AE;BZ
 */
export function generateCSVFormat(item, pVal, lVal, tValStr, descLap, tP1, tP2, tL1, tL2, qtyTotal) {
  const qty = qtyTotal !== undefined
    ? qtyTotal
    : (Number(item.sub) || 1) * (Number(item.jml) || 1);

  const BP = `${item.bhn || ''} ${item.t_bhn || ''}mm ${descLap}`.trim();
  
  const fmtThk = (t) => t > 0 ? String(t).replace('.', ',') : '';
  const fmtEdg = (edgVal) => (edgVal && edgVal !== '-' && edgVal !== '0x2a') ? edgVal : '';

  // Correct order per Excel spec §4:
  // J; L; Q; BP; N; H; -1; AF(edg_l1 name); CA(t_l1); AG(edg_l2 name); CB(t_l2); AD(edg_p1 name); BY(t_p1); AE(edg_p2 name); BZ(t_p2)
  const fields = [
    pVal,                        // [0] J  — Panjang
    lVal,                        // [1] L  — Lebar
    qty,                         // [2] Q  — Jumlah
    BP,                          // [3] BP — Deskripsi bahan
    tValStr,                     // [4] N  — Tebal
    item.komp || '',             // [5] H  — Nama komponen
    -1,                          // [6]    — Flag (always -1)
    fmtEdg(item.edg_l1),        // [7] AF — Edging L1 name
    fmtThk(tL1),                // [8] CA — Tebal Edging L1
    fmtEdg(item.edg_l2),        // [9] AG — Edging L2 name
    fmtThk(tL2),                // [10] CB — Tebal Edging L2
    fmtEdg(item.edg_p1),        // [11] AD — Edging P1 name
    fmtThk(tP1),                // [12] BY — Tebal Edging P1
    fmtEdg(item.edg_p2),        // [13] AE — Edging P2 name
    fmtThk(tP2),                // [14] BZ — Tebal Edging P2
  ];
  
  return fields.join(';');
}
