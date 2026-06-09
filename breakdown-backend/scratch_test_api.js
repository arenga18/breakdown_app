const axios = require('axios');
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
    // 1. Find a part to test with
    const res = await client.query("SELECT * FROM parts LIMIT 1");
    if (res.rows.length === 0) {
      console.log('No parts found to test with.');
      return;
    }
    const part = res.rows[0];
    console.log('Target Part ID:', part.id);
    console.log('Before update keterangan:', part.keterangan);

    // 2. Put via API
    let extra = {};
    try { extra = JSON.parse(part.keterangan); } catch (_) {}
    const updatedExtra = { ...extra, q_screw: '=input_inv_kab' };

    const payload = {
      val: part.val,
      name: part.name,
      code: part.code,
      ks: part.ks,
      lap_luar: part.lap_luar,
      edg: part.edg,
      alias: part.alias,
      opt: part.opt,
      keterangan: JSON.stringify(updatedExtra)
    };

    const port = process.env.PORT || 3001;
    console.log(`Sending PUT request to http://localhost:${port}/api/v1/parts/${part.id}`);
    const putRes = await axios.put(`http://localhost:${port}/api/v1/parts/${part.id}`, payload);
    console.log('API Response status:', putRes.status);

    // 3. Query DB again to see what was saved
    const verifyRes = await client.query("SELECT * FROM parts WHERE id=$1", [part.id]);
    console.log('After update keterangan:', verifyRes.rows[0].keterangan);

  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

test();
