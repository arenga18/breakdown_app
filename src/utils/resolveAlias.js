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
          const cleanLeft = left.replace(/_/g, '');
          const leftVal = (specAliases[left] ?? specAliases[left.toLowerCase()] ?? specAliases[left.toUpperCase()]
            ?? specAliases[cleanLeft] ?? specAliases[cleanLeft.toLowerCase()] ?? specAliases[cleanLeft.toUpperCase()] ?? left) || '';
          isTrue = leftVal.toString() !== right;
        } else if (cond.includes('=') || cond.includes('==')) {
          const [left, right] = cond.split(/==|=/).map(p => p.trim().replace(/['"]/g, ''));
          const cleanLeft = left.replace(/_/g, '');
          const leftVal = (specAliases[left] ?? specAliases[left.toLowerCase()] ?? specAliases[left.toUpperCase()]
            ?? specAliases[cleanLeft] ?? specAliases[cleanLeft.toLowerCase()] ?? specAliases[cleanLeft.toUpperCase()] ?? left) || '';

          const leftStr = leftVal.toString().toLowerCase();
          const rightStr = right.toString().toLowerCase();

          isTrue = leftStr === rightStr ||
            (rightStr === 'mdf' && (leftStr === 'mdf' || leftStr === 'mdf hijau'));

          if (!isTrue && specAliases._nameToCode) {
            const leftCode = specAliases._nameToCode[leftStr] || leftStr;
            const rightCode = specAliases._nameToCode[rightStr] || rightStr;
            isTrue = leftCode.toString() === rightCode.toString();
          }

          // Also try resolving leftVal as a category code → name via _codeToName
          if (!isTrue && specAliases._codeToName) {
            const leftName = (specAliases._codeToName[leftStr] || leftStr).toLowerCase();
            isTrue = leftName === rightStr;
          }

          // Also try looking up the name (value) form of the alias via _valueAliasMap.
          // This handles aliases like lap_inv_kab that store tf codes ('0') in the main map
          // but need to compare against HPL names ('Polos') in IF conditions.
          if (!isTrue && specAliases._valueAliasMap) {
            const leftNameVal = (
              specAliases._valueAliasMap[left] ??
              specAliases._valueAliasMap[left.toLowerCase()] ??
              specAliases._valueAliasMap[left.toUpperCase()] ??
              specAliases._valueAliasMap[cleanLeft] ??
              specAliases._valueAliasMap[cleanLeft.toLowerCase()] ?? ''
            ).toString().toLowerCase();
            isTrue = leftNameVal === rightStr ||
              (rightStr === 'mdf' && (leftNameVal === 'mdf' || leftNameVal === 'mdf hijau'));
          }
        }

        const selectedExpr = isTrue ? trueExpr : falseExpr;
        return resolveAlias('=' + selectedExpr, specAliases);
      }
    }

    // First try exact, then lower/uppercase, then without underscores
    const cleanKey = key.replace(/_/g, '');
    return specAliases[key] ?? specAliases[key.toLowerCase()] ?? specAliases[key.toUpperCase()]
      ?? specAliases[cleanKey] ?? specAliases[cleanKey.toLowerCase()] ?? specAliases[cleanKey.toUpperCase()]
      ?? val;
  }
  return val;
}

/**
 * Resolves all alias fields in a breakdown item against current spec.
 * Priority: item value with =alias > spekRefs mapping > static default value.
 */
export function resolveBreakdownItem(item, specAliases = {}) {
  const resolved = { ...item };
  const localAliases = { ...specAliases };
  const valueAliasMap = specAliases._valueAliasMap || specAliases;

  const firstPassFields = ['bhn', 'l_fin', 'd_fin', 'p1', 'p2', 'l1', 'l2'];
  const secondPassFields = ['lap_luar', 'lap_dalam', 't_luar', 't_dalam', 'edg_p1', 'edg_p2', 'edg_l1', 'edg_l2'];

  const resolveField = (field) => {
    let val = resolved[field];
    if (val === undefined || val === null || val === '') return val;

    // Strategy 1: value already uses =alias syntax
    if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('@'))) {
      const aliasesToUse = field === 'bhn' ? valueAliasMap : localAliases;
      return resolveAlias(val, aliasesToUse);
    }

    // Strategy 2: use spekRefs mapping if available
    if (item.spekRefs && item.spekRefs[field]) {
      const aliasKey = '=' + item.spekRefs[field];
      const aliasesToUse = field === 'bhn' ? valueAliasMap : localAliases;
      const resolvedVal = resolveAlias(aliasKey, aliasesToUse);
      if (resolvedVal !== aliasKey) {
        return resolvedVal;
      }
    }

    return val;
  };

  firstPassFields.forEach(field => {
    const resolvedVal = resolveField(field);
    resolved[field] = resolvedVal;
    localAliases[field] = resolvedVal;
    if (field === 'l_fin') localAliases['l'] = resolvedVal;
    if (field === 'd_fin') localAliases['d'] = resolvedVal;
  });

  secondPassFields.forEach(field => {
    resolved[field] = resolveField(field);
  });

  return resolved;
}

/**
 * Resolves all alias fields in a parts master row against current spec.
 * Uses a sequential resolution pass so that relative field references (like l)
 * can resolve to the evaluated value of the row's other cells.
 */
export function resolvePartRow(item, specAliases = {}) {
  const resolved = { ...item };
  const localAliases = { ...specAliases };
  const valueAliasMap = specAliases._valueAliasMap || specAliases;

  const firstPassFields = ['bhn', 'val', 'opt', 'jml', 't', 'l', 'd', 'p1', 'p2', 'l1', 'l2'];
  const secondPassFields = [
    'minifix', 'dowel', 'tipe_siku', 'q_siku', 'tipe_screw', 'q_screw',
    'v', 'v2', 'h', 'profil3', 'profil2', 'profil',
    'rel', 'engsel', 'anodize', 'q_anodize', 'p_val', 'l_val', 'q_siku_joint', 'q_screw_jf'
  ];

  const resolveField = (field) => {
    let val = resolved[field];
    if (val === undefined || val === null || val === '') return val;

    if (typeof val === 'string' && (val.startsWith('=') || val.startsWith('@'))) {
      const aliasesToUse = field === 'bhn' ? valueAliasMap : localAliases;
      return resolveAlias(val, aliasesToUse);
    }
    return val;
  };

  firstPassFields.forEach(field => {
    const resolvedVal = resolveField(field);
    resolved[field] = resolvedVal;
    localAliases[field] = resolvedVal;
  });

  secondPassFields.forEach(field => {
    resolved[field] = resolveField(field);
  });

  return resolved;
}

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

function getFinishingThickness(name, categories = []) {
  if (!name || name === 'Polos' || name === 'Mentah') return 0;
  const cleanName = name.toString().trim().toLowerCase();
  const cat = categories.find(c => c.code === 'tf');
  if (cat && Array.isArray(cat.items)) {
    const found = cat.items.find(item => {
      if (typeof item === 'string') return item.trim().toLowerCase() === cleanName;
      return item.name && item.name.toString().trim().toLowerCase() === cleanName;
    });
    if (found && found.tebal !== undefined) {
      return parseFloat(found.tebal) || 0;
    }
  }
  if (cleanName.includes('hpl')) return 1.0;
  if (cleanName.includes('decosheet') || cleanName.includes('duco') || cleanName.includes('melanor')) return 0.5;
  return 0;
}

/**
 * Builds a flat alias map from spec values and aliases configuration.
 * 
 * @param {object} spec - Current spec object from state
 * @returns {object} Flat mapping of aliases/labels to their current values
 */
const aliasMapCache = new WeakMap();

export function buildAliasMap(spec = {}, useValueForAliases = false) {
  if (!spec || typeof spec !== 'object') {
    return buildAliasMapRaw(spec, useValueForAliases);
  }

  let cacheEntry = aliasMapCache.get(spec);
  if (!cacheEntry) {
    cacheEntry = {};
    aliasMapCache.set(spec, cacheEntry);
  }

  const cacheKey = useValueForAliases ? 'valMap' : 'codeMap';
  if (cacheEntry[cacheKey]) {
    return cacheEntry[cacheKey];
  }

  const result = buildAliasMapRaw(spec, useValueForAliases);
  cacheEntry[cacheKey] = result;
  return result;
}

function buildAliasMapRaw(spec = {}, useValueForAliases = false) {
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

    // Use code if available in spec.kodes, otherwise try category name-to-code mapping, otherwise use value
    const valOrKode = useValueForAliases
      ? val
      : ((specKodes[key] !== undefined && specKodes[key] !== null && specKodes[key] !== '')
          ? specKodes[key]
          : (val !== undefined && val !== null ? (nameToCode[val.toString().toLowerCase()] || val) : val));

    // Register custom alias (dari template row.alias atau user-set)
    if (customAlias) registerAlias(customAlias, valOrKode);

    // Register label auto-generated
    registerAlias(label, valOrKode);

    // Hardcoded Excel alias keys — match both TEBAL_KABINET and KOMPONEN_KABINET patterns
    if ((label.includes('TEBAL') || label.includes('KOMPONEN')) && label.includes('KABINET')) {
      aliasMap['TKAB'] = valOrKode;
      aliasMap['tkab'] = valOrKode;
    }
    if ((label.includes('TEBAL') || label.includes('KOMPONEN')) && label.includes('LACI')) {
      aliasMap['TLACI'] = valOrKode;
      aliasMap['tlaci'] = valOrKode;
    }
    if (label.includes('DINDING_BLK') || (label.includes('DINDING') && label.includes('BLK'))) {
      aliasMap['TBLK'] = valOrKode;
      aliasMap['tblk'] = valOrKode;
    }
  });

  // Register globalConstants
  const globalConstants = spec.globalConstants || {};
  Object.entries(globalConstants).forEach(([key, val]) => {
    registerAlias(key, val);
  });


  // Dynamic resolution for standard layer aliases based on their codes (Excel INDEX MATCH tf category logic)
  const kabinet1Val = aliasMap['kabinet1'] || (useValueForAliases ? 'Polos' : '11');
  registerAlias('lap_blk_pintu', kabinet1Val);
  registerAlias('lap_inv_kab', useValueForAliases ? 'Polos' : '0');
  registerAlias('lap_pintu_mlp', useValueForAliases ? 'Polos' : '0');

  // Register finishing_kabinet types dynamically
  const kabinet1Name = useValueForAliases ? kabinet1Val : (codeToName[kabinet1Val] || 'Polos');
  const isPaper1 = kabinet1Name.toLowerCase().includes('paper');
  registerAlias('finishing_kabinet1', isPaper1 ? 'paper' : 'HPL');

  const kabinet2Val = aliasMap['kabinet2'] || (useValueForAliases ? 'Polos' : '0');
  const kabinet2Name = useValueForAliases ? kabinet2Val : (codeToName[kabinet2Val] || 'Polos');
  const isPaper2 = kabinet2Name.toLowerCase().includes('paper');
  registerAlias('finishing_kabinet2', isPaper2 ? 'paper' : 'HPL');

  const kabinet3Val = aliasMap['kabinet3'] || (useValueForAliases ? 'Polos' : '0');
  const kabinet3Name = useValueForAliases ? kabinet3Val : (codeToName[kabinet3Val] || 'Polos');
  const isPaper3 = kabinet3Name.toLowerCase().includes('paper');
  registerAlias('finishing_kabinet3', isPaper3 ? 'paper' : 'HPL');

  // Helper to register standard cell references and named ranges (like Spek!$D$30, tbl_komp_laci)
  const tkabVal = aliasMap['tkab'] || 18;
  const tlaciVal = aliasMap['tlaci'] || 12;
  const tblkVal = aliasMap['tblk'] || 6;
  const tssVal = aliasMap['tss'] || 18;
  const twVal = aliasMap['tw'] || 27;

  registerAlias('Spek!$D$28', tkabVal);
  registerAlias('Spek!D28', tkabVal);
  registerAlias('Spek!$D$29', tlaciVal);
  registerAlias('Spek!D29', tlaciVal);
  registerAlias('tbl_komp_laci', tlaciVal);
  registerAlias('Spek!$D$30', tblkVal);
  registerAlias('Spek!D30', tblkVal);
  registerAlias('Spek!$D$31', tssVal);
  registerAlias('Spek!D31', tssVal);
  registerAlias('Spek!$D$32', twVal);
  registerAlias('Spek!D32', twVal);

  // Register HPL thickness cell references (Excel Spek Column E references)
  const getLayerThickness = (aliasKey) => {
    const name = useValueForAliases ? (aliasMap[aliasKey] || 'Polos') : (codeToName[aliasMap[aliasKey] || '0'] || 'Polos');
    return getFinishingThickness(name, categories);
  };

  const tLapisan1 = getLayerThickness('lapisan1');
  registerAlias('Spek!$E$48', tLapisan1);
  registerAlias('Spek!E48', tLapisan1);

  const tLapisan3 = getLayerThickness('lapisan3');
  registerAlias('Spek!$E$52', tLapisan3);
  registerAlias('Spek!E52', tLapisan3);

  const tLapisan5 = getLayerThickness('lapisan5');
  registerAlias('Spek!$E$56', tLapisan5);
  registerAlias('Spek!E56', tLapisan5);

  if (!useValueForAliases) {
    aliasMap._valueAliasMap = buildAliasMap(spec, true);
  }

  return aliasMap;
}