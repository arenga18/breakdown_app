/**
 * Simple calculation engine for Excel-like formulas.
 */

import { COL_MAP, REV_COL_MAP } from './colMap';
import { buildFormulaContext } from './formulaContext';
import { buildAliasMap, resolveAlias } from './resolveAlias';

const loggedErrors = new Set();

// Cache compiled functions keyed by sanitized expression string.
// Avoids repeated `new Function()` compilation for identical expressions.
const compiledFnCache = new Map();
const MAX_FN_CACHE = 2000;

/**
 * Converts Excel IF(cond, trueVal, falseVal) to JS ternary (cond ? trueVal : falseVal).
 * Handles nested IFs and Excel-style comparisons (= → ===, <> → !==).
 */
function convertIFtoTernary(expr) {
  // Recursively convert outermost IF to ternary
  const match = expr.match(/\bIF\(/);
  if (!match) return expr;
  const startIdx = match.index;
  // Find matching closing paren
  let depth = 0;
  let endIdx = startIdx;
  for (let i = startIdx; i < expr.length; i++) {
    if (expr[i] === '(') depth++;
    else if (expr[i] === ')') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  // Extract IF( ... ) content
  const inner = expr.slice(startIdx + 3, endIdx);
  const parts = splitTopLevel(inner, ',');
  if (parts.length === 3) {
    const cond = convertIFtoTernary(parts[0].trim())
      .replace(/<>/g, '!==')
      .replace(/(\d|(?<=[A-Za-z_]))=(?!=)/g, '$1===');
    const tVal = convertIFtoTernary(parts[1].trim());
    const fVal = convertIFtoTernary(parts[2].trim());
    const ternary = `(${cond} ? ${tVal} : ${fVal})`;
    return expr.slice(0, startIdx) + ternary + expr.slice(endIdx + 1);
  }
  return expr;
}

/** Split by comma only at top level (not inside parentheses) */
function splitTopLevel(str, sep) {
  const parts = [];
  let depth = 0, start = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    else if (depth === 0 && str[i] === sep) {
      parts.push(str.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(str.slice(start));
  return parts;
}

/**
 * Evaluates a string formula.
 * @param {string} formula - The formula string (e.g., "=H12-20")
 * @param {Array} rows - All rows in the table
 * @param {Object} spec - Global specification variables (raw values)
 * @param {Object} currentParent - Dimensions of the current module parent
 */
/**
 * @param {string|number} formula
 * @param {Array} rows
 * @param {Object} spec
 * @param {Object} currentParent
 * @param {number} _depth
 * @param {Array} setupItems
 * @param {Object} context - extra named ranges / overrides
 * @param {Object|null} prebuiltSpecAliases - pre-built alias map; skip buildAliasMap if provided
 */
export function evaluateFormula(formula, rows, spec = {}, currentParent = {}, _depth = 0, setupItems = [], context = {}, prebuiltSpecAliases = null) {
  if (_depth > 10) return 0; // prevent infinite circular references
  if (!formula || !formula.toString().startsWith('=')) return formula;

  // Resolve alias references and conditions (like IF) first using resolveAlias
  const specAliases = prebuiltSpecAliases || buildAliasMap(spec);
  const resolvedFormula = resolveAlias(formula, specAliases);
  if (!resolvedFormula || !resolvedFormula.toString().startsWith('=')) {
    return resolvedFormula;
  }

  // Handle Special Excel Lookup for Setup Items: =IFERROR(INDEX((no_ref);MATCH($H34;ref;0));"...")
  const formulaUpper = formula.toString().toUpperCase();
  if (formulaUpper.includes('MATCH') && (formulaUpper.includes('REF') || formulaUpper.includes('SETUP'))) {
    const matchMatch = formula.toString().match(/MATCH\(\$?([A-Z]+)([0-9]+)\b/i);
    if (matchMatch) {
      const colLetter = matchMatch[1].toUpperCase();
      const rowStr = matchMatch[2];
      const rowNum = parseInt(rowStr) - 1; // 0-based index (visual row starts at 1)
      const field = COL_MAP[colLetter];
      
      let componentName = '';
      if (rows && rows[rowNum]) {
        componentName = rows[rowNum][field] || '';
      } else if (currentParent && (currentParent._idx === rowNum || rowNum === -1 || (rows && rows.length === 0))) {
        componentName = currentParent.komp || currentParent.modul || '';
      }
      
      if (componentName) {
        const foundSetup = (setupItems || []).find(s => s.name?.trim().toLowerCase() === componentName.trim().toLowerCase());
        if (foundSetup && foundSetup.no !== undefined && foundSetup.no !== null && foundSetup.no !== '') {
          return foundSetup.no;
        }
      }
      return '...';
    }
  }

  let expression = formula.substring(1).toUpperCase();

  // Build activeContext with globalConstants, spec, parent, and merge any provided context (e.g. namedRanges)
  const globalConstants = spec?.globalConstants || (typeof window !== 'undefined' ? window.__globalConstants : {});
  const baseContext = buildFormulaContext({}, rows, spec, currentParent, globalConstants);
  let activeContext = { ...baseContext, ...context };

  // 1. Substitute variables from activeContext in a single-pass regex token replacement
  if (activeContext) {
    expression = expression.replace(/\b[A-Z_a-z][A-Z_a-z0-9._]*\b/g, (match) => {
      const matchUpper = match.toUpperCase();
      const val = activeContext[matchUpper] ?? activeContext[match] ?? activeContext[match.toLowerCase()];
      return val !== undefined ? val : match;
    });
  }

  // 4. Handle Cell References (Excel style like H1, I10, AA5)
  expression = expression.replace(/([A-Z]{1,2})([0-9]+)/g, (match, colLetter, rowStr) => {
    const rowNum = parseInt(rowStr) - 1; // 0-based index (visual row starts at 1)
    const field = COL_MAP[colLetter];
    
    if (rows && rows[rowNum]) {
      let val = rows[rowNum][field];
      if (val && val.toString().startsWith('=')) {
        val = evaluateFormula(val, rows, spec, currentParent, _depth + 1, setupItems, activeContext, specAliases);
      }

      // Auto-derive dynamic thickness for empty finishing layer thickness cells
      if (val === undefined || val === null || val === '') {
        if (field === 't_luar') {
          const lFinVal = rows[rowNum]['l_fin'];
          const lFinEval = evaluateFormula(lFinVal, rows, spec, currentParent, _depth + 1, setupItems, activeContext, specAliases);
          let resolvedLapLuar = '';
          if (!localIsFinishingEmpty(lFinEval)) {
            resolvedLapLuar = localResolveLapisanFromCode(lFinEval, spec?.categories || []) || '';
          }
          if (resolvedLapLuar) {
            val = localGetFinishingThickness(resolveAlias(resolvedLapLuar, specAliases), spec?.categories || []);
          }
        } else if (field === 't_dalam') {
          const dFinVal = rows[rowNum]['d_fin'];
          const dFinEval = evaluateFormula(dFinVal, rows, spec, currentParent, _depth + 1, setupItems, activeContext, specAliases);
          let resolvedLapDalam = '';
          if (!localIsFinishingEmpty(dFinEval)) {
            resolvedLapDalam = localResolveLapisanFromCode(dFinEval, spec?.categories || []) || '';
          }
          if (resolvedLapDalam) {
            val = localGetFinishingThickness(resolveAlias(resolvedLapDalam, specAliases), spec?.categories || []);
          }
        }
      }

      const numericVal = parseFloat(val);
      return !isNaN(numericVal) ? numericVal : 0;
    }
    return 0;
  });

  try {
    // Convert Excel IF(cond, trueVal, falseVal) to JS ternary (cond ? trueVal : falseVal)
    expression = convertIFtoTernary(expression);

    const sanitized = expression.replace(/[^0-9+\-*/()., A-Z_!?:=<>]/g, '');
    if (!sanitized.trim()) return 0;

    // Retrieve or compile function (cache by sanitized expression)
    let func = compiledFnCache.get(sanitized);
    if (!func) {
      func = new Function('ROUNDDOWN', 'ROUNDUP', `return ${sanitized}`);
      if (compiledFnCache.size >= MAX_FN_CACHE) compiledFnCache.clear();
      compiledFnCache.set(sanitized, func);
    }

    return func(
      (number, num_digits = 0) => {
        const factor = Math.pow(10, num_digits);
        return (number >= 0 ? Math.floor(number * factor) : Math.ceil(number * factor)) / factor;
      },
      (number, num_digits = 0) => {
        const factor = Math.pow(10, num_digits);
        return (number >= 0 ? Math.ceil(number * factor) : Math.floor(number * factor)) / factor;
      }
    );
  } catch (e) {
    const errorKey = `${expression}:${e.message}`;
    if (!loggedErrors.has(errorKey)) {
      loggedErrors.add(errorKey);
      console.error('Formula Error:', e.message, 'Expression:', expression);
      if (loggedErrors.size > 100) {
        loggedErrors.clear();
      }
    }
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
    ['p', 'l', 't', 'jml', 'sub', 'p1', 'p2', 'l1', 'l2', 'l_fin', 'd_fin', 'no'].forEach(key => {
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

/**
 * Adjusts all formula row references in a flat breakdown array when rows are inserted or deleted.
 * @param {Array} data - The flat breakdown array
 * @param {number} startIdx - The 0-based index where the change starts
 * @param {number} shiftAmount - The number of rows added (positive) or removed (negative)
 */
export function adjustFormulasOnShift(data, startIdx, shiftAmount) {
  if (shiftAmount === 0 || !data) return data;
  
  return data.map(item => {
    const next = { ...item };
    ['p', 'l', 't', 'jml', 'sub', 'p1', 'p2', 'l1', 'l2', 'l_fin', 'd_fin', 'no'].forEach(key => {
      if (next[key] && next[key].toString().startsWith('=')) {
        next[key] = next[key].toString().replace(/([A-Z]{1,2})(\d+)/gi, (match, col, rowStr) => {
          const rowNum = parseInt(rowStr); // 1-based row number
          const rowIdx = rowNum - 1; // 0-based index
          
          if (shiftAmount > 0) {
            // Rows were inserted at or after startIdx.
            // Any reference to a row at or after startIdx shifts down.
            if (rowIdx >= startIdx) {
              const newRow = rowNum + shiftAmount;
              return col.toUpperCase() + newRow;
            }
          } else {
            // Rows were deleted.
            const deleteCount = Math.abs(shiftAmount);
            const deleteEnd = startIdx + deleteCount;
            
            if (rowIdx >= startIdx && rowIdx < deleteEnd) {
              return '#REF!';
            } else if (rowIdx >= deleteEnd) {
              const newRow = rowNum - deleteCount;
              return col.toUpperCase() + newRow;
            }
          }
          return match.toUpperCase();
        });
      }
    });
    return next;
  });
}

function localIsFinishingEmpty(code) {
  if (code === undefined || code === null) return true;
  const s = String(code).trim();
  return s === '' || s === '-';
}

function localResolveLapisanFromCode(code, categories = []) {
  if (localIsFinishingEmpty(code)) return '';
  const targetCode = String(code).trim();
  const cat = categories.find(c => c.code === 'tf');
  if (cat && Array.isArray(cat.items)) {
    const found = cat.items.find(item => {
      if (typeof item === 'string') return false;
      return String(item.code).trim() === targetCode;
    });
    if (found) return found.name;
  }
  return '';
}

function localGetFinishingThickness(name, categories = []) {
  if (name === undefined || name === null) return 0;
  const nameStr = String(name).trim();
  if (!nameStr || nameStr === '-' || nameStr === '0' || nameStr.toLowerCase() === 'polos' || nameStr.toLowerCase() === 'mentah' || nameStr.toLowerCase() === 'polos/mentah') return 0;

  const targetName = nameStr.toLowerCase();
  for (const catCode of ['lap_luar', 'lap_dalam', 'tf']) {
    const cat = categories.find(c => c.code === catCode);
    if (cat && Array.isArray(cat.items)) {
      const found = cat.items.find(item => {
        if (typeof item === 'string') return item.toLowerCase().trim() === targetName;
        return (item.name || '').toLowerCase().trim() === targetName;
      });
      if (found && typeof found === 'object' && found.tebal !== undefined && found.tebal !== '') {
        return parseFloat(found.tebal) || 0;
      }
    }
  }

  // Fallback defaults
  if (targetName.includes('hpl') || targetName.includes('wy_') || targetName.includes('dsk_') || targetName.includes('sk_') || targetName.includes('gm_') || targetName.includes('dxp_')) {
    return 1.0;
  }
  if (targetName.includes('duco') || targetName.includes('veneer') || targetName.includes('hb_') || targetName.includes('[aica]') || targetName === 'aica') {
    return 0.5;
  }

  return 0;
}
