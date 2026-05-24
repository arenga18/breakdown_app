/**
 * Resolves alias references (=aliasKey or @aliasKey) against a spec's resolved aliases.
 * Non-alias values are returned as-is.
 * 
 * @param {string} val - value from partsData, e.g. "=lapisan3" or "Ply"
 * @param {object} specAliases - resolved alias map from current spek, e.g. { lapisan3: "SK_10455_UW" }
 * @returns {string} resolved value
 */
export function resolveAlias(val, specAliases = {}) {
  if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('@'))) {
    const key = val.slice(1).trim(); // strip '=' or '@'

    // If the expression has an IF condition, let's parse it!
    // Example: IF(bahan2=MDF, bahan4, bahan5)
    if (key.startsWith('IF(') && key.endsWith(')')) {
      const inside = key.slice(3, -1);
      const parts = inside.split(/[,;]/).map(p => p.trim());
      if (parts.length === 3) {
        const [cond, trueExpr, falseExpr] = parts;
        let isTrue = false;

        if (cond.includes('!=') || cond.includes('<>')) {
          const [left, right] = cond.split(/!=|<>|\bne\b/).map(p => p.trim().replace(/['"]/g, ''));
          const leftVal = (specAliases[left] ?? specAliases[left.toLowerCase()] ?? specAliases[left.toUpperCase()] ?? left) || '';
          isTrue = leftVal.toString() !== right;
        } else if (cond.includes('=') || cond.includes('==')) {
          const [left, right] = cond.split(/==|=/).map(p => p.trim().replace(/['"]/g, ''));
          const leftVal = (specAliases[left] ?? specAliases[left.toLowerCase()] ?? specAliases[left.toUpperCase()] ?? left) || '';

          const leftStr = leftVal.toString().toLowerCase();
          const rightStr = right.toString().toLowerCase();

          isTrue = leftStr === rightStr ||
            (rightStr === 'mdf' && (leftStr === 'mdf' || leftStr === 'mdf hijau'));
        }

        const selectedExpr = isTrue ? trueExpr : falseExpr;
        return resolveAlias('=' + selectedExpr, specAliases);
      }
    }

    // First try the exact key, then lowercase, then uppercase
    return specAliases[key] ?? specAliases[key.toLowerCase()] ?? specAliases[key.toUpperCase()] ?? val;
  }
  return val;
}

/**
 * Resolves all alias fields in a breakdown item against current spec.
 * Priority: item value with =alias > spekRefs mapping > static default value.
 */
export function resolveBreakdownItem(item, specAliases = {}) {
  const aliasFields = ['bhn', 'lap_luar', 'lap_dalam', 't_luar', 't_dalam', 'edg_p1', 'edg_p2', 'edg_l1', 'edg_l2'];
  const resolved = { ...item };
  aliasFields.forEach(field => {
    let val = resolved[field];
    if (!val) return;

    // Strategy 1: value already uses =alias syntax
    if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('@'))) {
      resolved[field] = resolveAlias(val, specAliases);
      return;
    }

    // Strategy 2: use spekRefs mapping if available
    if (item.spekRefs && item.spekRefs[field]) {
      const aliasKey = '=' + item.spekRefs[field];
      const resolvedVal = resolveAlias(aliasKey, specAliases);
      // Only use resolved value if alias actually resolved (not returned as-is)
      if (resolvedVal !== aliasKey) {
        resolved[field] = resolvedVal;
        return;
      }
    }

    // Strategy 3: fallback to static value (no resolution needed)
    resolved[field] = val;
  });
  return resolved;
}

/**
 * Builds a flat alias map from spec values and aliases configuration.
 * 
 * @param {object} spec - Current spec object from state
 * @returns {object} Flat mapping of aliases/labels to their current values
 */
export function buildAliasMap(spec = {}) {
  const specVals = spec.vals || {};
  const specAliases = spec.aliases || {};
  const aliasMap = {};

  // Helper: register sebuah alias key dalam semua variasi format
  function registerAlias(alias, val) {
    if (!alias) return;
    aliasMap[alias] = val;                              // asli
    aliasMap[alias.toLowerCase()] = val;               // lowercase
    aliasMap[alias.toUpperCase()] = val;               // uppercase
    // versi tanpa underscore: BAHAN_1 -> bahan1, bahan_1 -> bahan1
    const noUs = alias.replace(/_/g, '');
    aliasMap[noUs] = val;
    aliasMap[noUs.toLowerCase()] = val;
    aliasMap[noUs.toUpperCase()] = val;
  }

  Object.entries(specVals).forEach(([key, val]) => {
    const parts = key.split('||');
    const label = parts[parts.length - 1].toUpperCase().replace(/\s+/g, '_');
    const customAlias = specAliases[key];

    // Register custom alias (dari template row.alias atau user-set)
    if (customAlias) registerAlias(customAlias, val);

    // Register label auto-generated
    registerAlias(label, val);

    // Hardcoded Excel alias keys
    if (label.includes('TEBAL') && label.includes('KABINET')) {
      aliasMap['TKAB'] = val;
      aliasMap['tkab'] = val;
    }
    if (label.includes('TEBAL') && label.includes('LACI')) {
      aliasMap['TLACI'] = val;
      aliasMap['tlaci'] = val;
    }
    if (label.includes('DINDING_BLK')) {
      aliasMap['TBLK'] = val;
      aliasMap['tblk'] = val;
    }
  });

  return aliasMap;
}