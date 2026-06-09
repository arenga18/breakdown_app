import { buildAliasMap } from './resolveAlias.js';

// Column key → data path mapping for breakdown calc source lookup
const CALC_SOURCE_COL_MAP = {
  'minifix@': 'hardware.minifix',
  'dowel@': 'hardware.dowel',
  'qty_total': 'qty_total',
  'p_gross': 'p_gross',
  'l_gross': 'l_gross',
  'keliling': 'keliling',
  'area_m2': 'area_m2',
  'vol_m3': 'vol_m3',
  'q_minifix_total': 'hardware.minifix',
  'q_dowel_total': 'hardware.dowel',
};

// Resolve nested path like "hardware.minifix" from an object
function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), obj);
}

// Sum a column from breakdown data for calc source references
export function resolveCalcSource(calcSourceStr, processedData) {
  if (!calcSourceStr || typeof calcSourceStr !== 'string') return undefined;
  if (calcSourceStr.startsWith('Breakdown:')) {
    const colKey = calcSourceStr.slice('Breakdown:'.length);
    const dataPath = CALC_SOURCE_COL_MAP[colKey];
    if (!dataPath) return undefined;
    return processedData.reduce((sum, d) => sum + (Number(getNested(d, dataPath)) || 0), 0);
  }
  if (calcSourceStr.startsWith('Spek:')) {
    // Spek:SectionName:Alias — resolved via spec aliases
    const parts = calcSourceStr.split(':');
    if (parts.length === 3) {
      const valAliasMap = buildAliasMap({ tplSections: [], globalConstants: {}, aliases: {} }, true);
      // We return the string reference; caller resolves with buildAliasMap
      return calcSourceStr;
    }
    return calcSourceStr;
  }
  return calcSourceStr;
}

export function evaluateReportFormula(val, spec) {
  if (val === undefined || val === null) return 0;
  const strVal = String(val).trim();
  if (!strVal.startsWith('=')) {
    const num = Number(strVal);
    return isNaN(num) ? strVal : num;
  }
  
  try {
    let expression = strVal.slice(1).trim().toUpperCase();
    const valAliasMap = buildAliasMap(spec, true);
    
    // Replace variable names in expression with their resolved values
    expression = expression.replace(/\b[A-Z_a-z][A-Z_a-z0-9._]*\b/g, (match) => {
      const resolved = valAliasMap[match] ?? valAliasMap[match.toLowerCase()] ?? valAliasMap[match.toUpperCase()];
      if (resolved !== undefined && resolved !== null) {
        return typeof resolved === 'number' ? resolved : (isNaN(Number(resolved)) ? `"${resolved}"` : Number(resolved));
      }
      return match;
    });
    
    // Evaluate the math expression safely
    const cleanExpr = expression.replace(/[^0-9+\-*/().\s"']/g, '');
    const evaluated = Function(`"use strict"; return (${cleanExpr})`)();
    const num = Number(evaluated);
    return isNaN(num) ? evaluated : num;
  } catch (e) {
    console.warn("Failed to evaluate report formula:", val, e);
    return val; // fallback to original input
  }
}

const normalizeStockName = (str) => String(str || '').toLowerCase().trim().replace(/\s+/g, ' ');

export function getStockKode(item) {
  if (!item) return '';
  const kode = item.kode || item.id || '';
  const str = String(kode).trim();
  return str === '…' || str === '...' ? '' : str;
}

export function getStockSatuan(item) {
  if (!item) return '';
  return String(item.satuan || item.sat || '').trim();
}

/**
 * Resolves item names, stock codes, and units.
 */
export function resolveStockItem(nameOrExpr, spec, stock) {
  if (!nameOrExpr) return { resolvedName: '', stockItem: null };
  
  let resolvedName = nameOrExpr;
  if (typeof nameOrExpr === 'string' && nameOrExpr.startsWith('=')) {
    const varName = nameOrExpr.slice(1).trim();
    const cleanKey = varName.startsWith('_') ? varName.slice(1) : varName;
    
    // Build alias map with values (names)
    const valAliasMap = buildAliasMap(spec, true);
    let specVal = valAliasMap[cleanKey] || valAliasMap[varName] || valAliasMap[varName.toLowerCase()] || valAliasMap[cleanKey.toLowerCase()];
    
    if (specVal !== undefined && specVal !== null) {
      resolvedName = specVal;
    } else {
      // Hardcoded fallback for standard items
      const defaults = {
        'minifix_hettich': 'MINIFIX HETTICH',
        'dowelØ8': 'DOWEL KAYU 4X8',
        'acrylic_mled': 'ACRYLIC MLED',
        'plat_join': 'PLAT JOIN',
        'sikubr': 'PLAT BESI SIKU 2 MM',
        'm_grill_01': 'M-GRILL',
        'wl77_2pintu': 'WL77',
        'wl77_ra': 'WL77 RA',
        'wl77_rb': 'WL77 RB',
        'wl230_4pintu': 'WL230',
        'wl230_ra': 'WL230 RA',
        'roda_atas_fold_formwell': 'RODA ATAS FOLD FORMWELL',
        'rel_atas_fold_formwell': 'REL ATAS FOLD FORMWELL',
        'sl_56_kit': 'SL 56 KIT',
        'sl_56_track': 'SL 56 TRACK',
        'PD_blum_55': 'PD BLUM 55',
        'camar_807': 'CAMAR 807',
        'libra_h6': 'LIBRA H6',
        'libra_Ch': 'LIBRA CH',
        'tip_on_1': 'TIP ON 1',
        'tip_on_2': 'TIP ON 2',
        'tip_on_3': 'TIP ON 3'
      };
      resolvedName = defaults[varName] || defaults[cleanKey] || varName.replace(/_/g, ' ');
    }
  }

  const normResolved = normalizeStockName(resolvedName);
  if (!normResolved) return { resolvedName: '', stockItem: null };

  // 1. Exact match on nama
  let found = stock.find(s => normalizeStockName(s.nama) === normResolved);

  // 2. Fuzzy match — prefer shortest matching nama
  if (!found) {
    const candidates = stock.filter(s => {
      const normStock = normalizeStockName(s.nama);
      if (!normStock) return false;
      return normStock.includes(normResolved) || normResolved.includes(normStock);
    });
    if (candidates.length) {
      found = candidates.sort((a, b) => (a.nama?.length || 0) - (b.nama?.length || 0))[0];
    }
  }
  
  return {
    resolvedName: String(resolvedName),
    stockItem: found || null
  };
}

/**
 * Evaluates the template table rows against breakdown data and stock database.
 */
export function calculateBpbRows(processedData, spec, stock, bpbTemplate) {
  // Helper to evaluate simple variable formula in string
  const resolveStringFormula = (val) => {
    if (val === undefined || val === null || val === '') return val;
    const strVal = String(val).trim();
    if (strVal.startsWith('=')) {
      const varName = strVal.slice(1).trim();
      const cleanKey = varName.startsWith('_') ? varName.slice(1) : varName;
      const valAliasMap = buildAliasMap(spec, true);
      const resolved = valAliasMap[cleanKey] || valAliasMap[varName] || valAliasMap[varName.toLowerCase()] || valAliasMap[cleanKey.toLowerCase()];
      if (resolved !== undefined) {
        return resolved;
      }
    }
    return val;
  };

  // 1. Resolve stock codes, names and units for all rows
  const resolvedTemplate = bpbTemplate.map(row => {
    if (!row.nama_barang && (row.manual_nama === undefined || row.manual_nama === row.nama_barang)) {
      let id_barang_display = '';
      if (row.manual_id !== undefined && row.manual_id !== row.id_barang) {
        id_barang_display = resolveStringFormula(row.manual_id);
      } else {
        const rawId = String(row.id_barang || '');
        if (rawId.startsWith('=') || rawId === '…' || rawId === '...') {
          id_barang_display = '';
        } else {
          id_barang_display = rawId;
        }
      }
      return {
        ...row,
        id_barang_display,
        nama_barang_display: '',
        satuan_display: (row.manual_satuan !== undefined && row.manual_satuan !== row.satuan) ? resolveStringFormula(row.manual_satuan) : '',
        keterangan: (row.manual_keterangan !== undefined && row.manual_keterangan !== row.keterangan) ? resolveStringFormula(row.manual_keterangan) : (row.keterangan || '')
      };
    }
    
    const rawName = (row.manual_nama !== undefined && row.manual_nama !== row.nama_barang) ? row.manual_nama : row.nama_barang;
    const { resolvedName, stockItem } = resolveStockItem(rawName, spec, stock);
    
    const hasManualId = row.manual_id !== undefined && row.manual_id !== row.id_barang;
    const hasManualSatuan = row.manual_satuan !== undefined && row.manual_satuan !== row.satuan;

    const id_barang_display = hasManualId
      ? resolveStringFormula(row.manual_id)
      : getStockKode(stockItem);
      
    const nama_barang_display = (row.manual_nama !== undefined && row.manual_nama !== row.nama_barang)
      ? resolveStringFormula(row.manual_nama)
      : (stockItem?.nama || resolvedName);
      
    const satuan_display = hasManualSatuan
      ? resolveStringFormula(row.manual_satuan)
      : getStockSatuan(stockItem);
      
    const keterangan_display = (row.manual_keterangan !== undefined && row.manual_keterangan !== row.keterangan)
      ? resolveStringFormula(row.manual_keterangan)
      : row.keterangan;
      
    return {
      ...row,
      id_barang_display,
      nama_barang_display,
      satuan_display,
      keterangan: keterangan_display
    };
  });

  // 2. Pre-calculate hardware aggregates
  const totalMinifix = processedData.reduce((sum, d) => sum + (Number(d.hardware?.minifix) || 0), 0);
  const totalDowel = processedData.reduce((sum, d) => sum + (Number(d.hardware?.dowel) || 0), 0);

  // Helper for Rel / Engsel SUMIF
  const getRelSum = (targetNameOrCode) => {
    const { resolvedName, stockItem } = resolveStockItem(targetNameOrCode, spec, stock);
    const targetCode = getStockKode(stockItem);
    
    return processedData.reduce((sum, d) => {
      const dRel = String(d.rel || '').trim().toLowerCase();
      const matches = dRel === String(targetCode).toLowerCase() || 
                      dRel === resolvedName.toLowerCase() ||
                      dRel === String(targetNameOrCode).toLowerCase();
      return sum + (matches ? (Number(d.hardware?.rel) || 0) : 0);
    }, 0);
  };

  const getEngselSum = (targetNameOrCode) => {
    const { resolvedName, stockItem } = resolveStockItem(targetNameOrCode, spec, stock);
    const targetCode = getStockKode(stockItem);
    
    return processedData.reduce((sum, d) => {
      const dEngsel = String(d.engsel || '').trim().toLowerCase();
      const matches = dEngsel === String(targetCode).toLowerCase() || 
                      dEngsel === resolvedName.toLowerCase() ||
                      dEngsel === String(targetNameOrCode).toLowerCase();
      return sum + (matches ? (Number(d.hardware?.engsel) || 0) : 0);
    }, 0);
  };

  // Helper for Profile SUMIF (keliling / p_gross / qty)
  const getProfileSum = (profilCol, targetNameOrCode, valCol) => {
    const { resolvedName, stockItem } = resolveStockItem(targetNameOrCode, spec, stock);
    const targetCode = getStockKode(stockItem);
    
    return processedData.reduce((sum, d) => {
      const dProf = String(d[profilCol] || '').trim().toLowerCase();
      const matches = dProf === String(targetCode).toLowerCase() || 
                      dProf === resolvedName.toLowerCase() ||
                      dProf === String(targetNameOrCode).toLowerCase();
      if (matches) {
        if (valCol === '_2PL') {
          return sum + (Number(d.keliling) || 0);
        } else if (valCol === 'P') {
          return sum + (Number(d.p_gross) || 0);
        } else if (valCol === 'jumlah_pemakaian') {
          return sum + (Number(d.qty_total) || 0);
        }
      }
      return sum;
    }, 0);
  };

  // Helper for Edging anodizeh / anodizev SUMIF (keliling / p_gross / qty)
  const getAnodizeSum = (anodizeCol, targetNameOrCode, valCol) => {
    const { resolvedName, stockItem } = resolveStockItem(targetNameOrCode, spec, stock);
    const targetCode = getStockKode(stockItem);
    
    return processedData.reduce((sum, d) => {
      const dAnodize = String(d[anodizeCol] || '').trim().toLowerCase();
      const matches = dAnodize === String(targetCode).toLowerCase() || 
                      dAnodize === resolvedName.toLowerCase() ||
                      dAnodize === String(targetNameOrCode).toLowerCase();
      if (matches) {
        if (valCol === '_2PL') {
          return sum + (Number(d.keliling) || 0);
        } else if (valCol === 'P') {
          return sum + (Number(d.p_gross) || 0);
        } else if (valCol === 'jumlah_pemakaian') {
          return sum + (Number(d.qty_total) || 0);
        }
      }
      return sum;
    }, 0);
  };

  // Cache to store evaluated quantities of previous rows for cell references like D55, D126
  const calculatedQtyCacheByRowIdx = {};

  return resolvedTemplate.map((row) => {
    let qty = 0;
    const rIdx = row.row_idx; // 1-indexed spreadsheet row number

    if (!row.nama_barang && row.manual_nama === undefined) {
      const displayVal = row.manual_jml !== undefined ? evaluateReportFormula(row.manual_jml, spec) : '';
      calculatedQtyCacheByRowIdx[rIdx] = Number(displayVal) || 0;
      return { 
        ...row, 
        jml_display: displayVal 
      };
    }

    const rawName = (row.manual_nama !== undefined && row.manual_nama !== row.nama_barang) ? row.manual_nama : row.nama_barang;

    if (row.manual_jml !== undefined && row.manual_jml !== null && row.manual_jml !== '' && row.manual_jml !== row.jml_formula) {
      const calcSourceResult = resolveCalcSource(row.manual_jml, processedData);
      if (calcSourceResult !== undefined && typeof calcSourceResult === 'number') {
        qty = calcSourceResult;
      } else {
        qty = evaluateReportFormula(row.manual_jml, spec);
      }
    } else {
      const varName = rawName.startsWith('=') ? rawName.slice(1).trim() : rawName;
      const cleanKey = varName.startsWith('_') ? varName.slice(1) : varName;

      // Evaluate quantity based on row formulas and variables
      if (varName === 'minifix_hettich') {
        qty = Math.ceil(totalMinifix * 1.05);
      } else if (varName === 'dowelØ8') {
        qty = Math.ceil(totalDowel * 1.05);
      } else if (varName === 'LAKBAN KERTAS') {
        const sikaflexVal = calculatedQtyCacheByRowIdx[17] || 0;
        const maxbondVal = calculatedQtyCacheByRowIdx[18] || 0;
        qty = Math.ceil(sikaflexVal + maxbondVal);
      } else if (rawName === 'SILICONE SIKAFLEX 221 PUTIH' || row.id_barang === '206603') {
        // Sikaflex or Max Bond
        const sumProfil3 = processedData.reduce((sum, d) => {
          const dProf3 = String(d.profil3 || '').trim().toLowerCase();
          const matches = dProf3.includes('sikaflex') && rawName.toLowerCase().includes('sikaflex') || 
                          dProf3.includes('max bond') && rawName.toLowerCase().includes('max bond');
          return sum + (matches ? (Number(d.keliling) || 0) : 0);
        }, 0);
        const sumProfil2 = processedData.reduce((sum, d) => {
          const dProf2 = String(d.profil2 || '').trim().toLowerCase();
          const matches = dProf2.includes('sikaflex') && rawName.toLowerCase().includes('sikaflex') || 
                          dProf2.includes('max bond') && rawName.toLowerCase().includes('max bond');
          return sum + (matches ? (Number(d.p_gross) || 0) : 0);
        }, 0);
        qty = Math.ceil((sumProfil3 / 12) + (sumProfil2 / 12));
      } else if (cleanKey.startsWith('rel') || varName === 'bb_full_50') {
        qty = getRelSum(rawName);
      } else if (varName.startsWith('tip_on_')) {
        qty = 0; // standard template quantity 0
      } else if (varName.startsWith('engsel')) {
        qty = getEngselSum(rawName);
      } else if (varName === 'wl77_2pintu') {
        const { resolvedName } = resolveStockItem(rawName, spec, stock);
        qty = processedData.reduce((sum, d) => {
          const dEngsel = String(d.engsel || '').trim().toLowerCase();
          const matches = dEngsel === resolvedName.toLowerCase();
          return sum + (matches ? (Number(d.qty_total) || 0) : 0);
        }, 0);
      } else if (varName === 'wl77_ra' || varName === 'wl77_rb') {
        const wl77Qty = calculatedQtyCacheByRowIdx[55] || 0;
        qty = wl77Qty / 2;
      } else if (varName === 'wl230_4pintu' || varName === 'wl230_ra') {
        qty = 0;
      } else if (varName.startsWith('edgingkab') || varName.startsWith('edging')) {
        // Edging
        const isHorizontal = row.jml_formula && row.jml_formula.includes('anodizeh');
        const anodizeCol = isHorizontal ? 'h' : 'v';
        const sum = getAnodizeSum(anodizeCol, rawName, '_2PL');
        qty = Math.ceil(sum / 1);
      } else if (varName === 'acrylic_mled') {
        const totalLedLengthMm = processedData.reduce((sum, d) => {
          const dAnodize = String(d.anodize || '').trim().toLowerCase();
          const matches = dAnodize.includes('m-led-02') || dAnodize.includes('mled02');
          return sum + (matches ? (Number(d._p || d.p || 0) * (Number(d.qty_total) || 0)) : 0);
        }, 0);
        qty = totalLedLengthMm === 0 ? 0 : Math.ceil(Math.ceil(totalLedLengthMm / 1220) * 1.1);
      } else if (varName === 'plat_join' || varName === 'roda_atas_fold_formwell' || varName === 'rel_atas_fold_formwell' || varName.startsWith('sl_56_') || varName === 'PD_blum_55' || varName.startsWith('besi astal')) {
        qty = 0;
      } else if (varName === 'sikubr') {
        const sum = getProfileSum('siku_joint', rawName, 'jumlah_pemakaian');
        qty = Math.ceil(sum * 3);
      } else if (varName === 'm_grill_01' || varName === 'camar_807' || varName === 'libra_h6' || varName === 'libra_Ch') {
        const sum = getProfileSum('siku_joint', rawName, 'jumlah_pemakaian');
        qty = Math.ceil(sum);
      } else if (varName.startsWith('prof_pintu_') || varName === 'Prof_pintu_3') {
        if (rIdx === 126) { // Row 126 is Prof_pintu_3 (pcs)
          const sum = getProfileSum('profil3', rawName, 'jumlah_pemakaian');
          qty = Math.ceil(sum * 4);
        } else {
          let profilCol = 'profil';
          if (rawName.toLowerCase().includes('pintu_2')) profilCol = 'profil2';
          if (rawName.toLowerCase().includes('pintu_3')) profilCol = 'profil3';
          const sum = getProfileSum(profilCol, rawName, '_2PL');
          qty = Math.ceil(sum / 2.2);
        }
      } else if (rawName.includes('Profil CNC R5')) {
        qty = calculatedQtyCacheByRowIdx[126] || 0; // equal to row 126
      } else if (varName.startsWith('prof_cor_')) {
        let profilCol = 'profil';
        if (varName.includes('cor_2')) profilCol = 'profil2';
        if (varName.includes('cor_3')) profilCol = 'profil3';
        const sum = getProfileSum(profilCol, rawName, 'P');
        qty = Math.ceil(sum / 2.2);
        if (varName.includes('cor_3')) qty = qty * 2;
      } else if (varName.startsWith('prof_panel_')) {
        let profilCol = 'profil';
        if ((row.jml_formula && row.jml_formula.includes('profil_3')) || varName.includes('panel_1')) profilCol = 'profil3';
        if ((row.jml_formula && row.jml_formula.includes('profil_2')) || varName.includes('panel_2')) profilCol = 'profil2';
        if ((row.jml_formula && row.jml_formula.includes('profil)')) || varName.includes('panel_3')) profilCol = 'profil';
        
        const sum = getProfileSum(profilCol, rawName, 'P');
        qty = Math.ceil(sum / 2.2);
      } else if (varName.startsWith('prof_pl_')) {
        let profilCol = 'profil';
        if (varName.includes('pl_2')) profilCol = 'profil2';
        if (varName.includes('pl_3')) profilCol = 'profil3';
        
        if (varName.includes('pl_3')) {
          const sum = getProfileSum('profil3', rawName, '_2PL');
          qty = Math.ceil(sum / 2.2);
        } else {
          const sum = getProfileSum(profilCol, rawName, 'P');
          qty = Math.ceil(sum / 2.35);
        }
      }
    }

    calculatedQtyCacheByRowIdx[rIdx] = qty;

    // HPL sheets are kept blank as in template unless manually overridden
    const isHplSheetRow = rIdx >= 78 && rIdx <= 82;

    return {
      ...row,
      jml_display: (isHplSheetRow && row.manual_jml === undefined) ? '' : qty
    };
  });
}
