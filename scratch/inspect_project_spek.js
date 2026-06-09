const { pool } = require('../breakdown-backend/src/db/index');

async function inspect() {
  try {
    const res = await pool.query('SELECT speks FROM projects LIMIT 1');
    if (res.rows.length > 0) {
      const speks = res.rows[0].speks;
      console.log("PROJECT SPEKS:", JSON.stringify(speks, null, 2));
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
