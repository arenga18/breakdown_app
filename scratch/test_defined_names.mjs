import { evaluateFormula } from '../src/utils/calc.js';

const spec = {
  globalConstants: {
    MINIFIX_HETTICH: 12,
    DOWEL_8: 8.5,
    LAKBAN_KERTAS: 100
  }
};

const rows = [
  { isParent: true, modul: 'TEST_MODULE', p: '650', l: '600.00', t: '0', sub: '1', jml: '1', bhn: 'Ply', t_bhn: '18', _idx: 0 },
  { komp: 'Part 1', p: '=MINIFIX_HETTICH * 2', l: '=dowel_8 + 1.5', t: '=LAKBAN_KERTAS', _idx: 1 }
];

console.log('--- Testing Formula Resolution with globalConstants ---');

const pEval = evaluateFormula(rows[1].p, rows, spec, rows[0]);
console.log('Formula: =MINIFIX_HETTICH * 2 -> Evaluated:', pEval, ' (Expected: 24)');

const lEval = evaluateFormula(rows[1].l, rows, spec, rows[0]);
console.log('Formula: =dowel_8 + 1.5 -> Evaluated:', lEval, ' (Expected: 10)');

const tEval = evaluateFormula(rows[1].t, rows, spec, rows[0]);
console.log('Formula: =LAKBAN_KERTAS -> Evaluated:', tEval, ' (Expected: 100)');

if (pEval === 24 && lEval === 10 && tEval === 100) {
  console.log('\n✅ SUCCESS: All global constants resolved correctly!');
} else {
  console.error('\n❌ FAILURE: Mismatch in expected evaluation values.');
  process.exit(1);
}
