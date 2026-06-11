const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const res = await pool.query("SELECT id, name, speks FROM projects WHERE id = 'db95683c-313d-4664-a91d-14e59573d990'");
  if (res.rows.length > 0) {
    const p = res.rows[0];
    console.log(`Project: ID=${p.id}, Name="${p.name}"`);
    if (p.speks && p.speks.length > 0) {
      const spec = p.speks[0];
      if (spec.vals) {
        console.log('Selected Values:');
        Object.entries(spec.vals).forEach(([k, v]) => {
          console.log(`  "${k}": "${v}"`);
        });
      }
    }
  }
  await pool.end();
}

main().catch(console.error);
