const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const query = "SELECT nama, kat FROM stock WHERE nama ILIKE '%QUADRO%' LIMIT 5";
  const res = await pool.query(query);
  console.log('Quadro sample items:');
  res.rows.forEach(r => {
    console.log(`  - name="${r.nama}", category="${r.kat}"`);
  });

  const resVal = await pool.query("SELECT kat FROM stock WHERE nama ILIKE '%QUADRO V6%' LIMIT 5");
  if (resVal.rows.length > 0) {
    console.log(`Quadro V6 category: "${resVal.rows[0].kat}"`);
  } else {
    console.log('No Quadro V6 found.');
  }

  await pool.end();
}

main().catch(console.error);
