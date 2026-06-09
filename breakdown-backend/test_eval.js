const { Client } = require('pg');
require('dotenv').config();

// Require exact modules
const { evaluateFormula } = require('../src/utils/calc');
const { resolveLapisanFromCode } = require('../src/utils/breakdownCalc');
const { buildAliasMap, resolveAlias } = require('../src/utils/resolveAlias');

async function run() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'breakdown_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
  });

  await client.connect();
  try {
    const catRes = await client.query("SELECT * FROM categories");
    const categories = catRes.rows.map(r => ({
      code: r.code,
      items: typeof r.value === 'string' ? JSON.parse(r.value) : r.value
    }));

    const rowRes = await client.query(`
      SELECT * FROM breakdown_rows
      WHERE id = '0295a66b-091a-4d37-93e1-f2f55e96a07e'
    `);
    const item = rowRes.rows[0];
    console.log('Database Item:', item);

    const projectRes = await client.query(`
      SELECT * FROM projects WHERE id = $1
    `, [item.project_id]);
    const project = projectRes.rows[0];
    const spec = project.speks && project.speks[0] ? project.speks[0] : {};
    spec.categories = categories;

    const setupItemsRes = await client.query("SELECT * FROM setup_items");
    const setupItems = setupItemsRes.rows;

    const specAliases = buildAliasMap(spec);

    const lFinEval = evaluateFormula(item.l_fin, [], spec, {}, 0, setupItems);
    console.log('lFinEval:', lFinEval, typeof lFinEval);

    const rawVal = lFinEval ? (resolveLapisanFromCode(lFinEval, categories) || item.lap_luar || '') : '';
    console.log('rawVal:', JSON.stringify(rawVal));

    const displayVal = resolveAlias(rawVal, specAliases);
    console.log('displayVal:', JSON.stringify(displayVal));

    const resolvedVal = resolveLapisanFromCode(displayVal, categories) || (isNaN(Number(displayVal)) ? displayVal : '');
    console.log('resolvedVal:', JSON.stringify(resolvedVal));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
