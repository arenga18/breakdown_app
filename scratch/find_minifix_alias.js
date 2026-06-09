const { pool } = require('../breakdown-backend/src/db/index');

async function run() {
  try {
    const res = await pool.query("SELECT id, name, speks FROM projects");
    for (const row of res.rows) {
      console.log(`Project: ${row.name}`);
      const speks = row.speks || {};
      const aliases = speks.aliases || {};
      const vals = speks.vals || {};
      const kodes = speks.kodes || {};
      
      console.log("Aliases matching minifix/dowel:");
      for (const [k, v] of Object.entries(aliases)) {
        if (k.toLowerCase().includes("minifix") || v.toLowerCase().includes("minifix") || k.toLowerCase().includes("dowel") || v.toLowerCase().includes("dowel")) {
          console.log(`  Alias: ${k} -> ${v}`);
          console.log(`  Val:   ${vals[k]}`);
          console.log(`  Kode:  ${kodes[k]}`);
        }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
