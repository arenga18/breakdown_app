const { pool } = require('../breakdown-backend/src/db/index');
const { buildAliasMap } = require('../src/utils/resolveAlias');

async function run() {
  try {
    const res = await pool.query('SELECT speks FROM projects LIMIT 1');
    if (res.rows.length > 0) {
      const spec = res.rows[0].speks || {};
      const aliasMap = buildAliasMap(spec);
      const valAliasMap = spec._valueAliasMap || buildAliasMap(spec, true);
      
      console.log("ALIAS MAP KEYS:");
      console.log(Object.keys(aliasMap).filter(k => !k.startsWith('_')).sort());
      
      console.log("\nVAL ALIAS MAP KEYS & VALUES (Sample):");
      const sample = {};
      Object.keys(valAliasMap).filter(k => !k.startsWith('_')).sort().forEach(k => {
        sample[k] = valAliasMap[k];
      });
      console.log(JSON.stringify(sample, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
