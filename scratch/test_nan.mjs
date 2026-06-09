import { evaluateFormula } from '../src/utils/calc.js';
import { resolveLapisanFromCode, getFinishingThickness } from '../src/utils/breakdownCalc.js';
import { buildAliasMap, resolveAlias } from '../src/utils/resolveAlias.js';

const spec = {
  categories: [
    {
      code: 'tf',
      items: [
        { name: 'WY_5216_D(V)', code: '1', tebal: '1.0' },
        { name: 'HB_41130', code: '11', tebal: '0.5' }
      ]
    }
  ]
};

const rows = [
  { isParent: true, modul: 'CB-SH6HOs', p: '650', l: '600.00', t: '0', sub: '1', jml: '1', bhn: 'Ply', t_bhn: '18', _idx: 0 },
  { komp: 'Dinding Samping I', l_fin: '1', d_fin: '11', t_luar: null, t_dalam: null, _idx: 1 }
];

const item = rows[1];

// Evaluate l_fin
const lFinEval = evaluateFormula(item.l_fin, rows, spec, rows[0]);
console.log('lFinEval:', lFinEval);

const dFinEval = evaluateFormula(item.d_fin, rows, spec, rows[0]);
console.log('dFinEval:', dFinEval);

let resolvedLapLuar = '';
if (lFinEval !== undefined && lFinEval !== null && lFinEval !== '') {
  resolvedLapLuar = resolveLapisanFromCode(lFinEval, spec.categories) || '';
}
console.log('resolvedLapLuar:', resolvedLapLuar);

let resolvedLapDalam = '';
if (dFinEval !== undefined && dFinEval !== null && dFinEval !== '') {
  resolvedLapDalam = resolveLapisanFromCode(dFinEval, spec.categories) || '';
}
console.log('resolvedLapDalam:', resolvedLapDalam);

const specAliases = buildAliasMap(spec);
const resolvedAliasLuar = resolveAlias(resolvedLapLuar, specAliases);
console.log('resolvedAliasLuar:', resolvedAliasLuar);

const evaluatedValW = getFinishingThickness(resolvedAliasLuar, spec.categories);
console.log('evaluatedValW (T.Luar):', evaluatedValW);

const evaluatedValY = getFinishingThickness(resolveAlias(resolvedLapDalam, specAliases), spec.categories);
console.log('evaluatedValY (T.Dlm):', evaluatedValY);
