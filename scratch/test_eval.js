import { evaluateFormula } from '../src/utils/calc.js';

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

const res = evaluateFormula(rows[0].p2, rows, spec, {});
console.log("RESULT IS:", res);
console.log("TYPE OF RESULT IS:", typeof res);
