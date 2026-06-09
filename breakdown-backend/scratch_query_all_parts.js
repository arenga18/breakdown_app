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
    const res = await client.query("SELECT id, val, name, keterangan FROM parts");
    console.log('Total parts in DB:', res.rows.length);
    res.rows.forEach(row => {
      let extra = {};
      try { extra = JSON.parse(row.keterangan); } catch (_) {}
      
      // Look for any values starting with "=" or containing "inv"
      const matches = Object.entries(extra).filter(([k, v]) => 
        (typeof v === 'string' && (v.startsWith('=') || v.includes('inv')))
      );
      if (matches.length > 0) {
        console.log(`Part ID: ${row.id}, Val: ${row.val}, Name: ${row.name}`);
        console.log('  Matches in keterangan:', matches);
      }
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
