const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const res = await pool.query("SELECT id, name, speks FROM projects");
  res.rows.forEach(p => {
    console.log(`\nProject: ID=${p.id}, Name="${p.name}"`);
    if (p.speks && p.speks.length > 0) {
      const spec = p.speks[0];
      if (spec.vals) {
        console.log('  Vals keys:');
        Object.entries(spec.vals).forEach(([k, v]) => {
          console.log(`    "${k}": "${v}"`);
        });
      } else {
        console.log('  No vals in spec!');
      }
    } else {
      console.log('  No specs!');
    }
  });
  await pool.end();
}

main().catch(console.error);
