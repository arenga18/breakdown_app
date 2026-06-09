/**
 * Migrate BOM sheet template from src/utils/bom_setting_full.json
 * to app_settings with key='bomSettingTemplate'.
 *
 * Drops existing row first, then inserts fresh data.
 *
 * Run: node scripts/migrate_bom_setting.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getClient } = require('../src/db');

const BOM_JSON = path.join(__dirname, '../../src/utils/bom_setting_full.json');
const SETTING_KEY = 'bomSettingTemplate';

function readBomSetting() {
  const raw = fs.readFileSync(BOM_JSON, 'utf8');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) {
    throw new Error('bom_setting_full.json must be a JSON array');
  }
  return rows;
}

async function migrate() {
  const rows = readBomSetting();
  console.log(`Read ${rows.length} rows from ${BOM_JSON}`);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const deleted = await client.query(
      'DELETE FROM app_settings WHERE key = $1 RETURNING key',
      [SETTING_KEY]
    );
    console.log(deleted.rowCount
      ? `Dropped existing app_settings key: ${SETTING_KEY}`
      : `No existing app_settings key: ${SETTING_KEY}`);

    const inserted = await client.query(
      `INSERT INTO app_settings (key, value) VALUES ($1, $2) RETURNING key, updated_at`,
      [SETTING_KEY, JSON.stringify(rows)]
    );

    await client.query('COMMIT');
    console.log(`Inserted ${rows.length} rows → app_settings (${SETTING_KEY})`);
    console.log(`Updated at: ${inserted.rows[0].updated_at}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
