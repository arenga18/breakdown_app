const { pool } = require('../breakdown-backend/src/db/index');

async function inspect() {
  try {
    const res = await pool.query('SELECT speks FROM projects LIMIT 1');
    if (res.rows.length > 0) {
      const speks = res.rows[0].speks;
      console.log("IsArray:", Array.isArray(speks));
      console.log("Keys:", Object.keys(speks));
      if (Array.isArray(speks)) {
        console.log("First element keys:", Object.keys(speks[0] || {}));
        console.log("First element kodes:", speks[0].kodes);
      } else {
        console.log("Speks kodes:", speks.kodes);
      }
    } else {
      console.log("No projects found.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
