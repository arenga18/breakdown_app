/**
 * Migrate setup items from Spek sheet rows 234-522 to setup_items table.
 * Mapping: D → name, E → no, G → ks
 *
 * Run: node scripts/migrate_setup_items.js
 */

const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getClient } = require('../src/db');

const EXCEL_FILE = path.join(__dirname, '../../master rekap 2026_Bom.xlsx');

function readSetupItems() {
  const wb = XLSX.readFile(EXCEL_FILE);
  const ws = wb.Sheets['Spek'];
  if (!ws) throw new Error('Sheet "Spek" not found');

  const items = [];
  for (let r = 234; r <= 522; r++) {
    const name = ws['D' + r]?.v;
    const no = ws['E' + r]?.v;
    const ks = ws['G' + r]?.v;
    if (name) {
      items.push({
        name: String(name).trim(),
        no: no != null ? String(no).trim() : '',
        ks: ks != null ? String(ks).trim() : '',
      });
    }
  }
  return items;
}

async function migrate() {
  const items = readSetupItems();
  console.log(`Found ${items.length} setup items`);

  const client = await getClient();
  try {
    // Delete existing setup_items and re-insert
    await client.query('DELETE FROM setup_items');
    console.log('Cleared existing setup_items');

    let i = 0;
    for (const item of items) {
      await client.query(
        'INSERT INTO setup_items (name, no, ks, urutan) VALUES ($1, $2, $3, $4)',
        [item.name, item.no, item.ks, i]
      );
      i++;
    }

    console.log(`Inserted ${i} setup_items`);
  } catch (err) {
    console.error('Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });
