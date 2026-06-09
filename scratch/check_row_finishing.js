const { Client } = require('pg');
require('dotenv').config({ path: '../breakdown-backend/.env' });

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
    const res = await client.query(`
      SELECT id, modul_id, project_id, komp, p, l, t, l_fin, d_fin, lap_luar, lap_dalam
      FROM breakdown_rows
      WHERE lap_luar = 'WY_5216_D(V)' OR lap_dalam = 'WY_5216_D(V)'
      LIMIT 10
    `);
    console.log('Matches:');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
