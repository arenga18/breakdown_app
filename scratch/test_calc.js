const { pool } = require('../breakdown-backend/src/db/index');
const { buildHplMap, buildEdgMap, calcBreakdownItem } = require('../src/utils/breakdownCalc');

async function main() {
  console.log("Fetching categories from database...");
  const catRes = await pool.query('SELECT name, code, items FROM categories');
  const categories = catRes.rows;

  console.log("\nBuilding HPL Map...");
  const hplMap = buildHplMap(categories);
  console.log("hplMap['polos'] =", hplMap['polos']);
  console.log("hplMap['hb_41130'] =", hplMap['hb_41130']);
  console.log("hplMap keys & values:", JSON.stringify(hplMap, null, 2));

  console.log("\nBuilding Edg Map...");
  const edgMap = buildEdgMap(categories);
  console.log("edgMap['melanor'] =", edgMap['melanor']);
  console.log("edgMap['edg_décor_1723_b'] =", edgMap['edg_décor_1723_b']);
  console.log("edgMap['edg_decor_1723_b'] =", edgMap['edg_decor_1723_b']);
  console.log("edgMap keys & values:", JSON.stringify(edgMap, null, 2));

  // Run mock calculation for Dinding Samping
  const mockItem = {
    komp: 'Dinding Samping',
    type: 'prt',
    cat: 'wood',
    lap_luar: 'Polos',
    lap_dalam: 'HB_41130',
    p: '1000',
    l: '500',
    t: '18',
    p1: '1',  // Edg_Décor_1723_B
    p2: '9',  // Melanor
    l1: '9',  // Melanor
    l2: '9'   // Melanor
  };

  const spec = {
    categories: categories,
    stock: [],
    globalConstants: {}
  };

  const result = calcBreakdownItem(mockItem, [], spec, {});
  console.log("\nMock calculation result:");
  console.log(`v_lap: ${result.v_lap}`);
  console.log(`v_edg: ${result.v_edg}`);

  await pool.end();
}

main();
