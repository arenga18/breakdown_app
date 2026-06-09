/**
 * stockCategoryMap.js
 * Builds a map of category-code → category-object from stock data,
 * grouping items by their `kat` field.
 *
 * Returned map shape:
 *   { [code]: { code, name, fieldtype, items: [{ val, name, tebal, code }] } }
 *
 * HPL and Edg/Edging are intentionally excluded here because they are already
 * handled separately in the syncedCategories memo (App.js).
 */

const EXCLUDED_KATS = new Set(['hpl', 'edg', 'edging', 'lap_luar', 'lap_dalam']);

/**
 * Convert a kat string to a safe category code (lowercase, underscores).
 */
function katToCode(kat) {
  return (kat || '').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

/**
 * Build stock-derived categories from the stock array.
 * @param {Array} stock - Array of stock items with { kat, nama, tebal, kode, id }
 * @returns {Object} Map of code → category object
 */
export function buildStockDerivedCategories(stock = []) {
  const map = {};

  stock.forEach((item, idx) => {
    const kat = (item.kat || '').trim();
    if (!kat) return;

    const code = katToCode(kat);
    if (!code) return;

    // Skip kats that are already managed as auto-synced categories
    if (EXCLUDED_KATS.has(code)) return;

    if (!map[code]) {
      map[code] = {
        code,
        name: kat, // human-readable name from the first occurrence
        fieldtype: 'select',
        items: [],
      };
    }

    map[code].items.push({
      val: map[code].items.length + 1,
      name: item.nama || '',
      tebal: parseFloat(item.tebal) || 0,
      code: item.kode || item.id || '',
    });
  });

  return map;
}
