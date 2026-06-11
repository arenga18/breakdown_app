const { pool } = require('../breakdown-backend/src/db/index');

async function main() {
  console.log('Connecting to database...');

  // 1. Fetch and update tplSections
  const resTpl = await pool.query("SELECT value FROM app_settings WHERE key = 'tplSections'");
  if (resTpl.rows.length === 0) {
    console.error('No tplSections found in DB.');
    process.exit(1);
  }

  const sections = resTpl.rows[0].value;
  console.log(`Loaded ${sections.length} sections from DB.`);

  sections.forEach(sec => {
    if (sec.name === 'Spesifikasi frame Alu') {
      sec.rows.forEach((row, ri) => {
        if (row.alias === 'fr1') {
          console.log(`Updating tplSections row 1 label: "${row.label}" -> "M_FRM Body"`);
          row.label = 'M_FRM Body';
        }
        if (row.alias === 'fr7') {
          console.log(`Updating tplSections row 7 label: "${row.label}" -> "Alm. 75283"`);
          row.label = 'Alm. 75283';
        }
        if (row.alias === 'fr8') {
          console.log(`Updating tplSections row 8 label: "${row.label}" -> "Alm. 75284"`);
          row.label = 'Alm. 75284';
        }
        if (row.alias === 'fr11') {
          console.log(`Updating tplSections row 11 label: "${row.label}" -> "Alm. 75354"`);
          row.label = 'Alm. 75354';
        }
      });
    }
  });

  await pool.query("UPDATE app_settings SET value = $1 WHERE key = 'tplSections'", [JSON.stringify(sections)]);
  console.log('Successfully updated tplSections in app_settings.');

  // 2. Define the key migration mapping for project speks
  const keyMigrationMap = {
    // Row 1 (M_FRM Body)
    "Spesifikasi frame Alu||M_FRM": "Spesifikasi frame Alu||M_FRM Body",
    "Spesifikasi frame Alu||M_FRM ": "Spesifikasi frame Alu||M_FRM Body",
    // Row 7 (Alm. 75283)
    "Spesifikasi frame Alu||M_FRM-05||fr7": "Spesifikasi frame Alu||Alm. 75283",
    "Spesifikasi frame Alu||M_FRM-05||fr_7": "Spesifikasi frame Alu||Alm. 75283",
    // Row 8 (Alm. 75284)
    "Spesifikasi frame Alu||M_FRM-05||fr8": "Spesifikasi frame Alu||Alm. 75284",
    "Spesifikasi frame Alu||M_FRM-05||fr_8": "Spesifikasi frame Alu||Alm. 75284",
    // Row 11 (Alm. 75354)
    "Spesifikasi frame Alu||Mullion M Frame 07": "Spesifikasi frame Alu||Alm. 75354",
  };

  // 3. Update all projects' speks JSONB fields
  const resProj = await pool.query("SELECT id, name, speks FROM projects");
  console.log(`Loaded ${resProj.rows.length} projects.`);

  let updatedProjects = 0;
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

      let specChanged = false;

      // Migrate vals
      if (spec.vals) {
        const nextVals = {};
        Object.entries(spec.vals).forEach(([key, val]) => {
          const newKey = keyMigrationMap[key];
          if (newKey) {
            console.log(`Project "${proj.name}" (${proj.id}) Val Key: "${key}" -> "${newKey}"`);
            nextVals[newKey] = val;
            specChanged = true;
          } else {
            nextVals[key] = val;
          }
        });
        spec.vals = nextVals;
      }

      // Migrate aliases
      if (spec.aliases) {
        const nextAliases = {};
        Object.entries(spec.aliases).forEach(([key, alias]) => {
          const newKey = keyMigrationMap[key];
          if (newKey) {
            console.log(`Project "${proj.name}" (${proj.id}) Alias Key: "${key}" -> "${newKey}"`);
            nextAliases[newKey] = alias;
            specChanged = true;
          } else {
            nextAliases[key] = alias;
          }
        });
        spec.aliases = nextAliases;
      }

      // Migrate kodes
      if (spec.kodes) {
        const nextKodes = {};
        Object.entries(spec.kodes).forEach(([key, code]) => {
          const newKey = keyMigrationMap[key];
          if (newKey) {
            console.log(`Project "${proj.name}" (${proj.id}) Kode Key: "${key}" -> "${newKey}"`);
            nextKodes[newKey] = code;
            specChanged = true;
          } else {
            nextKodes[key] = code;
          }
        });
        spec.kodes = nextKodes;
      }

      if (specChanged) {
        const nextSpeksValue = isArray ? [spec] : spec;
        await pool.query("UPDATE projects SET speks = $1 WHERE id = $2", [JSON.stringify(nextSpeksValue), proj.id]);
        updatedProjects++;
      }
    }
  }

  console.log(`Successfully migrated frame Alu labels in ${updatedProjects} projects.`);
  await pool.end();
}

main().catch(console.error);
