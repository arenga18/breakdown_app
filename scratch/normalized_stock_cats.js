const { pool } = require('../breakdown-backend/src/db');

function katToCode(kat) {
  return (kat || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

async function main() {
  const res = await pool.query('SELECT DISTINCT kat FROM stock ORDER BY kat');
  console.log('Normalized stock categories:');
  res.rows.forEach(r => {
    const kat = r.kat || '';
    console.log(`Original: "${kat}" -> Normalized Code: "${katToCode(kat)}"`);
  });
  await pool.end();
}

main().catch(console.error);
