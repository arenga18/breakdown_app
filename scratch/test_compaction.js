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

function buildAliasMap(spec = {}, useValueForAliases = false) {
  const specVals = spec.vals || {};
  const specAliases = spec.aliases || {};
  const specKodes = spec.kodes || {};
  const categories = spec.categories || [];
  const aliasMap = {};

  const { nameToCode, codeToName } = buildCodeNameMaps(categories);
  aliasMap._nameToCode = nameToCode;
  aliasMap._codeToName = codeToName;

  // Helper: register sebuah alias key
  function registerAlias(alias, val) {
    if (!alias) return;
    aliasMap[alias] = val;
    aliasMap[alias.toLowerCase()] = val;
    aliasMap[alias.toUpperCase()] = val;
  }

  Object.entries(specVals).forEach(([key, val]) => {
    const parts = key.split('||');
    const label = parts[parts.length - 1].toUpperCase().replace(/\s+/g, '_');
    const customAlias = specAliases[key];

    const valOrKode = useValueForAliases
      ? val
      : ((specKodes[key] !== undefined && specKodes[key] !== null && specKodes[key] !== '')
          ? specKodes[key]
          : (val !== undefined && val !== null ? (nameToCode[val.toString().toLowerCase()] || val) : val));

    if (customAlias) registerAlias(customAlias, valOrKode);
    registerAlias(label, valOrKode);
  });

  // Dynamic resolution for standard layer aliases based on their codes
  const kabinet1Val = aliasMap['kabinet1'] || (useValueForAliases ? 'Polos' : '11');
  registerAlias('lap_blk_pintu', kabinet1Val);
  registerAlias('lap_inv_kab', useValueForAliases ? 'Polos' : '0');
  registerAlias('lap_pintu_mlp', useValueForAliases ? 'Polos' : '0');

  // Register HPL thickness cell references (Excel Spek Column E references)
  const getLayerThickness = (aliasKey) => {
    const name = useValueForAliases ? (aliasMap[aliasKey] || 'Polos') : (codeToName[aliasMap[aliasKey] || '0'] || 'Polos');
    return getFinishingThickness(name, categories);
  };

  const tLapisan1 = getLayerThickness('lapisan1');
  registerAlias('Spek!$E$48', tLapisan1);
  registerAlias('Spek!E48', tLapisan1);

  if (!useValueForAliases) {
    aliasMap._valueAliasMap = buildAliasMap(spec, true);
  }

  return aliasMap;
}

function resolvePartRow(item, specAliases = {}) {
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

const categories = [
  {
    code: 'tf',
    items: [
      { code: '0', name: 'Polos', tebal: 0 },
      { code: '11', name: 'Duco', tebal: 0.5 },
      { code: '1', name: 'HB_41130', tebal: 1.0 }
    ]
  }
];

const spec = {
  vals: {
    'Spesifikasi Lapisan||lapisan1 (HPL)': 'HB_41130',
    'Spesifikasi Lapisan||kabinet2 (HPL)': 'Duco',
    'Spesifikasi frame Alu||M_FRM Body': 'M-FRM Body Black Doff'
  },
  aliases: {
    'Spesifikasi Lapisan||lapisan1 (HPL)': 'lapisan1',
    'Spesifikasi Lapisan||kabinet2 (HPL)': 'kabinet2',
    'Spesifikasi frame Alu||M_FRM Body': 'fr1'
  },
  kodes: {},
  categories
};

const aliasMap = buildAliasMap(spec);

const partRow1 = {
  bhn: '=kabinet2',
  t: '=Spek!$E$48',
  v: '=fr_1'
};

const resolvedRow1 = resolvePartRow(partRow1, aliasMap);
console.log("Resolved Row 1 (bhn should be 'Duco', t should be 1):", resolvedRow1);
