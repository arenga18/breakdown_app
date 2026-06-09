const { pool } = require('../breakdown-backend/src/db/index');

async function run() {
  try {
    const res = await pool.query("SELECT * FROM stock LIMIT 10");
    console.log("Stock rows:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
