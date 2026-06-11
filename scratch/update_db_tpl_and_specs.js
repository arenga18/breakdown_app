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

  // Define the correct sources mapping
  const sourceUpdates = {
    'Spesifikasi komp. Anodize': {
      'trim21': 'trim_21',
      'trim22': 'trim_22',
      'trim38': 'trim_38',
      'mled02': 'm_led_02',
      'mprf1': 'm_prf_01',
      'mlis1': 'm_list_01',
      'liskaca': 'lis_kaca',
      'mplt1': 'm_plt_01',
      'mplt2': 'm_plt_02',
      'hand1': 'mh_02',
      'hand2': 'mh_02',
      'hand3': 'mh_02',
      'hand4': 'mh_08',
      'hand5': 'mh_07',
      'hand6': 'mh_04',
      'hand7': 'mh_04',
      'hand8': 'mh_04',
      'hand9': 'mh_03b',
      'hand10': 'mh_03b',
      'edging7_trim': 'trim_21',
      'edging8_trim': 'trim_22',
      'edging9': 'trim_38'
    },
    'Spesifikasi frame Alu': {
      'fr0': 'm_frm_tutup_blk',
      'fr1': 'm_frm',
      'fr2': 'm_frm_07',
      'fr3': 'm_frm_02',
      'fr4': 'm_frm_03',
      'fr5': 'm_shf0102',
      'fr6': 'ls_01',
      'fr7': 'm_frm_05',
      'fr8': 'm_frm_05',
      'fr9': 'mulion_luar',
      'fr10': 'mulion_dalam',
      'fr11': 'mullion_m_frm_07',
      'fr12': 'ls_02',
      'fr13': 'mulion_dalam',
      'fr14': 'mulion_dalam'
    },
    'Spesifikasi Engsel': {
      'engse_kecil': 'engsel',
      'engse_tipon': 'engsel',
      'engse_bifold1': 'engsel',
      'engse_bifold2': 'engsel',
      'engse_blind_cr': 'engsel',
      'engse_wrd': 'engsel',
      'engse_45': 'engsel',
      'engse_bengkok': 'engsel',
      'engse_tebal': 'engsel',
      'engse_folding': 'engsel'
    },
    'Spesifikasi Rel laci': {
      'rel1': 'legrabox',
      'rel2': 'legrabox',
      'rel3': 'rel_tandem_blum',
      'rel4': 'rel_tandem_blum',
      'rel5': 'rel_tandem_blum',
      'rel6': 'tandembox',
      'rel7': 'tandembox',
      'rel8': 'rel_tandem_blum',
      'rel9': 'merivobox',
      'rel10': 'merivobox',
      'rel11': 'merivobox',
      'rel12': 'quadro',
      'rel13': 'avantech',
      'rel14': 'avantech'
    },
    'Spesifikasi Door Mechanism': {
      'dormec1': 'pocket_door',
      'dormec2': 'aventos',
      'dormec3': 'aventos',
      'dormec4': 'aventos'
    },
    'Spesifikasi Profil': {
      'prof_pintu_1': 'mr_02',
      'prof_pintu_2': 'mr_02',
      'prof_pintu_3': 'mlp_06',
      'prof_panel_1': 'pb_25',
      'prof_panel_2': 'profil',
      'prof_panel_3': 'mlp_02',
      'prof_cor_1': 'mlt_01',
      'prof_cor_2': 'mr_02',
      'prof_cor_3': 'mr_02',
      'prof_pl_1': 'mpp_01',
      'prof_pl_2': 'mpp_01',
      'prof_pl_3': 'mpp_01'
    }
  };

  let updatedTplCount = 0;
  sections.forEach(sec => {
    const sectionRules = sourceUpdates[sec.name];
    if (sectionRules) {
      sec.rows.forEach(row => {
        const correctSource = sectionRules[row.alias];
        if (correctSource && row.source !== correctSource) {
          console.log(`Updating Section "${sec.name}" Row "${row.label}" source: "${row.source}" -> "${correctSource}"`);
          row.source = correctSource;
          updatedTplCount++;
        }
      });
    }
  });

  if (updatedTplCount > 0) {
    await pool.query("UPDATE app_settings SET value = $1 WHERE key = 'tplSections'", [JSON.stringify(sections)]);
    console.log(`Successfully updated ${updatedTplCount} rows in tplSections.`);
  } else {
    console.log('No updates needed for tplSections.');
  }

  // 2. Update projects speks
  const resProj = await pool.query("SELECT id, name, speks FROM projects");
  console.log(`Loaded ${resProj.rows.length} projects.`);

  let updatedProjCount = 0;
  for (const proj of resProj.rows) {
    if (proj.speks && proj.speks.length > 0) {
      const spec = proj.speks[0];
      if (!spec.vals) spec.vals = {};
      if (!spec.aliases) spec.aliases = {};
      
      let projUpdated = false;

      // Populate spec aliases from template sections if not exists
      sections.forEach(sec => {
        sec.rows.forEach((row, ri) => {
          // Compute row key in exactly the same way as SpekPage.js
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
        await pool.query("UPDATE projects SET speks = $1 WHERE id = $2", [JSON.stringify([spec]), proj.id]);
        updatedProjCount++;
      }
    }
  }

  console.log(`Successfully updated ${updatedProjCount} projects' specs in database.`);
  await pool.end();
}

main().catch(console.error);
