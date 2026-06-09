const { Client } = require('pg');
require('dotenv').config({ path: '../breakdown-backend/.env' });
const { buildAliasMap } = require('../src/utils/resolveAlias');
const { syncCategoriesWithSpek } = require('../src/utils/categorySync');

async function test() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'breakdown_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
  });

  await client.connect();
  try {
    // 1. Get stock
    const stockRes = await client.query('SELECT * FROM stock');
    const stock = stockRes.rows.map(s => ({
      id: s.kode || '',
      kode: s.kode || '',
      kat: s.kat || '',
      nama: s.nama || '',
      tebal: parseFloat(s.tebal) || 0
    }));

    // 2. Get categories
    const catRes = await client.query('SELECT * FROM categories');
    const categories = catRes.rows;

    // 3. Get projects
    const projRes = await client.query('SELECT * FROM projects LIMIT 1');
    if (projRes.rows.length === 0) {
      console.log('No projects found in DB.');
      return;
    }
    const project = projRes.rows[0];
    const spec = project.speks?.[0] || {};

    // 4. Sync categories
    const syncedCategories = syncCategoriesWithSpek(categories, spec, stock);

    // 5. Build Spec with GC
    const globalConstantsRes = await client.query("SELECT * FROM settings WHERE key='globalConstants'");
    const globalConstants = globalConstantsRes.rows[0]?.value || {};
    
    const activeSpecWithGC = {
      ...spec,
      globalConstants,
      stock,
      categories: syncedCategories
    };

    // 6. Build Alias Map
    const aliasMap = buildAliasMap(activeSpecWithGC);

    console.log('--- Real specAliases Keys ---');
    console.log(Object.keys(aliasMap).filter(k => k.toLowerCase().includes('inv')));

    const testFormulas = ['=lap_inv_kab', '=input_inv_kab', '=lap_inv'];
    testFormulas.forEach(f => {
      const key = f.slice(1).trim();
      const resolved = aliasMap[key] ?? aliasMap[key.toLowerCase()] ?? aliasMap[key.toUpperCase()];
      console.log(`rv("${f}") =>`, resolved !== undefined ? resolved : f);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
