// Self-contained test for evaluateFormula coordinate mapping
import { COL_MAP } from '../src/utils/colMap.js';

function evaluateFormula(formula, rows, spec = {}, currentParent = {}, _depth = 0, setupItems = [], context = {}) {
  if (_depth > 10) return 0;
  if (!formula || !formula.toString().startsWith('=')) return formula;

  let expression = formula.substring(1).toUpperCase();

  // Handle cell references (like K28)
  expression = expression.replace(/([A-Z]{1,2})([0-9]+)/g, (match, colLetter, rowStr) => {
    const rowNum = parseInt(rowStr) - 1; // 0-based index (visual row starts at 1)
    const field = COL_MAP[colLetter];
    
    if (rows && rows[rowNum]) {
      let val = rows[rowNum][field];
      if (val && val.toString().startsWith('=')) {
        val = evaluateFormula(val, rows, spec, currentParent, _depth + 1, setupItems, context);
      }
      const numericVal = parseFloat(val);
      return !isNaN(numericVal) ? numericVal : 0;
    }
    return 0;
  });

  try {
    const sanitized = expression.replace(/[^0-9+\-*/()., A-Z_]/g, '');
    if (!sanitized.trim()) return 0;
    const func = new Function('ROUNDDOWN', 'ROUNDUP', `return ${sanitized}`);
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
    console.error('Formula Error:', e.message, 'Expression:', expression);
    return '#ERR!';
  }
}

// In our app, visual row 28 is at index 27 of rows.
// Let's create a rows array representing:
// Index 27: { isParent: true, modul: 'CB-SH6HOs', p: '650', l: '600.00', t: '0', sub: '1', jml: '1', bhn: 'Ply', t_bhn: '18' } -> visual Row 28
// Index 28: { komp: 'Dinding Samping I', p: '=K28', l: '=J28', t: '18', sub: '1', jml: '1' } -> visual Row 29

// We will pad the array so that the elements are at indices 27 and 28.
const rows = Array(27).fill({});
rows[27] = { isParent: true, modul: 'CB-SH6HOs', p: '650', l: '600.00', t: '0', sub: '1', jml: '1', bhn: 'Ply', t_bhn: '18', _idx: 27 };
rows[28] = { komp: 'Dinding Samping I', p: '=K28', l: '=J28', t: '18', sub: '1', jml: '1', _idx: 28 };

const resultI29 = evaluateFormula('=K28', rows, {}, rows[27]);
const resultJ29 = evaluateFormula('=J28', rows, {}, rows[27]);

console.log('--- TEST RESULTS ---');
console.log('I29 (=K28): Expected: 0, Got:', resultI29);
console.log('J29 (=J28): Expected: 600, Got:', resultJ29);

if (Number(resultI29) === 0 && Number(resultJ29) === 600) {
  console.log('✅ TEST PASSED!');
} else {
  console.error('❌ TEST FAILED!');
  process.exit(1);
}
