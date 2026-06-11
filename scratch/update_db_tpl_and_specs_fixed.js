const { pool } = require('../breakdown-backend/src/db');
const { defaultSpekVals } = require('../src/defaultSpekVals');

async function main() {
  console.log('Connecting to database...');

  // 1. Fetch current tplSections
  const resTpl = await pool.query("SELECT value FROM app_settings WHERE key = 'tplSections'");
  if (resTpl.rows.length === 0) {
    console.error('No tplSections found in DB.');
    process.exit(1);
  }

  const sections = resTpl.rows[0].value;
  console.log(`Loaded ${sections.length} sections from DB.`);

  // 2. Update projects speks
  const resProj = await pool.query("SELECT id, name, speks FROM projects");
  console.log(`Loaded ${resProj.rows.length} projects.`);

  let updatedProjCount = 0;
  for (const proj of resProj.rows) {
    if (proj.speks) {
      let spec;
      let isArray = Array.isArray(proj.speks);
      
      if (isArray) {
        if (proj.speks.length === 0) continue;
        spec = proj.speks[0];
      } else if (typeof proj.speks === 'object') {
        spec = proj.speks;
      } else {
        continue;
      }

      if (!spec.vals) spec.vals = {};
      if (!spec.aliases) spec.aliases = {};
      
      let projUpdated = false;

      // Populate spec aliases and default values from template sections
      sections.forEach(sec => {
        // Handle in-memory Lapisan Standard migration if it hasn't run on the DB
        // Let's compute key based on current section name
        sec.rows.forEach((row, ri) => {
          const dupeCount = sec.rows.filter(r => r.label === row.label).length;
          let key;
          if (dupeCount > 1) {
            key = sec.name + '||' + row.label + '||' + (row.alias || String(ri));
          } else {
            key = sec.name + '||' + row.label;
          }

          if (row.alias && !spec.aliases[key]) {
            spec.aliases[key] = row.alias;
            projUpdated = true;
          }

          // Populate default value if value is currently empty, null, or '-- pilih --'
          const curVal = spec.vals[key];
          const defaultVal = defaultSpekVals[key] ?? '';
          if (curVal === undefined || curVal === null || curVal === '' || curVal === '-- pilih --') {
            if (defaultVal !== '') {
              console.log(`Project "${proj.name}" (${proj.id}): setting default for "${key}" -> "${defaultVal}"`);
              spec.vals[key] = defaultVal;
              projUpdated = true;
            }
          }
        });
      });

      if (projUpdated) {
        const nextSpeksValue = isArray ? [spec] : spec;
        await pool.query("UPDATE projects SET speks = $1 WHERE id = $2", [JSON.stringify(nextSpeksValue), proj.id]);
        updatedProjCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedProjCount} projects' specs in database.`);
  await pool.end();
}

main().catch(console.error);
