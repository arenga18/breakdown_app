const { pool } = require('../breakdown-backend/src/db');
const { defaultSpekVals } = require('../src/defaultSpekVals');

async function main() {
  const resTpl = await pool.query("SELECT value FROM app_settings WHERE key = 'tplSections'");
  const sections = resTpl.rows[0].value;

  const resProj = await pool.query("SELECT id, name, speks FROM projects");
  
  for (const proj of resProj.rows) {
    console.log(`\nProject: ID=${proj.id}, Name="${proj.name}"`);
    if (proj.speks && proj.speks.length > 0) {
      const spec = proj.speks[0];
      if (!spec.vals) {
        console.log('  No vals map!');
        continue;
      }
      
      sections.forEach(sec => {
        sec.rows.forEach((row, ri) => {
          const dupeCount = sec.rows.filter(r => r.label === row.label).length;
          let key;
          if (dupeCount > 1) {
            key = sec.name + '||' + row.label + '||' + (row.alias || String(ri));
          } else {
            key = sec.name + '||' + row.label;
          }

          const curVal = spec.vals[key];
          const defaultVal = defaultSpekVals[key] ?? '';
          if (key.includes('edgingkab2') || key.includes('lapisan2') || key.includes('rel1') || key.includes('edging7')) {
            console.log(`  Key: "${key}"`);
            console.log(`    Current: "${curVal}"`);
            console.log(`    Default: "${defaultVal}"`);
          }
        });
      });
    }
  }
  await pool.end();
}

main().catch(console.error);
