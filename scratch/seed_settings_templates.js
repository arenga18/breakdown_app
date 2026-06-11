const fs = require('fs');
const path = require('path');
const { pool } = require('../breakdown-backend/src/db/index');

async function run() {
  try {
    const bpbPath = path.join(__dirname, '../src/utils/bpb_setting_full.json');
    const bomPath = path.join(__dirname, '../src/utils/bom_setting_full.json');

    const bpbData = JSON.parse(fs.readFileSync(bpbPath, 'utf8'));
    const bomData = JSON.parse(fs.readFileSync(bomPath, 'utf8'));

    console.log(`Read ${bpbData.length} BPB rows.`);
    console.log(`Read ${bomData.length} BOM rows.`);

    // Insert BPB Template
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, ['bpb_setting_default', JSON.stringify(bpbData)]);
    console.log("Successfully seeded 'bpb_setting_default' in app_settings.");

    // Insert BOM Template
    await pool.query(`
      INSERT INTO app_settings (key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `, ['bom_setting_default', JSON.stringify(bomData)]);
    console.log("Successfully seeded 'bom_setting_default' in app_settings.");

  } catch (err) {
    console.error("Error seeding settings templates:", err);
  } finally {
    await pool.end();
  }
}

run();
