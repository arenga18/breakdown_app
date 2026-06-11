const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const hplList = [
    'HB_41130',
    'Aica',
    'WY_5216_D(V)',
    'L-FA_0206_AP',
    'DXO_1338_D',
    'Duco'
  ];

  const edgList = [
    'Edg_Décor_1723_B',
    'Edg_Decor_1723_B(55x1)',
    'Edg_EAW_5216_D1',
    'Edg_EAW_5216D1',
    'Edg_EAW_5216_D1(44x1)',
    'Edg_DSS_00206_SM',
    'Edg_DSS_00206_SM(45X1)',
    'Edg_EAP_1338_DO',
    'Edg_Decor_2023_B',
    'Melanor'
  ];

  console.log('--- Checking HPL Names ---');
  for (const name of hplList) {
    const res = await pool.query('SELECT nama FROM stock WHERE nama = $1', [name]);
    if (res.rows.length > 0) {
      console.log(`Found HPL: "${name}"`);
    } else {
      console.log(`HPL NOT FOUND: "${name}"`);
      const resFuzzy = await pool.query('SELECT nama FROM stock WHERE nama ILIKE $1 LIMIT 3', [`%${name.split('_')[0]}%`]);
      console.log('  Fuzzy matches:');
      resFuzzy.rows.forEach(r => console.log(`    - "${r.nama}"`));
    }
  }

  console.log('\n--- Checking Edging Names ---');
  for (const name of edgList) {
    const res = await pool.query('SELECT nama FROM stock WHERE nama = $1', [name]);
    if (res.rows.length > 0) {
      console.log(`Found Edging: "${name}"`);
    } else {
      console.log(`Edging NOT FOUND: "${name}"`);
      const resFuzzy = await pool.query('SELECT nama FROM stock WHERE nama ILIKE $1 LIMIT 3', [`%${name}%`]);
      console.log('  Fuzzy matches:');
      resFuzzy.rows.forEach(r => console.log(`    - "${r.nama}"`));
    }
  }

  await pool.end();
}

main().catch(console.error);
