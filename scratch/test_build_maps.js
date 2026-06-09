const { pool } = require('../breakdown-backend/src/db/index');

const HPL_MAP = {
  'DSK_5450_SM': '1',
  'HB_41130': '2',
  'Polos': '3',
  '(DSK_5450_SM rangka……+Aica)': '4',
  '[Aica]': '5',
  'SK_10455_UW': '6',
  'Aica': '7',
  '(SK_10455_UW rangka……+Aica)': '8'
};

const EDG_MAP = {
  // Wood Edging (te / cte)
  'Edg_Décor_1723_B': '11',
  'Edg_DSS_00206_SM': '3',
  'Melanor': '9',
  'Edg_EAP_5342_M0': '5',
  'Edg_Decor_1723_B_(55x1)': '22',
  'Edg_DSS_00206_SM_(45X1)': '4',
  'Edg_EAW_5216D1': '1',
  'Edg_EAW_5216_D1(44x1)': '2',
  'Trim 21 S2/S4 Brown Doff ( Alm. 75181 ) P3': '7',
  'Trim 22 S2/S4 Brown Doff ( Alm. 75270 ) P3': '8',
  'ST-36 Brown Doff ( Alm. 2351 ) P3 P3': '6',
  'Edg_EAP_1338_DO': '5',
  'Edg_Decor_2023_B': '66',

  // Aluminium Profiles (Fr / cfr) - as fallback in map
  'M-FRM Tutup Belakang Black Doff ( Alm. 75225 ) P3': '1',
  'M-FRM Body Black Doff ( Alm. 75226 ) P3': '2',
  'M-FRM-07 Black Doff ( Alm. 75355 ) P3': '3',
  'M-FRM-02 Black Doff ( Alm. 75227 ) P3': '4',
  'M-FRM-03 Brown Gloss ( Alm. 75229 ) P3': '5',
  'M-SHF-01/02 Brown Gloss ( Alm. 75109 ) P3': '6',
  '0x2a': '0'
};

function buildHplMap(categories = []) {
  const map = {};

  // 1. Populate from category 'tf' (Type Finished) which maps name -> val
  const tfCat = categories.find(c => c.code === 'tf');
  if (tfCat && Array.isArray(tfCat.items)) {
    tfCat.items.forEach(item => {
      if (item && typeof item === 'object' && item.name && item.val !== undefined) {
        const lName = item.name.toLowerCase().trim();
        if (map[lName] === undefined) {
          map[lName] = String(item.val);
        }
      }
    });
  }

  // 2. Fallback to hardcoded HPL_MAP (with lowercase keys)
  Object.entries(HPL_MAP).forEach(([key, val]) => {
    const lKey = key.toLowerCase().trim();
    if (map[lKey] === undefined) {
      map[lKey] = val;
    }
  });

  // 3. Fallback from lap_luar / lap_dalam just in case
  let nextIdx = Math.max(...Object.values(map).map(Number), 0) + 1;
  const hplCats = categories.filter(c => c.code === 'lap_luar' || c.code === 'lap_dalam');
  hplCats.forEach(cat => {
    (cat.items || []).forEach(item => {
      const name = typeof item === 'string' ? item : item.name;
      if (name) {
        const lName = name.toLowerCase().trim();
        if (map[lName] === undefined) {
          map[lName] = String(nextIdx++);
        }
      }
    });
  });

  return map;
}

function buildEdgMap(categories = []) {
  const map = {};

  // 1. Populate from categories 'te', 'alu', 'edg' using item.val (not code)
  const edgCats = categories.filter(c => c.code === 'edg' || c.code === 'te' || c.code === 'alu');
  edgCats.forEach(cat => {
    (cat.items || []).forEach(item => {
      if (item && typeof item === 'object' && item.name && item.val !== undefined && item.val !== null) {
        const lName = item.name.toLowerCase().trim();
        if (map[lName] === undefined) {
          map[lName] = String(item.val).trim();
        }
      }
    });
  });

  // 2. Fallback to hardcoded EDG_MAP (with lowercase keys)
  Object.entries(EDG_MAP).forEach(([key, val]) => {
    const lKey = key.toLowerCase().trim();
    if (map[lKey] === undefined) {
      map[lKey] = val;
    }
  });

  return map;
}

async function main() {
  const catRes = await pool.query('SELECT name, code, items FROM categories');
  const categories = catRes.rows;

  const hplMap = buildHplMap(categories);
  console.log("hplMap['polos'] =", hplMap['polos']);
  console.log("hplMap['hb_41130'] =", hplMap['hb_41130']);

  const edgMap = buildEdgMap(categories);
  console.log("edgMap['melanor'] =", edgMap['melanor']);

  await pool.end();
}

main();
