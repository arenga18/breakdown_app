const COL_MAP = {
  A: 'code', B: 'cat', C: 'type', D: 'kode', E: 'tpk', F: 'no', G: 'opt',
  H: 'komp', I: 'p', J: 'l', K: 't', L: 'sub', M: 'jml',
  N: 'bhn', O: 't_bhn', P: 'l_fin', Q: 'd_fin',
  R: 'p1', S: 'p2', T: 'l1', U: 'l2',
  V: 'lap_luar', W: 't_luar', X: 'lap_dalam', Y: 't_dalam',
  Z: 'edg_p1', AA: 'edg_p2', AB: 'edg_l1', AC: 'edg_l2'
};

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

    // Hardcoded Excel alias keys — match both TEBAL_KABINET and KOMPONEN_KABINET patterns
    if ((label.includes('TEBAL') || label.includes('KOMPONEN')) && label.includes('KABINET')) {
      aliasMap['TKAB'] = val;
      aliasMap['tkab'] = val;
    }
    if ((label.includes('TEBAL') || label.includes('KOMPONEN')) && label.includes('LACI')) {
      aliasMap['TLACI'] = val;
      aliasMap['tlaci'] = val;
    }
    if (label.includes('DINDING_BLK') || (label.includes('DINDING') && label.includes('BLK'))) {
      aliasMap['TBLK'] = val;
      aliasMap['tblk'] = val;
    }
  });

  // Dynamic resolution for standard layer aliases based on their codes (Excel INDEX MATCH tf category logic)
  const kabinet1Val = aliasMap['kabinet1'] || 'Polos';
  registerAlias('lap_blk_pintu', kabinet1Val);
  registerAlias('lap_inv_kab', 'Polos');
  registerAlias('lap_pintu_mlp', 'Polos');

  // Register finishing_kabinet types dynamically
  const isPaper1 = kabinet1Val.toLowerCase().includes('paper');
  registerAlias('finishing_kabinet1', isPaper1 ? 'paper' : 'HPL');

  const kabinet2Val = aliasMap['kabinet2'] || 'Polos';
  const isPaper2 = kabinet2Val.toLowerCase().includes('paper');
  registerAlias('finishing_kabinet2', isPaper2 ? 'paper' : 'HPL');

  const kabinet3Val = aliasMap['kabinet3'] || 'Polos';
  const isPaper3 = kabinet3Val.toLowerCase().includes('paper');
  registerAlias('finishing_kabinet3', isPaper3 ? 'paper' : 'HPL');

  return aliasMap;
}

function evaluateFormula(formula, rows, spec = {}, currentParent = {}, _depth = 0) {
  if (_depth > 10) return 0;
  if (!formula || !formula.toString().startsWith('=')) return formula;

  // Resolve alias references and conditions (like IF) first using resolveAlias
  const specAliases = buildAliasMap(spec);
  const resolvedFormula = resolveAlias(formula, specAliases);
  if (!resolvedFormula || !resolvedFormula.toString().startsWith('=')) {
    return resolvedFormula;
  }

  let expression = resolvedFormula.substring(1).toUpperCase();

  const specVals = spec.vals || spec;
  const specAliasesObj = spec.aliases || {};

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  Object.entries(specVals).forEach(([key, val]) => {
    const parts = key.split('||');
    const label = parts[parts.length - 1].toUpperCase().replace(/\s+/g, '_');
    const customAlias = specAliasesObj[key] || null;
    
    const keysToTry = [label];
    if (customAlias) keysToTry.push(customAlias.toUpperCase());

    const uniqueKeys = [...new Set(keysToTry)].filter(Boolean);

    uniqueKeys.forEach(k => {
      const regex = new RegExp(`\\b${esc(k)}\\b`, 'g');
      const numericVal = parseFloat(val);
      if (!isNaN(numericVal)) {
        expression = expression.replace(regex, numericVal);
      }
    });
  });

  if (currentParent) {
    expression = expression.replace(/\bP\b/g, currentParent.p || 0);
    expression = expression.replace(/\bL\b/g, currentParent.l || 0);
    expression = expression.replace(/\bT\b/g, currentParent.t || 0);
  }

  expression = expression.replace(/([A-Z]{1,2})([0-9]+)/g, (match, colLetter, rowStr) => {
    const rowNum = parseInt(rowStr) - 1;
    const field = COL_MAP[colLetter];
    if (rows && rows[rowNum]) {
      let val = rows[rowNum][field];
      if (val && val.toString().startsWith('=')) {
        val = evaluateFormula(val, rows, spec, currentParent, _depth + 1);
      }
      const numericVal = parseFloat(val);
      return !isNaN(numericVal) ? numericVal : 0;
    }
    return 0;
  });

  try {
    const sanitized = expression.replace(/[^0-9+\-*/(). ]/g, '');
    if (!sanitized.trim()) return 0;
    return new Function(`return ${sanitized}`)();
  } catch (e) {
    console.error('Formula Error:', e, 'Expression:', expression);
    return '#ERR!';
  }
}

const spec = {
  vals: {
    'Lapisan Standard||Lapisan tidak terlihat u/ kab.': 'Polos'
  },
  aliases: {
    'Lapisan Standard||Lapisan tidak terlihat u/ kab.': 'lap_inv_kab'
  }
};

const rows = [
  { p2: '=IF(lap_inv_kab=Polos,9,11)' }
];

console.log("RESULT IS:", evaluateFormula(rows[0].p2, rows, spec, {}));
