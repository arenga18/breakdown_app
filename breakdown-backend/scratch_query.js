const { Client } = require('pg');
require('dotenv').config();

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
    const res = await client.query("SELECT id, val, name, keterangan FROM parts WHERE keterangan LIKE '%inv%' LIMIT 5");
    console.log('--- DB Parts matching "inv" ---');
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
