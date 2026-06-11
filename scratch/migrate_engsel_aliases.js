const { pool } = require('../breakdown-backend/src/db');

async function main() {
  console.log('Connecting to database...');

  // 1. Fetch tplSections
  const resTpl = await pool.query("SELECT value FROM app_settings WHERE key = 'tplSections'");
  if (resTpl.rows.length === 0) {
    console.error('No tplSections found in DB.');
    process.exit(1);
  }

  const sections = resTpl.rows[0].value;
  console.log(`Loaded ${sections.length} sections from DB.`);

  // Update tplSections Spesifikasi Engsel aliases
  const newEngselAliases = ['engsel1', 'engsel2', 'engsel3', 'engsel4', 'engsel5', 'engsel6', 'engsel7', 'engsel8', 'engsel9', 'engsel10'];
  sections.forEach(sec => {
    if (sec.name === 'Spesifikasi Engsel') {
      sec.rows.forEach((row, ri) => {
        const nextAlias = newEngselAliases[ri];
        if (nextAlias) {
          console.log(`Updating tplSections "Spesifikasi Engsel" Row "${row.label}" alias: "${row.alias}" -> "${nextAlias}"`);
          row.alias = nextAlias;
        }
      });
    }
  });

  await pool.query("UPDATE app_settings SET value = $1 WHERE key = 'tplSections'", [JSON.stringify(sections)]);
  console.log('Successfully updated tplSections in app_settings.');

  // 2. Define the key migration mapping for project speks
  const keyMigrationMap = {
    // Current keys
    "Spesifikasi Engsel||engsel_pantry||engse_kecil": "Spesifikasi Engsel||engsel_pantry||engsel1",
    "Spesifikasi Engsel||engsel_pantry||engse_tipon": "Spesifikasi Engsel||engsel_pantry||engsel2",
    "Spesifikasi Engsel||engsel_pantry||engse_bifold1": "Spesifikasi Engsel||engsel_pantry||engsel3",
    "Spesifikasi Engsel||engsel_pantry||engse_bifold2": "Spesifikasi Engsel||engsel_pantry||engsel4",
    "Spesifikasi Engsel||engsel_pantry||engse_blind_cr": "Spesifikasi Engsel||engsel_pantry||engsel5",
    "Spesifikasi Engsel||engsel_wrd||engse_wrd": "Spesifikasi Engsel||engsel_wrd||engsel6",
    "Spesifikasi Engsel||engsel_wrd||engse_45": "Spesifikasi Engsel||engsel_wrd||engsel7",
    "Spesifikasi Engsel||engsel_wrd||engse_bengkok": "Spesifikasi Engsel||engsel_wrd||engsel8",
    "Spesifikasi Engsel||engsel_wrd||engse_tebal": "Spesifikasi Engsel||engsel_wrd||engsel9",
    // Old keys
    "Spesifikasi Engsel||engsel pintu kecil||engse_kecil": "Spesifikasi Engsel||engsel_pantry||engsel1",
    "Spesifikasi Engsel||engsel pintu tip on||engse_tipon": "Spesifikasi Engsel||engsel_pantry||engsel2",
    "Spesifikasi Engsel||engsel bifold 1||engse_bifold1": "Spesifikasi Engsel||engsel_pantry||engsel3",
    "Spesifikasi Engsel||engsel bifold 2||engse_bifold2": "Spesifikasi Engsel||engsel_pantry||engsel4",
    "Spesifikasi Engsel||engsel blind cr||engse_blind_cr": "Spesifikasi Engsel||engsel_pantry||engsel5",
    "Spesifikasi Engsel||engsel pintu wrd||engse_wrd": "Spesifikasi Engsel||engsel_wrd||engsel6",
    "Spesifikasi Engsel||engsel pintu 45||engse_45": "Spesifikasi Engsel||engsel_wrd||engsel7",
    "Spesifikasi Engsel||engsel full bengkok||engse_bengkok": "Spesifikasi Engsel||engsel_wrd||engsel8",
    "Spesifikasi Engsel||engsel pintu tebal||engse_tebal": "Spesifikasi Engsel||engsel_wrd||engsel9",
    "Spesifikasi Engsel||engsel pintu folding akses||engse_folding": "Spesifikasi Engsel||",
  };

  const aliasValueMigrationMap = {
    "engse_kecil": "engsel1",
    "engse_tipon": "engsel2",
    "engse_bifold1": "engsel3",
    "engse_bifold2": "engsel4",
    "engse_blind_cr": "engsel5",
    "engse_wrd": "engsel6",
    "engse_45": "engsel7",
    "engse_bengkok": "engsel8",
    "engse_tebal": "engsel9",
    "engse_folding": "engsel10"
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

      // Migrate aliases (both keys and value string values!)
      if (spec.aliases) {
        const nextAliases = {};
        Object.entries(spec.aliases).forEach(([key, alias]) => {
          const newKey = keyMigrationMap[key] || key;
          const newAlias = aliasValueMigrationMap[alias] || alias;
          if (newKey !== key || newAlias !== alias) {
            console.log(`Project "${proj.name}" (${proj.id}) Alias: "${key}": "${alias}" -> "${newKey}": "${newAlias}"`);
            nextAliases[newKey] = newAlias;
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

  console.log(`Successfully migrated engsel aliases in ${updatedProjects} projects.`);
  await pool.end();
}

main().catch(console.error);
