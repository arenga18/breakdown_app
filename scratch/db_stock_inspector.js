const { pool } = require('../breakdown-backend/src/db');

async function main() {
  console.log('Querying unique categories in stock table...');
  const res = await pool.query('SELECT DISTINCT kat FROM stock ORDER BY kat');
  console.log('Stock Categories:');
  res.rows.forEach(r => {
    console.log(`  "${r.kat}"`);
  });

  // Query some item names for selected categories to verify their values
  const catsToCheck = [
    'legrabox', 'rel_tandem_blum', 'tandembox', 'merivobox', 'avantech', 
    'm_frm_ttp_blk', 'm_frm', 'm_frm_07', 'm_frm_02', 'm_frm_03', 
    'Mshf_0102', 'LS_01', 'm_frm_05', 'mulion_luar', 'mulion_dalam', 
    'mulion_m_frm_07', 'LS_02'
  ];

  for (const c of catsToCheck) {
    const resItems = await pool.query('SELECT kode, nama FROM stock WHERE LOWER(kat) = LOWER($1)', [c]);
    console.log(`\nItems in category "${c}" (count: ${resItems.rows.length}):`);
    resItems.rows.slice(0, 10).forEach(item => {
      console.log(`  - name="${item.nama}", code="${item.kode}"`);
    });
  }

  await pool.end();
}

main().catch(console.error);
