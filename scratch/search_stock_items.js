const { pool } = require('../breakdown-backend/src/db/index');

async function run() {
  try {
    const searchTerms = ['minifix', 'dowel', 'lakban', 'sikaflex', 'silicone', 'rel', 'engsel', 'wl77', 'anodize', 'handle'];
    for (const term of searchTerms) {
      const res = await pool.query(
        "SELECT kode, nama, satuan FROM stock WHERE LOWER(nama) LIKE $1 OR LOWER(kode) LIKE $1 LIMIT 5",
        [`%${term.toLowerCase()}%`]
      );
      console.log(`\nSearch for "${term}":`);
      res.rows.forEach(r => {
        console.log(`  Kode: ${r.kode} | Nama: ${r.nama} | Satuan: ${r.satuan}`);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
