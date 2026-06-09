import fs from 'fs';
import { stockData } from '../src/stockData.js';
import { resolveStockItem } from '../src/utils/bpbCalc.js';

const bpbTemplate = JSON.parse(fs.readFileSync('./src/utils/bpb_setting_full.json', 'utf8'));

const spec = {
  vals: {},
  aliases: {},
  kodes: {}
};

console.log("Analyzing variables against stock database...");
const unresolved = [];

bpbTemplate.forEach(row => {
  if (row.nama_barang) {
    const { resolvedName, stockItem } = resolveStockItem(row.nama_barang, spec, stockData);
    if (!stockItem) {
      unresolved.push({
        row_idx: row.row_idx,
        nama_barang: row.nama_barang,
        resolvedName: resolvedName
      });
    }
  }
});

if (unresolved.length > 0) {
  console.log("Unresolved items found:");
  unresolved.forEach(item => {
    console.log(`- Row ${item.row_idx}: ${item.nama_barang} (resolved: "${item.resolvedName}")`);
  });
} else {
  console.log("All items resolved successfully!");
}
