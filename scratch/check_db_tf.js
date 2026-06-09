const { pool } = require('../breakdown-backend/src/db/index');

async function run() {
  try {
    const res = await pool.query("SELECT * FROM categories WHERE code = 'tf'");
    console.log("Category tf row:");
    console.log(JSON.stringify(res.rows[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
