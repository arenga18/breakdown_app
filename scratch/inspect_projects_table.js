const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const resCol = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'projects'
  `);
  console.log('Columns:');
  resCol.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

  const res = await pool.query("SELECT * FROM projects LIMIT 5");
  console.log('\nProjects Rows:');
  res.rows.forEach(r => {
    console.log(JSON.stringify(r, null, 2));
  });
  await pool.end();
}

main().catch(console.error);
