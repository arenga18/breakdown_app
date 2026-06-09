/**
 * Unified Formula Context Builder
 */

import { buildAliasMap } from './resolveAlias';

/**
 * Builds a unified formula context containing all available variables and constants.
 * @param {Object} item - The current part item being evaluated
 * @param {Array} rows - Sibling items or global rows (to look up previous item)
 * @param {Object} spec - Specification object (usually state.spec)
 * @param {Object} parent - Current module parent item
 * @param {Object} globalConstants - Global constant overrides
 */
const contextCache = new WeakMap();

export function buildFormulaContext(item, rows = [], spec = {}, parent = {}, globalConstants = {}) {
  // If item is not passed or is an empty object, we can cache the context!
  const isCacheable = !item || Object.keys(item).length === 0;

  if (isCacheable && spec && typeof spec === 'object') {
    let specCache = contextCache.get(spec);
    if (!specCache) {
      specCache = new WeakMap();
      contextCache.set(spec, specCache);
    }
    const parentKey = parent && typeof parent === 'object' ? parent : {};
    const cached = specCache.get(parentKey);
    if (cached) {
      return cached;
    }
  }

  const context = {};

  // 1. Inject global constants (lowercase & uppercase)
  if (globalConstants) {
    Object.entries(globalConstants).forEach(([key, val]) => {
      context[key.toUpperCase()] = Number(val) || 0;
      context[key.toLowerCase()] = Number(val) || 0;
    });
  }

  // 2. Inject spec values (aliases and direct keys)
  const specVals = spec?.vals || spec || {};
  const specAliases = spec?.aliases || {};
  Object.entries(specVals).forEach(([key, val]) => {
    const numericVal = parseFloat(val);
    if (!isNaN(numericVal)) {
      context[key.toUpperCase()] = numericVal;

      const parts = key.split('||');
      const label = parts[parts.length - 1].toUpperCase().replace(/\s+/g, '_');
      context[label] = numericVal;

      const customAlias = specAliases[key];
      if (customAlias) {
        context[customAlias.toUpperCase()] = numericVal;
      }

      // Hardcoded compat
      if ((label.includes('TEBAL') || label.includes('KOMPONEN')) && label.includes('KABINET')) {
        context['TKAB'] = numericVal;
      }
      if ((label.includes('TEBAL') || label.includes('KOMPONEN')) && label.includes('LACI')) {
        context['TLACI'] = numericVal;
      }
      if (label.includes('DINDING_BLK') || (label.includes('DINDING') && label.includes('BLK'))) {
        context['TBLK'] = numericVal;
      }
    }
  });

  // Inject all resolved alias values/codes from buildAliasMap
  const resolvedAliasMap = buildAliasMap(spec);
  Object.entries(resolvedAliasMap).forEach(([aliasKey, aliasVal]) => {
    if (aliasKey.startsWith('_')) return; // skip internal properties like _nameToCode
    const numericVal = parseFloat(aliasVal);
    if (!isNaN(numericVal)) {
      context[aliasKey.toUpperCase()] = numericVal;
      context[aliasKey.toLowerCase()] = numericVal;
      // Also register version with underscores replaced (e.g. TRIM_21 -> TRIM21)
      const noUs = aliasKey.replace(/_/g, '');
      context[noUs.toUpperCase()] = numericVal;
      context[noUs.toLowerCase()] = numericVal;
    }
  });

  // 3. Inject Parent variables
  if (parent) {
    const parentP = parseFloat(parent.p) || 0;
    const parentL = parseFloat(parent.l) || 0;
    const parentT = parseFloat(parent.t) || 0;
    const parentJml = parseFloat(parent.jml) || 1;

    context['PARENT_P'] = parentP;
    context['PARENT_L'] = parentL;
    context['PARENT_T'] = parentT;
    context['PARENT_JML'] = parentJml;

    // S shorthand
    context['P'] = parentP;
    context['L'] = parentL;
    context['T'] = parentT;
  }

  // Cache base context if it is cacheable
  if (isCacheable && spec && typeof spec === 'object') {
    const parentKey = parent && typeof parent === 'object' ? parent : {};
    contextCache.get(spec).set(parentKey, context);
  }

  // 4. Inject Prev variables (find first prt row preceding item in rows)
  const idx = rows.findIndex(r => r === item || (r.id && r.id === item.id) || (r._idx !== undefined && r._idx === item._idx));
  let prev = null;
  if (idx > 0) {
    for (let i = idx - 1; i >= 0; i--) {
      const r = rows[i];
      if (r.type === 'prt') {
        prev = r;
        break;
      } else if (r.type === 'Set_up' || r.type === 'Ref' || r.isParent) {
        // Hit parent boundary
        break;
      }
    }
  }

  if (prev) {
    // Sibling dimensions could also be formulas, but when they are loaded here we expect resolved or simple values.
    // To avoid circular refs, we parse them as floats.
    context['PREV_P'] = parseFloat(prev.p) || 0;
    context['PREV_L'] = parseFloat(prev.l) || 0;
    context['PREV_T'] = parseFloat(prev.t) || 0;
  } else {
    context['PREV_P'] = 0;
    context['PREV_L'] = 0;
    context['PREV_T'] = 0;
  }

  return context;
}
