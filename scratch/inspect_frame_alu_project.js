const { pool } = require('../breakdown-backend/src/db/index');

async function inspect() {
  try {
    const res = await pool.query('SELECT id, name, speks FROM projects');
    console.log(`Found ${res.rows.length} projects.`);
    res.rows.forEach(proj => {
      console.log(`\nProject: ${proj.name} (ID: ${proj.id})`);
      if (!proj.speks) {
        console.log('  No speks.');
        return;
      }
      const spec = Array.isArray(proj.speks) ? proj.speks[0] : proj.speks;
      if (spec.vals) {
        console.log('  Vals (Spesifikasi frame Alu):');
        Object.entries(spec.vals).forEach(([k, v]) => {
          if (k.startsWith('Spesifikasi frame Alu')) {
            console.log(`    "${k}": "${v}"`);
          }
        });
      }
      if (spec.aliases) {
        console.log('  Aliases (Spesifikasi frame Alu):');
        Object.entries(spec.aliases).forEach(([k, v]) => {
          if (k.startsWith('Spesifikasi frame Alu')) {
            console.log(`    "${k}": "${v}"`);
          }
        });
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspect();
