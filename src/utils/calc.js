/**
 * Simple calculation engine for Excel-like formulas.
 */

const COL_MAP = {
  A: 'bid', // Internal ID or row index
  B: 'cat',
  C: 'type',
  D: 'kode',
  E: 'tpk',
  F: 'no',
  G: 'komp',
  H: 'p',
  I: 'l',
  J: 't',
  K: 'sub',
  L: 'jml',
  M: 'bhn',
  N: 't_bhn',
  O: 'l_fin',
  P: 'd_fin',
  Q: 'p1',
  R: 'p2',
  S: 'l1',
  T: 'l2',
  U: 'lap_luar',
  V: 'lap_dalam',
  W: 'edg_p1',
  X: 'edg_p2',
  Y: 'edg_l1',
  Z: 'edg_l2'
};

export const REV_COL_MAP = Object.entries(COL_MAP).reduce((acc, [k, v]) => ({ ...acc, [v]: k }), {});

/**
 * Evaluates a string formula.
 * @param {string} formula - The formula string (e.g., "=H12-20")
 * @param {Array} rows - All rows in the table
 * @param {Object} spec - Global specification variables (raw values)
 * @param {Object} currentParent - Dimensions of the current module parent
 */
export function evaluateFormula(formula, rows, spec = {}, currentParent = {}, _depth = 0) {
  if (_depth > 10) return 0; // prevent infinite circular references
  if (!formula || !formula.toString().startsWith('=')) return formula;

  let expression = formula.substring(1).toUpperCase();
  const specVals = spec.vals || spec; // support both flat spec and {vals, aliases}
  const specAliases = spec.aliases || {};

  // Helper to escape regex special characters
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 1. Handle Spec variables (Aliases and Direct Keys)
  Object.entries(specVals).forEach(([key, val]) => {
    // Variations to try
    const parts = key.split('||');
    const label = parts[parts.length - 1].toUpperCase().replace(/\s+/g, '_');
    const customAlias = specAliases[key] || null;
    
    // We collect all possible keys to replace for this specific value
    const keysToTry = [label];
    if (customAlias) keysToTry.push(customAlias.toUpperCase());
    
    // Add hardcoded aliases
    if (label.includes('TEBAL') && label.includes('KABINET')) keysToTry.push('TKAB');
    if (label.includes('TEBAL') && label.includes('LACI')) keysToTry.push('TLACI');
    if (label.includes('DINDING_BLK')) keysToTry.push('TBLK');

    // Remove duplicates and empty keys
    const uniqueKeys = [...new Set(keysToTry)].filter(Boolean);

    uniqueKeys.forEach(k => {
      // CRITICAL: Escape k before using in RegExp and use \b for boundary
      const regex = new RegExp(`\\b${esc(k)}\\b`, 'g');
      const numericVal = parseFloat(val);
      if (!isNaN(numericVal)) {
        expression = expression.replace(regex, numericVal);
      }
    });

    // Also handle the full key but escape it!
    const fullKeyRegex = new RegExp(`${esc(key.toUpperCase())}`, 'g');
    const numericVal = parseFloat(val);
    if (!isNaN(numericVal)) {
      expression = expression.replace(fullKeyRegex, numericVal);
    }
  });

  // 2. Handle Parent variables
  // Example: =P, =L, =T
  if (currentParent) {
    expression = expression.replace(/\bP\b/g, currentParent.p || 0);
    expression = expression.replace(/\bL\b/g, currentParent.l || 0);
    expression = expression.replace(/\bT\b/g, currentParent.t || 0);
  }

  // 3. Handle Cell References (Excel style like H1, I10)
  // Recursively evaluate referenced cells that contain formulas
  expression = expression.replace(/[A-Z][0-9]+/g, (match) => {
    const colLetter = match[0];
    const rowNum = parseInt(match.substring(1)) - 1; // 0-based index
    const field = COL_MAP[colLetter];
    
    if (rows[rowNum]) {
      let val = rows[rowNum][field];
      // If the referenced cell itself is a formula, evaluate it recursively
      if (val && val.toString().startsWith('=')) {
        val = evaluateFormula(val, rows, spec, currentParent, _depth + 1);
      }
      const numericVal = parseFloat(val);
      return !isNaN(numericVal) ? numericVal : 0;
    }
    return 0;
  });

  try {
    // Sanitize the expression: allow only math operators, numbers, and dots
    const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
    if (!sanitized.trim()) return 0;
    // eslint-disable-next-line no-new-func
    return new Function(`return ${sanitized}`)();
  } catch (e) {
    console.error('Formula Error:', e, 'Expression:', expression);
    return '#ERR!';
  }
}

/**
 * Shifts all row coordinates in formulas by a given amount.
 * Useful when importing templates into an absolute breakdown table.
 */
export function shiftTemplateFormulas(komponenItems, shiftAmount) {
  if (shiftAmount === 0 || !komponenItems) return komponenItems;
  return komponenItems.map(item => {
    const next = { ...item };
    ['p', 'l', 't', 'jml', 'sub', 'p1', 'p2', 'l1', 'l2', 'l_fin', 'd_fin'].forEach(key => {
      if (next[key] && next[key].toString().startsWith('=')) {
        next[key] = next[key].toString().replace(/[A-Z](\d+)/gi, (match, d1) => {
          const newRow = parseInt(d1) + shiftAmount;
          return match[0].toUpperCase() + newRow;
        });
      }
    });
    return next;
  });
}
