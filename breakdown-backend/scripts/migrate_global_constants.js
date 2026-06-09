/**
 * Migrate global constants from Data Validation sheet (rows 1079-1204)
 * to app_settings with key='globalConstants'.
 *
 * Run: node scripts/migrate_global_constants.js
 */

const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getClient } = require('../src/db');

const EXCEL_FILE = path.join(__dirname, '../../master rekap 2026_Bom.xlsx');

function readDataValidation() {
  const wb = XLSX.readFile(EXCEL_FILE);
  const ws = wb.Sheets['Data Validation'];
  if (!ws) throw new Error('Sheet "Data Validation" not found');

  const constants = {};

  for (let r = 1079; r <= 1204; r++) {
    const name = ws['B' + r]?.v;
    const val = ws['D' + r]?.v;
    const desc = ws['C' + r]?.v || '';

    if (!name) continue;

    // Skip rows without a numeric value (e.g. paper on row 1199)
    if (val === undefined || val === null || val === '') {
      console.log(`  SKIP ${r}: ${name} (${desc}) — no value`);
      continue;
    }

    constants[name] = Number(val);
  }

  return constants;
}

async function migrate() {
  console.log('Reading Data Validation sheet...');
  const constants = readDataValidation();

  console.log(`\nFound ${Object.keys(constants).length} constants:`);
  const entries = Object.entries(constants);
  entries.forEach(([k, v], i) => {
    console.log(`  ${i + 1}. ${k} = ${v}`);
  });

  const client = await getClient();
  try {
    const result = await client.query(`
      INSERT INTO app_settings (key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      RETURNING *
    `, ['globalConstants', JSON.stringify(constants)]);

    console.log(`\nSaved to app_settings (key=globalConstants): ${result.rows[0].key}`);
  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
