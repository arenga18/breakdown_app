const { pool } = require('../breakdown-backend/src/db');

async function main() {
  const relList = [
    { alias: 'rel1', name: 'LEGRA S1 ORION GREY (OG' },
    { alias: 'rel2', name: 'LEGRABOX S4 OG (ORION GREY)' },
    { alias: 'rel3', name: 'REL TANDEM BLUM SINGLE EXT INTG P.500' },
    { alias: 'rel4', name: 'REL TANDEM BLUM FULL EXT INTG P.500' },
    { alias: 'rel5', name: 'REL TANDEM BLUM FULL EXT INTG P.400' },
    { alias: 'rel6', name: 'LACI B1S1 INTE BLUMO' },
    { alias: 'rel7', name: 'B1S2 GREY INTEG.BM' },
    { alias: 'rel8', name: 'REL TANDEM BLUM SINGLE EXT INTG P.450' },
    { alias: 'rel9', name: 'MERIVOBOX MVX S1 SW 500 40 BM' },
    { alias: 'rel10', name: 'MERIVOBOX MVX S4 SW 500 70 BM' },
    { alias: 'rel11', name: 'LACI MERIVOBOX S2 + KACA ORION GREY' },
    { alias: 'rel12', name: 'QUADRO V6 SFP FL 500 EB 20 TIP ON HETTICH L/R' },
    { alias: 'rel13', name: 'Avantech You 101 P.500mm' },
    { alias: 'rel14', name: 'Avantech You 251 P.500mm' }
  ];

  for (const item of relList) {
    const res = await pool.query('SELECT nama, kat FROM stock WHERE nama = $1', [item.name]);
    if (res.rows.length > 0) {
      console.log(`Found exact match: "${item.name}" (Category: "${res.rows[0].kat}")`);
    } else {
      console.log(`NO MATCH: "${item.name}"`);
      // Try fuzzy search
      const words = item.name.split(' ');
      const searchWord = words.length > 1 ? `${words[0]} % ${words[1]}` : words[0];
      const resFuzzy = await pool.query('SELECT nama, kat FROM stock WHERE nama ILIKE $1 LIMIT 3', [`%${searchWord}%`]);
      console.log(`  Fuzzy matches for "${searchWord}":`);
      resFuzzy.rows.forEach(r => {
        console.log(`    - "${r.nama}" (Category: "${r.kat}")`);
      });
    }
  }

  await pool.end();
}

main().catch(console.error);
