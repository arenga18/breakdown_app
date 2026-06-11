const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const res = await pool.query("SELECT id, name, speks FROM projects");
  res.rows.forEach(p => {
    console.log(`\nProject: ID=${p.id}, Name="${p.name}", Type=${typeof p.speks}`);
    console.log(`Is Array: ${Array.isArray(p.speks)}`);
    console.log(`speks:`, p.speks);
  });
  await pool.end();
}

main().catch(console.error);
