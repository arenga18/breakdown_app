const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const res = await pool.query("SELECT DISTINCT kat FROM stock WHERE kat ILIKE '%engsel%'");
  console.log('Engsel stock categories:');
  res.rows.forEach(r => {
    console.log(`  "${r.kat}"`);
  });

  const resItems = await pool.query("SELECT kode, nama, kat FROM stock WHERE kat ILIKE '%engsel%' LIMIT 20");
  console.log('\nSample items:');
  resItems.rows.forEach(r => {
    console.log(`  - name="${r.nama}", category="${r.kat}", code="${r.kode}"`);
  });

  await pool.end();
}

main().catch(console.error);
