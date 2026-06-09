require('dotenv').config();
const path = require('path');
const { pool } = require('./index');

// Read initialState.js and parse it as CommonJS
const fs = require('fs');
let content = fs.readFileSync(path.join(__dirname, '../../../src/initialState.js'), 'utf8');
content = content.replace(/import\s+[\s\S]*?;\n/g, '');
content = content.replace(/export\s+const\s+initialState\s*=/, 'const parts = []; const stockData = []; const initialState =');
content += '\n;module.exports = initialState.modulMasterData;';

const tempFile = path.join(__dirname, 'temp_master_data.js');
fs.writeFileSync(tempFile, content);
const masterData = require(tempFile);
fs.unlinkSync(tempFile);

console.log(`Extracted ${Object.keys(masterData).length} categories from modulMasterData`);

async function run() {
  const client = await pool.connect();
  try {
    // Clear existing modul_master
    await client.query('DELETE FROM modul_master');
    console.log('🗑 Cleared existing modul_master data');

    let total = 0;
    for (const [tipe, entries] of Object.entries(masterData)) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        await client.query(`
          INSERT INTO modul_master (tipe, name, code, urutan)
          VALUES ($1, $2, $3, $4)
        `, [tipe, entry.name || '', entry.code || '', i]);
        total++;
      }
      console.log(`  ✓ ${tipe}: ${entries.length} entries`);
    }

    console.log(`\n✅ Total: ${total} entries inserted into modul_master`);
    console.log('🎉 Modul master seeding complete!');
  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
