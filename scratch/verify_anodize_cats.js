const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const values = [
    "Trim 21 S2/S4 Brown Doff ( Alm. 75181 ) P3",
    "Trim 22 S2/S4 Brown Doff ( Alm. 75270 ) P3",
    "ST-36 Brown Doff ( Alm. 2351 ) P3 P3"
  ];
  for (const val of values) {
    const res = await pool.query('SELECT kat FROM stock WHERE nama = $1', [val]);
    if (res.rows.length > 0) {
      console.log(`Value: "${val}" -> Stock Category: "${res.rows[0].kat}"`);
    } else {
      console.log(`Value: "${val}" -> Not found in stock!`);
      // Try fuzzy search
      const resFuzzy = await pool.query('SELECT nama, kat FROM stock WHERE nama ILIKE $1 LIMIT 3', [`%${val.split(' ')[0]}%`]);
      console.log(`  Fuzzy matches for "${val.split(' ')[0]}":`);
      resFuzzy.rows.forEach(r => {
        console.log(`    - "${r.nama}" (Category: "${r.kat}")`);
      });
    }
  }
  await pool.end();
}

main().catch(console.error);
