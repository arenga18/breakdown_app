const fs = require('fs');
const path = require('path');
const { pool } = require('./index');

async function main() {
  console.log('Reading extracted_desc.json...');
  const jsonPath = '/Applications/Arenga/vscode/breakdown_app/scratch/extracted_desc.json';
  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: File not found at ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(rawData);

  const newCategories = [
    {
      name: 'Deskripsi Lapisan',
      code: 'descf',
      fieldtype: 'select',
      items: data.descf
    },
    {
      name: 'Deskripsi Edging Kayu',
      code: 'desce',
      fieldtype: 'select',
      items: data.desce
    },
    {
      name: 'Deskripsi Edging Aluminium',
      code: 'descfr',
      fieldtype: 'select',
      items: data.descfr
    }
  ];

  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Seeding new description categories into the database...');
    for (const cat of newCategories) {
      await client.query(`
        INSERT INTO categories (name, code, fieldtype, items)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          fieldtype = EXCLUDED.fieldtype,
          items = EXCLUDED.items,
          updated_at = NOW()
      `, [cat.name, cat.code, cat.fieldtype, JSON.stringify(cat.items)]);
      console.log(`  ✓ Category '${cat.code}' (${cat.name}) seeded with ${cat.items.length} items.`);
    }
    console.log('Database seeding finished successfully!');
  } catch (err) {
    console.error('Error during database seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
