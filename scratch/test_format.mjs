const formatDisplayValue = (val) => {
  if (val === undefined || val === null || val === '') return '';
  const num = Number(val);
  if (!isNaN(num) && typeof val !== 'boolean') {
    if (Number.isInteger(num)) return String(num);
    const rounded = Math.round(num * 10) / 10;
    if (Number.isInteger(rounded)) return String(rounded);
    return String(rounded).replace('.', ',');
  }
  return val;
};

const testCases = [
  { input: 1.00, expected: '1' },
  { input: '1.00', expected: '1' },
  { input: 600.00, expected: '600' },
  { input: '600.00', expected: '600' },
  { input: 19.5, expected: '19,5' },
  { input: '19.5', expected: '19,5' },
  { input: 'WY_5216_D(V)', expected: 'WY_5216_D(V)' },
  { input: 'Polos', expected: 'Polos' },
  { input: '-', expected: '-' },
  { input: null, expected: '' },
  { input: undefined, expected: '' }
];

console.log('--- RUNNING FORMAT TEST ---');
let failed = false;
for (const tc of testCases) {
  const result = formatDisplayValue(tc.input);
  if (result === tc.expected) {
    console.log(`✅ Input: ${tc.input} -> Got: "${result}"`);
  } else {
    console.error(`❌ Input: ${tc.input} -> Expected: "${tc.expected}", Got: "${result}"`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED!');
}
