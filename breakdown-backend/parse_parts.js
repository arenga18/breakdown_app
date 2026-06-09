const XLSX = require('xlsx');
const fs = require('fs');

const wb = XLSX.readFile('../master rekap 2026_Bom.xlsx');
const sheet = wb.Sheets['Data Validation'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const friendlyNames = {
  // Defined Name strings directly
  'bahan1': 'bahan1',
  'bahan2': 'bahan2',
  'bahan3': 'bahan3',
  'bahan4': 'bahan4',
  'TKAB': 'TKAB',
  'TLACI': 'TLACI',
  'lap_inv_kab': 'lap_inv_kab',
  'tip_lap_inv': 'tip_lap_inv',
  'edging1': 'edging1',
  'edging2': 'edging2',
  'edging3': 'edging3',
  'edging4': 'edging4',

  // Address strings
  'Spek!$A$15': 'TKAB',
  'Spek!$A$16': 'TLACI',
  'Spek!$A$32': 'bahan1',
  'Spek!$A$33': 'bahan2',
  'Spek!$A$34': 'bahan3',
  'Spek!$A$35': 'bahan4',
  'Spek!$A$36': 'lap_inv_kab',
  'Spek!$A$37': 'tip_lap_inv',
  'Spek!$A$38': 'edging1',
  'Spek!$A$39': 'edging2',
  'Spek!$A$40': 'edging3',
  'Spek!$A$41': 'edging4',
  'Spek!A15': 'TKAB',
  'Spek!A16': 'TLACI',
  'Spek!A32': 'bahan1',
  'Spek!A33': 'bahan2',
  'Spek!A34': 'bahan3',
  'Spek!A35': 'bahan4',
  'Spek!A36': 'lap_inv_kab',
  'Spek!A37': 'tip_lap_inv',
  'Spek!A38': 'edging1',
  'Spek!A39': 'edging2',
  'Spek!A40': 'edging3',
  'Spek!A41': 'edging4',
};

const parts = [];

for (let r = 7; r < data.length; r++) {
  const rowNum = r + 1;
  const codeVal = sheet['B' + rowNum]?.v;
  if (!codeVal) continue;
  const codeStr = codeVal.toString().trim();
  if (codeStr !== 'Parts' && codeStr !== 'Prt') {
    continue;
  }

  const valCell = sheet['D' + rowNum];
  if (!valCell || typeof valCell.v !== 'number' || valCell.v < 100) {
    continue;
  }

  const part = {
    opt: 1,
    type: 'prt',
    name: '',
    val: valCell.v,
    code: '',
    jml: 1,
    bhn: '',
    t: '',
    tipe_siku: '',
    tipe_screw: '',
    v: '',
    v2: '',
    h: '',
    profil3: '',
    profil2: '',
    profil: '',
    l: 0,
    d: 0,
    p1: 0,
    p2: 0,
    l1: 0,
    l2: 0,
    lap_luar: '',
    lap_dalam: '',
    edg_p1: '',
    edg_p2: '',
    edg_l1: '',
    edg_l2: '',
    q_engsel: 0,
    q_rel: 0,
    q_dormec: 0,
    q_minifix: 0,
    q_dowel: 0,
    ks: '',
    rel: '',
    engsel: '',
    anodize: '',
    q_anodize: 0,
    p_val: 0,
    l_val: 0,
    q_siku: 0,
    q_screw: 0,
    spekRefs: {},
  };

  // Helper to extract a cell with formula lookup
  const parseCell = (colLetter, targetField, isFormulaField = true) => {
    const addr = colLetter + rowNum;
    const cell = sheet[addr];
    if (!cell) return;

    if (isFormulaField && cell.f) {
      const formulaClean = cell.f.replace(/\s/g, '');
      const alias = friendlyNames[formulaClean];
      if (alias) {
        part[targetField] = '=' + alias;
        part.spekRefs[targetField] = alias;
        return;
      }
    }

    if (cell.v !== undefined && cell.v !== null) {
      part[targetField] = cell.v;
    }
  };

  // Map each column using our exact indices
  parseCell('A', 'code', false);
  parseCell('C', 'name', false);
  parseCell('E', 'ks', false);
  parseCell('F', 'ket', false); // Col F is Ket.
  parseCell('G', 'opt', false);
  parseCell('H', 'jml', false);
  
  parseCell('I', 'bhn', true);
  parseCell('J', 't', true);
  
  parseCell('K', 'minifix', false);
  parseCell('L', 'dowel', false);
  
  parseCell('O', 'tipe_siku', false);
  parseCell('P', 'tipe_screw', false);
  
  parseCell('Q', 'v', false);
  parseCell('R', 'v2', false);
  parseCell('S', 'h', false);
  
  parseCell('T', 'profil3', false);
  parseCell('U', 'profil2', false);
  parseCell('V', 'profil', false);
  
  parseCell('W', 'l', true);
  parseCell('X', 'd', true);
  parseCell('Y', 'p1', true);
  parseCell('Z', 'p2', true);
  parseCell('AA', 'l1', true);
  parseCell('AB', 'l2', true);
  
  parseCell('AD', 'rel', false);
  parseCell('AE', 'engsel', false);
  parseCell('AF', 'anodize', false);
  
  parseCell('AG', 'q_anodize', false);
  parseCell('AH', 'p_val', false);
  parseCell('AI', 'l_val', false);
  parseCell('AJ', 'q_siku', false);
  parseCell('AK', 'q_screw', false);

  // Set default values for formula/code resolved fields
  part.lap_luar = part.l;
  part.lap_dalam = part.d;
  part.edg_p1 = part.p1;
  part.edg_p2 = part.p2;
  part.edg_l1 = part.l1;
  part.edg_l2 = part.l2;

  // Let's copy spekRefs from source fields to the target fields!
  const copyRef = (src, dest) => {
    if (part.spekRefs[src]) {
      part.spekRefs[dest] = part.spekRefs[src];
    }
  };
  copyRef('l', 'lap_luar');
  copyRef('d', 'lap_dalam');
  copyRef('p1', 'edg_p1');
  copyRef('p2', 'edg_p2');
  copyRef('l1', 'edg_l1');
  copyRef('l2', 'edg_l2');

  // Let's also set q_minifix and q_dowel count defaults from strings
  part.q_minifix = part.minifix ? 1 : 0;
  part.q_dowel = part.dowel ? 1 : 0;

  // Clean empty values
  if (part.jml === undefined || part.jml === null || part.jml === '') part.jml = 1;
  if (part.opt === undefined || part.opt === null || part.opt === '') part.opt = 1;

  parts.push(part);
}

console.log('Successfully parsed ' + parts.length + ' parts.');
console.log('Sample part (index 0):', JSON.stringify(parts[0], null, 2));
console.log('Sample part (Samping WIC, index 14):', JSON.stringify(parts.find(p => p.val === 115), null, 2));
