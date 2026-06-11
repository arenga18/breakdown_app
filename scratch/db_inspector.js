const { pool } = require('../breakdown-backend/src/db');

async function main() {
  console.log('Querying app_settings tplSections...');
  const resTpl = await pool.query("SELECT value FROM app_settings WHERE key = 'tplSections'");
  if (resTpl.rows.length > 0) {
    console.log('--- tplSections ---');
    const sections = resTpl.rows[0].value;
    sections.forEach(sec => {
      console.log(`Section: ${sec.name}`);
      sec.rows.forEach(row => {
        console.log(`  Row: label="${row.label}", source="${row.source}", alias="${row.alias}"`);
      });
    });
  } else {
    console.log('No tplSections found.');
  }

  console.log('\nQuerying projects...');
  const resProj = await pool.query("SELECT id, name, speks FROM projects");
  resProj.rows.forEach(p => {
    console.log(`Project: ID=${p.id}, Name="${p.name}"`);
    if (p.speks && p.speks.length > 0) {
      console.log('  Specs keys/values:');
      const spec = p.speks[0];
      if (spec.vals) {
        Object.entries(spec.vals).forEach(([k, v]) => {
          if (v === '' || v === '-- pilih --' || !v) {
            console.log(`    [EMPTY/DEFAULT] "${k}": "${v}"`);
          } else {
            console.log(`    "${k}": "${v}"`);
          }
        });
      }
    }
  });

  await pool.end();
}

main().catch(console.error);
