/**
 * Migrate template data from Excel "Breakdown" sheet rows 169-198 to PostgreSQL.
 * Row 169 = modul, rows 170-198 = template_parts.
 *
 * Formula adaptation:
 *   Excel column → Visual column: J→I(p), L→J(l), N→K(t), P→L(sub), Q→M(jml), S→O(t_bhn)
 *   Row: modul=1, template = oldRow - 168
 *   Defined names/cross-sheet references kept as-is.
 *
 * Usage: node scripts/migrate_excel_template.js
 */

const XLSX = require('xlsx');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getClient } = require('../src/db');

const EXCEL_FILE = path.join(__dirname, '../../master rekap 2026_Bom.xlsx');

// Excel→Visual column mapping (for cell references in formulas)
const COL_MAP = {
  J: 'I', L: 'J', N: 'K', P: 'L', Q: 'M',
  R: 'N', S: 'O', T: 'P', U: 'Q',
  Z: 'R', AA: 'S', AB: 'T', AC: 'U',
};

const colToVisual = (col) => COL_MAP[col] || col;

function cellAddress(colLetter, row) {
  return colLetter + row;
}

function getCellVal(ws, col, row) {
  const addr = cellAddress(col, row);
  const cell = ws[addr];
  return cell ? cell.v : null;
}

function getCellFormulaOrVal(ws, col, row) {
  const addr = cellAddress(col, row);
  const cell = ws[addr];
  if (!cell) return null;
  if (cell.f) {
    return '=' + cell.f;
  }
  return cell.v;
}

function getCellValue(ws, col, row) {
  const addr = cellAddress(col, row);
  const cell = ws[addr];
  return cell ? cell.v : null;
}

function adaptFormula(formula, oldRow) {
  if (!formula || !String(formula).startsWith('=')) return formula;
  return String(formula).replace(/([A-Z]{1,2})(\d+)/g, (m, col, row) => {
    const vc = colToVisual(col);
    const nr = parseInt(row) === 169 ? 1 : parseInt(row) - 168;
    return vc + nr;
  });
}

function readExcel() {
  console.log('Reading:', EXCEL_FILE);
  const wb = XLSX.readFile(EXCEL_FILE, { cellFormula: true });
  const ws = wb.Sheets['Breakdown'];
  if (!ws) throw new Error('Sheet "Breakdown" not found');
  return ws;
}

function buildModul(ws) {
  const R = 169;
  return {
    produk: getCellVal(ws, 'H', R) || '',
    keterangan: getCellVal(ws, 'H', R) || '',
    p: getCellVal(ws, 'J', R) || null,
    l: getCellVal(ws, 'L', R) || null,
    t: getCellVal(ws, 'N', R) || null,
    jml: getCellVal(ws, 'Q', R) || 1,
  };
}

function buildTemplateRows(ws) {
  const rows = [];
  for (let oldRow = 170; oldRow <= 198; oldRow++) {
    const type = getCellVal(ws, 'C', oldRow);
    const komp = getCellVal(ws, 'H', oldRow);

    // Skip empty/separator rows
    if ((!type || String(type).trim() === '') && (!komp || String(komp).trim() === '')) {
      continue;
    }

    const newRow = oldRow - 168;

    const pRaw = getCellFormulaOrVal(ws, 'J', oldRow);
    const lRaw = getCellFormulaOrVal(ws, 'L', oldRow);
    const tRaw = getCellFormulaOrVal(ws, 'N', oldRow);
    const subRaw = getCellFormulaOrVal(ws, 'P', oldRow);
    const jmlRaw = getCellFormulaOrVal(ws, 'Q', oldRow);

    // sub: use evaluated value; system auto-populates from part lookup
    const subVal = getCellValue(ws, 'P', oldRow);

    rows.push({
      type: String(type || 'prt').trim(),
      komp: String(komp || '').trim(),
      p: adaptFormula(pRaw, oldRow),
      l: adaptFormula(lRaw, oldRow),
      t: adaptFormula(tRaw, oldRow),
      sub: subVal != null ? Number(subVal) : 1,
      jml: adaptFormula(jmlRaw, oldRow),
      urutan: oldRow - 170,
    });
  }
  return rows;
}

async function migrate() {
  const ws = readExcel();
  const modulData = buildModul(ws);
  const templateRows = buildTemplateRows(ws);

  console.log(`\nModul: "${modulData.produk}"`);
  console.log(`   p=${modulData.p} | l=${modulData.l} | t=${modulData.t} | jml=${modulData.jml}`);
  console.log(`Template parts: ${templateRows.length} rows`);
  templateRows.forEach((r, i) => {
    const pStr = r.p != null ? String(r.p) : '';
    const lStr = r.l != null ? String(r.l) : '';
    const tStr = r.t != null ? String(r.t) : '';
    const jStr = r.jml != null ? String(r.jml) : '';
    console.log(`   ${i+1}. [${r.type}] ${r.komp}: p=${pStr} | l=${lStr} | t=${tStr} | sub=${r.sub} | jml=${jStr}`);
  });

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Insert modul (standalone kodifikasi, no project_id)
    const modulId = uuidv4();
    await client.query(`
      INSERT INTO moduls (id, produk, keterangan, p, l, t, jml)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      modulId, modulData.produk, modulData.keterangan,
      modulData.p, modulData.l, modulData.t, modulData.jml,
    ]);
    console.log(`\nModul created: ${modulId}`);

    // Insert sub_modul
    const subModulId = uuidv4();
    await client.query(`
      INSERT INTO sub_moduls (id, modul_id, name, urutan)
      VALUES ($1, $2, $3, $4)
    `, [subModulId, modulId, 'Default Template', 0]);
    console.log(`Sub-modul created: ${subModulId}`);

    // Insert template_parts
    let inserted = 0;
    for (const row of templateRows) {
      const partId = uuidv4();
      await client.query(`
        INSERT INTO template_parts (
          id, sub_modul_id, modul_id, type, komp,
          p, l, t, sub, jml, urutan
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        partId, subModulId, modulId,
        row.type, row.komp,
        row.p != null ? String(row.p) : null,
        row.l != null ? String(row.l) : null,
        row.t != null ? String(row.t) : null,
        row.sub,
        row.jml != null ? String(row.jml) : '1',
        row.urutan,
      ]);
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`\nMigration complete! 1 modul + ${inserted} template_parts inserted.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
