import { pool } from '../breakdown-backend/src/db/index.js';
import { initialState } from '../src/initialState.js';

async function compare() {
  try {
    const res = await pool.query("SELECT value FROM app_settings WHERE key = 'tplSections'");
    if (res.rows.length === 0) {
      console.log("No DB tplSections found.");
      return;
    }
    const dbSections = res.rows[0].value;
    const localSections = initialState.tplSections;

    console.log("Comparing DB tplSections and initialState.tplSections...");
    localSections.forEach(localSec => {
      const dbSec = dbSections.find(s => s.name === localSec.name);
      if (!dbSec) {
        console.log(`Section [${localSec.name}] missing in DB.`);
        return;
      }
      localSec.rows.forEach((localRow, ri) => {
        const dbRow = dbSec.rows[ri];
        if (!dbRow) {
          console.log(`  Row index ${ri} missing in DB for section [${localSec.name}]. Local: ${JSON.stringify(localRow)}`);
          return;
        }
        if (localRow.label !== dbRow.label || localRow.alias !== dbRow.alias || localRow.source !== dbRow.source) {
          console.log(`  Mismatch at section [${localSec.name}] row ${ri}:`);
          console.log(`    Local: label="${localRow.label}", alias="${localRow.alias}", source="${localRow.source}"`);
          console.log(`    DB:    label="${dbRow.label}", alias="${dbRow.alias}", source="${dbRow.source}"`);
        }
      });
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

compare();
