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

  // Define new structures for Spesifikasi Engsel and Spesifikasi Profil
  const newEngselRows = [
    { label: 'engsel_pantry', source: 'engsel', alias: 'engse_kecil' },
    { label: 'engsel_pantry', source: 'engsel', alias: 'engse_tipon' },
    { label: 'engsel_pantry', source: 'engsel', alias: 'engse_bifold1' },
    { label: 'engsel_pantry', source: 'engsel', alias: 'engse_bifold2' },
    { label: 'engsel_pantry', source: 'engsel', alias: 'engse_blind_cr' },
    { label: 'engsel_wrd', source: 'engsel', alias: 'engse_wrd' },
    { label: 'engsel_wrd', source: 'engsel', alias: 'engse_45' },
    { label: 'engsel_wrd', source: 'engsel', alias: 'engse_bengkok' },
    { label: 'engsel_wrd', source: 'engsel', alias: 'engse_tebal' },
    { label: '', source: 'engsel', alias: 'engse_folding' },
  ];

  const newProfilRows = [
    { label: 'MR_02', source: 'mr_02', alias: 'prof_pintu_1' },
    { label: 'MLP_04', source: 'mlp_04', alias: 'prof_pintu_2' },
    { label: 'MLP_02', source: 'mlp_02', alias: 'prof_pintu_3' },
    { label: 'PT_04', source: 'pt_04', alias: 'prof_panel_1' },
    { label: 'PIRAMID', source: 'piramid', alias: 'prof_panel_2' },
    { label: 'MLP_02', source: 'mlp_02', alias: 'prof_panel_3' },
    { label: 'MLT_01', source: 'mlt_01', alias: 'prof_cor_1' },
    { label: 'MR_02', source: 'mr_02', alias: 'prof_cor_2' },
    { label: 'MR_02', source: 'mr_02', alias: 'prof_cor_3' },
    { label: 'MPP_01', source: 'mpp_01', alias: 'prof_pl_1' },
    { label: 'MPP_01', source: 'mpp_01', alias: 'prof_pl_2' },
    { label: 'MPP_01', source: 'mpp_01', alias: 'prof_pl_3' },
  ];

  sections.forEach(sec => {
    if (sec.name === 'Spesifikasi Engsel') {
      console.log('Updating tplSections: Spesifikasi Engsel rows...');
      sec.rows = newEngselRows;
    } else if (sec.name === 'Spesifikasi Profil') {
      console.log('Updating tplSections: Spesifikasi Profil rows...');
      sec.rows = newProfilRows;
    }
  });

  await pool.query("UPDATE app_settings SET value = $1 WHERE key = 'tplSections'", [JSON.stringify(sections)]);
  console.log('Successfully updated tplSections in app_settings table.');

  // 2. Define the key migration mapping
  const keyMigrationMap = {
    // Engsel
    "Spesifikasi Engsel||engsel pintu kecil": "Spesifikasi Engsel||engsel_pantry||engse_kecil",
    "Spesifikasi Engsel||engsel pintu tip on": "Spesifikasi Engsel||engsel_pantry||engse_tipon",
    "Spesifikasi Engsel||engsel bifold 1": "Spesifikasi Engsel||engsel_pantry||engse_bifold1",
    "Spesifikasi Engsel||engsel bifold 2": "Spesifikasi Engsel||engsel_pantry||engse_bifold2",
    "Spesifikasi Engsel||engsel blind cr": "Spesifikasi Engsel||engsel_pantry||engse_blind_cr",
    "Spesifikasi Engsel||engsel pintu wrd": "Spesifikasi Engsel||engsel_wrd||engse_wrd",
    "Spesifikasi Engsel||engsel pintu 45": "Spesifikasi Engsel||engsel_wrd||engse_45",
    "Spesifikasi Engsel||engsel full bengkok": "Spesifikasi Engsel||engsel_wrd||engse_bengkok",
    "Spesifikasi Engsel||engsel pintu tebal": "Spesifikasi Engsel||engsel_wrd||engse_tebal",
    "Spesifikasi Engsel||engsel pintu folding akses": "Spesifikasi Engsel||",

    // Profil
    "Spesifikasi Profil||prof_pintu_1 (MR 02)": "Spesifikasi Profil||MR_02||prof_pintu_1",
    "Spesifikasi Profil||prof_pintu_2 (MR 02)": "Spesifikasi Profil||MLP_04",
    "Spesifikasi Profil||prof_pintu_3 (MLP 06)": "Spesifikasi Profil||MLP_02||prof_pintu_3",
    "Spesifikasi Profil||prof_panel_1 (PB 25)": "Spesifikasi Profil||PT_04",
    "Spesifikasi Profil||prof_panel_2": "Spesifikasi Profil||PIRAMID",
    "Spesifikasi Profil||prof_panel_3 (MLP 02)": "Spesifikasi Profil||MLP_02||prof_panel_3",
    "Spesifikasi Profil||prof_cor_1 (MLT 01)": "Spesifikasi Profil||MLT_01",
    "Spesifikasi Profil||prof_cor_2 (MR 02)": "Spesifikasi Profil||MR_02||prof_cor_2",
    "Spesifikasi Profil||prof_cor_3 (MR 02)": "Spesifikasi Profil||MR_02||prof_cor_3",
    "Spesifikasi Profil||prof_pl_1 (MPP_01)": "Spesifikasi Profil||MPP_01||prof_pl_1",
    "Spesifikasi Profil||prof_pl_2 (MPP_01)": "Spesifikasi Profil||MPP_01||prof_pl_2",
    "Spesifikasi Profil||prof_pl_3 (MPP_01)": "Spesifikasi Profil||MPP_01||prof_pl_3",
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
            console.log(`Project "${proj.name}" (${proj.id}) Val Key Migrate: "${key}" -> "${newKey}"`);
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
            console.log(`Project "${proj.name}" (${proj.id}) Alias Key Migrate: "${key}" -> "${newKey}"`);
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
            console.log(`Project "${proj.name}" (${proj.id}) Kode Key Migrate: "${key}" -> "${newKey}"`);
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

  console.log(`Successfully migrated keys in ${updatedProjects} projects.`);
  await pool.end();
}

main().catch(console.error);
