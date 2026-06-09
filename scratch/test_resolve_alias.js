function buildCodeNameMaps(categories = []) {
  const nameToCode = {};
  const codeToName = {};

  categories.forEach(cat => {
    if (Array.isArray(cat.items)) {
      cat.items.forEach(item => {
        if (item && typeof item === 'object' && item.code !== undefined && item.name) {
          const c = String(item.code).trim().toLowerCase();
          const n = String(item.name).trim().toLowerCase();
          nameToCode[n] = c;
          codeToName[c] = n;
        }
      });
    }
  });

  return { nameToCode, codeToName };
}

function resolveAlias(val, specAliases = {}) {
  if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('@'))) {
    const key = val.slice(1).trim(); // strip '=' or '@'

    // If it's a numeric literal, return it
    if (key !== '' && !isNaN(Number(key))) {
      return Number(key);
    }

    // If it's a quoted string literal, strip quotes and return it
    if ((key.startsWith("'") && key.endsWith("'")) || (key.startsWith('"') && key.endsWith('"'))) {
      return key.slice(1, -1);
    }

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

          if (!isTrue && specAliases._nameToCode) {
            const leftCode = specAliases._nameToCode[leftStr] || leftStr;
            const rightCode = specAliases._nameToCode[rightStr] || rightStr;
            isTrue = leftCode.toString() === rightCode.toString();
          }
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

function buildAliasMap(spec = {}) {
  const specVals = spec.vals || {};
  const specAliases = spec.aliases || {};
  const specKodes = spec.kodes || {};
  const categories = spec.categories || [];
  const aliasMap = {};

  const { nameToCode, codeToName } = buildCodeNameMaps(categories);
  aliasMap._nameToCode = nameToCode;
  aliasMap._codeToName = codeToName;

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

    // Use code if available in spec.kodes, otherwise use value
    const valOrKode = (specKodes[key] !== undefined && specKodes[key] !== null && specKodes[key] !== '')
      ? specKodes[key]
      : val;

    // Register custom alias (dari template row.alias atau user-set)
    if (customAlias) registerAlias(customAlias, valOrKode);

    // Register label auto-generated
    registerAlias(label, valOrKode);
  });

  // Dynamic resolution for standard layer aliases based on their codes (Excel INDEX MATCH tf category logic)
  const kabinet1Val = aliasMap['kabinet1'] || '11';
  registerAlias('lap_blk_pintu', kabinet1Val);
  registerAlias('lap_inv_kab', '0');
  registerAlias('lap_pintu_mlp', '0');

  return aliasMap;
}

const categories = [
  {
    code: 'tf',
    items: [
      { code: '0', name: 'Polos' },
      { code: '11', name: 'HB_41130' }
    ]
  }
];

const spec = {
  vals: {
    'Lapisan Standard||Lapisan tidak terlihat u/ kab.': 'Polos'
  },
  aliases: {
    'Lapisan Standard||Lapisan tidak terlihat u/ kab.': 'lap_inv_kab'
  },
  kodes: {
    'Lapisan Standard||Lapisan tidak terlihat u/ kab.': '0'
  },
  categories
};

const aliasMap = buildAliasMap(spec);
console.log("aliasMap:", aliasMap);

const resolvedInv = resolveAlias('=lap_inv_kab', aliasMap);
console.log("RESOLVED INV KAB:", resolvedInv);

const resolvedIf = resolveAlias('=IF(lap_inv_kab=Polos,9,11)', aliasMap);
console.log("RESOLVED IF:", resolvedIf);
