/**
 * Deduplicate stock table:
 *  - Groups items by (kode, normalized_name)
 *  - If >1 item in group:
 *      - Merge all unique keterangan values
 *      - Keep the item with the most complete data (prefer non-null keterangan)
 *      - Delete the rest
 *
 * Run: node scripts/dedup_stock.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query, getClient } = require('../src/db');

async function main() {
  console.log('📊 Fetching all stock data...');
  const result = await query('SELECT * FROM stock ORDER BY nama');
  const items = result.rows;
  console.log('   Total items:', items.length);

  // Group by (kode, trimmed_lowercase_nama)
  const groups = new Map();
  for (const item of items) {
    const normName = item.nama.trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
    const key = `${item.kode || ''}||${normName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  // Find groups with >1 item
  let totalDupes = 0;
  const client = await getClient();

  try {
    await client.query('BEGIN');

    for (const [key, grp] of groups) {
      if (grp.length < 2) continue;

      // Pick the "best" item to keep: prefer non-null keterangan
      let best = grp[0];
      for (const item of grp) {
        if (item.keterangan && !best.keterangan) best = item;
        // If both have ket or both don't, keep whichever (first is fine)
      }

      // Merge all unique keterangan
      const kets = [...new Set(grp.map(g => String(g.keterangan || '').trim()).filter(Boolean))];
      const mergedKet = kets.length > 0 ? kets.join(' | ') : null;

      // Update kept item with merged keterangan
      if (mergedKet !== best.keterangan) {
        await client.query(
          'UPDATE stock SET keterangan = $1 WHERE id = $2',
          [mergedKet, best.id]
        );
      }

      // Delete all others in group
      const toDelete = grp.filter(g => g.id !== best.id).map(g => g.id);
      if (toDelete.length > 0) {
        await client.query('DELETE FROM stock WHERE id = ANY($1::uuid[])', [toDelete]);
      }

      totalDupes += toDelete.length;
      console.log(
        `   ${String(grp[0].kode).padEnd(12)} "${grp[0].nama.slice(0, 45).padEnd(45)}" ` +
        `→ kept 1, removed ${toDelete.length}${mergedKet !== grp[0].keterangan ? ' (merged ket)' : ''}`
      );
    }

    await client.query('COMMIT');

    const finalResult = await query('SELECT COUNT(*) AS cnt FROM stock');
    console.log(`\n✅ Done! Removed ${totalDupes} duplicates.`);
    console.log(`📊 Final count: ${finalResult.rows[0].cnt}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});