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
    const projRes = await client.query('SELECT * FROM projects LIMIT 1');
    if (projRes.rows.length === 0) {
      console.log('No projects found.');
      return;
    }
    const project = projRes.rows[0];
    console.log('Project ID:', project.id);
    console.log('Project Name:', project.name);
    console.log('speks:');
    console.log(JSON.stringify(project.speks, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
