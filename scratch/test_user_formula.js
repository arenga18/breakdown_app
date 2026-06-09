const { buildAliasMap, resolveAlias } = require('../src/utils/resolveAlias.js');

// Mock spec
const spec = {
  vals: {},
  aliases: {},
  kodes: {},
  categories: []
};

const specAliases = buildAliasMap(spec);
console.log('--- Alias Map ---');
console.log(specAliases);

const val1 = '=input_inv_kab';
const res1 = resolveAlias(val1, specAliases);
console.log(`resolveAlias("${val1}") =>`, res1);

const val2 = '=lap_inv_kab';
const res2 = resolveAlias(val2, specAliases);
console.log(`resolveAlias("${val2}") =>`, res2);
