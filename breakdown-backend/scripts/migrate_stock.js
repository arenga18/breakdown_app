/**
 * Migrate stock data from master rekap 2026_Boms.xlsx sheet "stock" to PostgreSQL.
 * Mapping Excel columns → DB stock table:
 *   ID BARANG  (col 2) → kode
 *   NAMA BARANG (col 3) → nama  (trimmed)
 *   JML        (col 4) → jml
 *   SATUAN     (col 5) → satuan
 *   KATEGORI   (col 1) → kat
 *   KETERANGAN (col 6) + unnamed col 7 + Ket (col 8) → keterangan
 *
 * Hanya memproses Excel row 4-2287 (sesuai instruksi user).
 *
 * Usage: node scripts/migrate_stock.js
 */

// Batas baris Excel (1-indexed): hanya proses row 4 sampai 2287
const EXCEL_ROW_START = 4;   // data dimulai
const EXCEL_ROW_END   = 2287; // baris terakhir

const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query, getClient } = require('../src/db');

const EXCEL_FILE = path.join(__dirname, '../../master rekap 2026_Boms.xlsx');

async function readExcel() {
  console.log('📖 Reading:', EXCEL_FILE);
  const workbook = XLSX.readFile(EXCEL_FILE);
  const ws = workbook.Sheets['stock'];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });
  console.log('   Total rows in sheet:', data.length);

  // Find header row
  let headerIdx = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    if (data[i] && data[i].some(v => String(v || '').trim() === 'NO')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) throw new Error('Header row not found');
  console.log('   Header at row:', headerIdx + 1);

  const col = {
    NO: 0, KATEGORI: 1, ID_BARANG: 2, NAMA_BARANG: 3,
    JML: 4, SATUAN: 5, KETERANGAN: 6, COL7: 7, KET: 8
  };

  const stock = [];
  // Hanya proses Excel row 4 (index headerIdx+1) sampai row 2287 (index EXCEL_ROW_END-1)
  for (let i = headerIdx + 1; i < EXCEL_ROW_END; i++) {
    const row = data[i];
    if (!row) continue;

    const namaRaw = row[col.NAMA_BARANG];
    if (!namaRaw || String(namaRaw).trim() === '' || String(namaRaw).trim() === 'NAMA BARANG') continue;

    const nama = String(namaRaw).trim();
    const kode = row[col.ID_BARANG] != null ? String(row[col.ID_BARANG]).trim() : null;
    const jml = row[col.JML];
    const satuan = row[col.SATUAN] != null ? String(row[col.SATUAN]).trim() : null;
    const kategori = row[col.KATEGORI] != null ? String(row[col.KATEGORI]).trim() : null;
    const keterangan = row[col.KETERANGAN] != null ? String(row[col.KETERANGAN]).trim() : null;
    const col7 = row[col.COL7] != null ? String(row[col.COL7]).trim() : null;
    const ket = row[col.KET] != null ? String(row[col.KET]).trim() : null;

    // Kategori disimpan terpisah di kolom `kat`
    // Keterangan hanya berisi catatan tambahan (col 6 + col 7 + col 8)
    const parts = [keterangan, col7, ket].filter(Boolean);
    const combinedKet = parts.length > 0 ? parts.join(' | ') : null;

    stock.push({
      kode: kode || null,
      kat: kategori || null,
      nama,
      jml: (jml === null || jml === undefined) ? 0 : Number(jml) || 0,
      satuan: satuan || null,
      keterangan: combinedKet,
    });
  }

  console.log(`   Parsed ${stock.length} items`);
  return stock;
}

async function migrate() {
  // Read Excel
  const stockData = await readExcel();

  // Show summary
  const withKode = stockData.filter(s => s.kode).length;
  const witNama = stockData.filter(s => s.nama).length;
  const withJml = stockData.filter(s => s.jml > 0).length;
  const withKet = stockData.filter(s => s.keterangan).length;
  console.log(`\n📊 Summary: ${stockData.length} items, ${withKode} with kode, ${witNama} with nama, ${withJml} with jml>0, ${withKet} with keterangan`);
  console.log('   Sample:', stockData[0]);

  // Store — use transaction with DELETE + INSERT
  console.log('\n🚀 Writing to database...');
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Clear existing
    await client.query('DELETE FROM stock');
    console.log('   Cleared existing data');

    // Batch insert
    let inserted = 0;
    const BATCH = 500;
    for (let i = 0; i < stockData.length; i += BATCH) {
      const batch = stockData.slice(i, i + BATCH);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const s of batch) {
        values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5})`);
        params.push(s.kode, s.kat, s.nama, s.jml, s.satuan, s.keterangan);
        paramIdx += 6;
      }

      await client.query(
        `INSERT INTO stock (kode, kat, nama, jml, satuan, keterangan) VALUES ${values.join(', ')}`,
        params
      );
      inserted += batch.length;
      console.log(`   Inserted ${inserted}/${stockData.length}...`);
    }

    await client.query('COMMIT');
    console.log(`\n✅ Migration complete! ${inserted} items inserted.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

migrate().catch(err => { console.error(err); process.exit(1); });