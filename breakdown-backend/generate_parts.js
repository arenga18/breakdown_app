require('dotenv').config();
const XLSX = require('xlsx');
const fs = require('fs');
const { getClient } = require('./src/db');

function translateExcelFormula(formulaClean) {
  // Remove whitespace
  let f = formulaClean.replace(/\s+/g, '');

  // Strip leading '=' or '+'
  f = f.replace(/^=/, '');
  f = f.replace(/^\+/, '');

  // Translate cell references
  f = f.replace(/Spek!\$B\$42/g, 'finishing_kabinet1');
  f = f.replace(/Spek!B42/g, 'finishing_kabinet1');

  f = f.replace(/Spek!\$A\$35/g, 'lap_blk_pintu');
  f = f.replace(/Spek!A35/g, 'lap_blk_pintu');

  f = f.replace(/Spek!\$A\$36/g, 'lap_inv_kab');
  f = f.replace(/Spek!A36/g, 'lap_inv_kab');

  f = f.replace(/Spek!\$A\$37/g, 'lap_pintu_mlp');
  f = f.replace(/Spek!A37/g, 'lap_pintu_mlp');

  f = f.replace(/Spek!\$D\$17/g, 'bahan1');
  f = f.replace(/Spek!D17/g, 'bahan1');

  // Replace comparison with 0 to Polos (since lap_inv_kab value is 'Polos')
  f = f.replace(/lap_inv_kab=0/g, 'lap_inv_kab=Polos');

  // Replace relative cell coordinates from same row
  f = f.replace(/W\d+/g, 'l');
  f = f.replace(/X\d+/g, 'd');

  return '=' + f;
}

async function main() {
  console.log('Reading Excel file...');
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
    'TBLK': 'TBLK',
    'lap_blk_pintu': 'lap_blk_pintu',
    'lap_inv_kab': 'lap_inv_kab',
    'lap_pintu_mlp': 'lap_pintu_mlp',
    'tbl_komp_laci': 'TLACI',

    // Address strings
    'Spek!$D$28': 'TKAB',
    'Spek!D28': 'TKAB',
    'Spek!$D$29': 'TLACI',
    'Spek!D29': 'TLACI',
    'Spek!$D$30': 'TBLK',
    'Spek!D30': 'TBLK',
    'Spek!$D$31': 'TSS',
    'Spek!D31': 'TSS',
    'Spek!$D$32': 'TW',
    'Spek!D32': 'TW',

    'Spek!$A$35': 'lap_blk_pintu',
    'Spek!A35': 'lap_blk_pintu',
    'Spek!$A$36': 'lap_inv_kab',
    'Spek!A36': 'lap_inv_kab',
    'Spek!$A$37': 'lap_pintu_mlp',
    'Spek!A37': 'lap_pintu_mlp',
  };

  const parts = [];

  console.log('Parsing ' + data.length + ' rows...');
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

        // Translate complex formulas
        const translated = translateExcelFormula(cell.f);
        part[targetField] = translated;

        // Extract references for spekRefs mapping
        const knownRefs = ['bahan1', 'lap_inv_kab', 'lap_blk_pintu', 'lap_pintu_mlp', 'finishing_kabinet1'];
        knownRefs.forEach(r => {
          if (translated.includes(r)) {
            part.spekRefs[targetField] = r;
          }
        });
        return;
      }

      if (cell.v !== undefined && cell.v !== null) {
        part[targetField] = cell.v;
      }
    };

    // Map columns
    parseCell('A', 'code', false);
    parseCell('C', 'name', false);
    parseCell('E', 'ks', false);
    parseCell('F', 'ket', false);
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

    // Default numeric quantities from types
    part.q_minifix = part.minifix ? 1 : 0;
    part.q_dowel = part.dowel ? 1 : 0;
    part.q_engsel = part.engsel ? 1 : 0;
    part.q_rel = part.rel ? 1 : 0;

    // Clean empty values
    if (part.jml === undefined || part.jml === null || part.jml === '') part.jml = 1;
    if (part.opt === undefined || part.opt === null || part.opt === '') part.opt = 1;

    parts.push(part);
  }

  console.log('Writing partsData.js in frontend src...');
  const partsCode = `export const parts = ${JSON.stringify(parts, null, 2)};\n`;
  fs.writeFileSync('../src/partsData.js', partsCode);
  console.log('✓ partsData.js successfully generated.');

  console.log('Synchronizing new parts into PostgreSQL database...');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM parts');
    let count = 0;
    for (const p of parts) {
      await client.query(
        'INSERT INTO parts (val, name, code, ks, lap_luar, edg, alias, opt, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          String(p.val || ''),
          p.name || '',
          p.code || '',
          p.ks || '',
          String(p.lap_luar || ''),
          String(p.edg_p1 || p.edg || ''),
          String(p.val || ''),
          typeof p.opt === 'number' ? p.opt : 0,
          JSON.stringify({
            opt: p.opt, type: p.type, name: p.name, val: p.val, code: p.code, jml: p.jml, bhn: p.bhn, t: p.t,
            tipe_siku: p.tipe_siku, tipe_screw: p.tipe_screw,
            v: p.v, v2: p.v2, h: p.h, profil3: p.profil3, profil2: p.profil2, profil: p.profil,
            l: p.l, d: p.d, p1: p.p1, p2: p.p2, l1: p.l1, l2: p.l2,
            lap_luar: p.lap_luar, lap_dalam: p.lap_dalam,
            edg_p1: p.edg_p1, edg_p2: p.edg_p2, edg_l1: p.edg_l1, edg_l2: p.edg_l2,
            q_engsel: p.q_engsel, q_rel: p.q_rel, q_dormec: p.q_dormec,
            q_minifix: p.q_minifix, q_dowel: p.q_dowel, spekRefs: p.spekRefs,
            ks: p.ks, rel: p.rel, engsel: p.engsel, anodize: p.anodize, q_anodize: p.q_anodize,
            p_val: p.p_val, l_val: p.l_val, q_siku: p.q_siku, q_screw: p.q_screw
          })
        ]
      );
      count++;
    }
    await client.query('COMMIT');
    console.log('✓ Successfully synchronized ' + count + ' parts to Postgres database.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during PostgreSQL seeding:', err);
  } finally {
    client.release();
  }

  console.log('Done.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
