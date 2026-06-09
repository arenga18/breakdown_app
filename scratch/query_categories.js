const { pool } = require('../breakdown-backend/src/db/index');

async function main() {
  const result = await pool.query('SELECT name, code, items FROM categories');
  console.log("Categories in database:");
  for (const row of result.rows) {
    console.log(`- Code: ${row.code}, Name: ${row.name}, Items Count: ${row.items ? row.items.length : 0}`);
    if (row.code === 'tf' || row.code === 'te') {
      console.log(`  Items:`, JSON.stringify(row.items, null, 2));
    }
  }
  await pool.end();
}

main();
