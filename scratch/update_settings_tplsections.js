const { pool } = require('../breakdown-backend/src/db');

async function main() {
  console.log('Connecting to DB...');
  const res = await pool.query('SELECT value FROM app_settings WHERE key = \'tplSections\'');
  if (res.rows.length === 0) {
    console.error('No tplSections found in DB.');
    process.exit(1);
  }

  const sections = res.rows[0].value;
  console.log(`Loaded ${sections.length} template sections.`);

  let updatedCount = 0;

  sections.forEach(sec => {
    if (sec.name === 'Spesifikasi komp. Anodize') {
      sec.rows.forEach(row => {
        // Map handle/trim aliases to correct database categories
        if (['trim21', 'trim22', 'trim38', 'mled02', 'mprf1', 'mlis1', 'liskaca'].includes(row.alias)) {
          if (row.source !== 'alu') {
            row.source = 'alu';
            updatedCount++;
          }
        } else if (['mplt1', 'mplt2', 'hand1', 'hand2', 'hand3', 'hand4', 'hand5', 'hand6', 'hand7', 'hand8', 'hand9', 'hand10'].includes(row.alias)) {
          if (row.source !== 'hand') {
            row.source = 'hand';
            updatedCount++;
          }
        }
      });
    } else if (sec.name === 'Spesifikasi frame Alu') {
      sec.rows.forEach(row => {
        if (row.alias === 'fr13') { // Mullion Dalam (1)
          if (row.source !== 'mulion_dalam') {
            row.source = 'mulion_dalam';
            updatedCount++;
          }
        }
      });
    }
  });

  if (updatedCount > 0) {
    console.log(`Updating ${updatedCount} rows' category sources in DB...`);
    await pool.query('UPDATE app_settings SET value = $1 WHERE key = \'tplSections\'', [JSON.stringify(sections)]);
    console.log('Successfully updated tplSections in app_settings.');
  } else {
    console.log('No updates needed for tplSections.');
  }

  await pool.end();
}

main().catch(console.error);
