const fs = require('fs');
const path = require('path');

async function run() {
  const bpbPath = path.join(__dirname, '../src/utils/bpb_setting_full.json');
  const bomPath = path.join(__dirname, '../src/utils/bom_setting_full.json');

  // Read BPB JSON
  let bpbText = fs.readFileSync(bpbPath, 'utf8');
  // Replace "=_rel1" to "=rel1" etc.
  bpbText = bpbText.replace(/"nama_barang": "=\_rel(\d+)"/g, '"nama_barang": "=rel$1"');
  fs.writeFileSync(bpbPath, bpbText, 'utf8');
  console.log("Updated bpb_setting_full.json");

  // Read BOM JSON
  let bomText = fs.readFileSync(bomPath, 'utf8');
  bomText = bomText.replace(/"nama_barang": "=\_rel(\d+)"/g, '"nama_barang": "=rel$1"');
  fs.writeFileSync(bomPath, bomText, 'utf8');
  console.log("Updated bom_setting_full.json");

  // Re-seed into the database
  const { pool } = require('../breakdown-backend/src/db/index');
  try {
    const bpbData = JSON.parse(bpbText);
    const bomData = JSON.parse(bomText);

    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, ['bpb_setting_default', JSON.stringify(bpbData)]);
    console.log("Successfully seeded updated 'bpb_setting_default' in app_settings.");

    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, ['bom_setting_default', JSON.stringify(bomData)]);
    console.log("Successfully seeded updated 'bom_setting_default' in app_settings.");

  } catch (err) {
    console.error("Database seed error:", err);
  } finally {
    await pool.end();
  }
}

run();
