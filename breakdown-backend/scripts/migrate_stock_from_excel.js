const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getClient } = require('../src/db');

const EXCEL_PATH = path.join(__dirname, '../../master rekap 2026_Bom.xlsx');
const SHEET = 'stock';

function parseNum(v) {
  if (v === '' || v == null) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function extractTebalFromNama(nama) {
  // Pattern: "tebal 0.6 mm", "tebal 1 mm"
  const m1 = nama.match(/tebal\s+([\d.,]+)\s*mm/i);
  if (m1) return parseNum(m1[1]);

  // Pattern: "(45X1)", "(22X0.45)", "(44x1)" → ambil angka setelah X (≤ 5)
  const m2 = nama.match(/[xX]\s*([\d.,]+)\s*\)/);
  if (m2) { const v = parseNum(m2[1]); if (v !== null && v > 0 && v <= 5) return v; }

  // Pattern: "X mm" di nama (bisa di akhir atau sebelum suffix seperti " (a)")
  const m3 = nama.match(/([\d.,]+)\s*mm/);
  if (m3) { const v = parseNum(m3[1]); if (v !== null && v > 0 && v <= 50) return v; }

  return null;
}

function isRefRow(r) {
  // Reference items: col C = CERMIN/KACA/MG (subcategory), no proper name
  const c = r[2] ? String(r[2]).trim() : '';
  if (c.match(/^(CERMIN|KACA|MG)$/)) return true;
  return false;
}

async function main() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[SHEET];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Three ranges: 5-2302, 2302-2523 (few Edg items), 2524-2812 (KACA/CERMIN)
  // Columns: A=NO, B=KATEGORI, C=ID BARANG, D=NAMA BARANG, E=JML→tebal, F=SATUAN, G=KETERANGAN
  const ranges = [
    { start: 4, end: 2302, label: 'main' },
    { start: 2301, end: 2523, label: 'mid' },
    { start: 2523, end: 2812, label: 'kaca' },
  ];

  const stock = [];
  for (const range of ranges) {
    const slice = rows.slice(range.start, range.end);
    for (const r of slice) {
      if (isRefRow(r)) continue;

      const kat = (r[1] || '').trim();
      const kode = r[2] ? String(r[2]).trim() : null;
      const nama = (r[3] || '').trim();

      if (!nama) continue;

      let tebal = parseNum(r[4]); // Kolom E (JML) → tebal
      // Fallback ke kolom A (NO) jika E kosong dan nilainya wajar (≤ 50)
      if (tebal === null) {
        const colA = parseNum(r[0]);
        if (colA !== null && colA <= 50) tebal = colA;
      }
      // Fallback ke ekstraksi dari nama
      if (tebal === null) tebal = extractTebalFromNama(nama);

      const satuan = (r[5] || '').trim();
      const ket = (r[6] || '').trim();

      stock.push({ kode, kat, nama, tebal, satuan, keterangan: ket });
    }
    console.log(`  ${range.label} rows ${range.start+1}-${range.end}: processed`);
  }

  console.log(`Total valid items: ${stock.length}`);

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM stock');

    for (const s of stock) {
      await client.query(
        `INSERT INTO stock (kode, kat, nama, tebal, satuan, keterangan)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [s.kode, s.kat, s.nama, s.tebal, s.satuan, s.keterangan]
      );
    }

    await client.query('COMMIT');
    console.log(`Inserted ${stock.length} stock items`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

main().catch(console.error);
