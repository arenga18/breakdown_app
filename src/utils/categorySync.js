import { buildAliasMap } from './resolveAlias';
import { getFinishingThickness, getEdgingThickness } from './breakdownCalc';

const TF_MAP = {
  '1': 'lapisan1',
  '11': 'kabinet1',
  '2': 'lapisan2',
  '9': 'tip_lap_inv',
  '3': 'lapisan3',
  '22': 'kabinet2',
  '4': 'lapisan4',
  '5': 'lapisan5',
  '6': 'lapisan6',
  '33': 'kabinet3',
  '7': 'lapisan7'
};

const TE_MAP = {
  '11': 'edgingkab1',
  '9': 'edginginv', // fallback if exists, otherwise stays 'Melanor'
  '1': 'edging1',
  '7': 'trim21',
  '8': 'trim22',
  '6': 'trim38',
  '2': 'edging2',
  '3': 'edging3',
  '4': 'edging4',
  '22': 'edgingkab2',
  '5': 'edging5',
  '33': 'edgingkab3',
  '66': 'edging6'
};

/**
 * Dynamically updates Categories list with active project's Spek values.
 * Maps HPL (Type Finished 'tf', 'lap_luar', 'lap_dalam') and Edging (Type Edge 'te', 'edg') options
 * to their corresponding Spek values and automatically recalculates thicknesses.
 * 
 * @param {Array} categories - Original categories from DB/state
 * @param {Object} spec - Active spec with vals and aliases
 * @param {Array} stock - Current stock list
 * @returns {Array} Synced categories list
 */
export function syncCategoriesWithSpek(categories = [], spec = {}, stock = []) {
  if (!categories || !Array.isArray(categories)) return categories;
  const specAliases = buildAliasMap(spec, true);

  return categories.map(cat => {
    // Sync both formula categories ('tf') and grid UI dropdown categories ('lap_luar', 'lap_dalam')
    if (cat.code === 'tf' || cat.code === 'lap_luar' || cat.code === 'lap_dalam' || cat.code === 'hpl') {
      const newItems = (cat.items || []).map(item => {
        if (typeof item === 'object' && item.code !== undefined && item.code !== null) {
          const aliasKey = TF_MAP[String(item.code)];
          if (aliasKey) {
            const specVal = specAliases[aliasKey] ?? specAliases[aliasKey.toLowerCase()] ?? specAliases[aliasKey.toUpperCase()];
            if (specVal !== undefined && specVal !== null && specVal !== '') {
              // Calculate HPL thickness dynamically
              const tebal = getFinishingThickness(specVal, categories);
              return {
                ...item,
                name: specVal,
                tebal: tebal
              };
            }
          }
        }
        return item;
      });
      return { ...cat, items: newItems };
    }

    // Sync both formula categories ('te') and grid UI dropdown categories ('edg')
    if (cat.code === 'te' || cat.code === 'edg') {
      const newItems = (cat.items || []).map(item => {
        if (typeof item === 'object' && item.code !== undefined && item.code !== null) {
          const aliasKey = TE_MAP[String(item.code)];
          if (aliasKey) {
            const specVal = specAliases[aliasKey] ?? specAliases[aliasKey.toLowerCase()] ?? specAliases[aliasKey.toUpperCase()];
            if (specVal !== undefined && specVal !== null && specVal !== '') {
              // Calculate Edging thickness dynamically using stock items
              const tebal = getEdgingThickness(specVal, stock, categories);
              return {
                ...item,
                name: specVal,
                tebal: tebal
              };
            }
          }
        }
        return item;
      });
      return { ...cat, items: newItems };
    }

    return cat;
  });
}
