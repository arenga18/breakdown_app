const { pool } = require('../breakdown-backend/src/db/index');

async function inspect() {
  try {
    const res = await pool.query("SELECT value FROM app_settings WHERE key = 'tplSections'");
    if (res.rows.length > 0) {
      const sections = res.rows[0].value;
      const sec = sections.find(s => s.name === 'Spesifikasi frame Alu');
      console.log("Spesifikasi frame Alu rows in DB tplSections:");
      console.log(JSON.stringify(sec ? sec.rows : null, null, 2));
    } else {
      console.log("No tplSections found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
