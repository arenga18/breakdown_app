const { parts } = require('../src/partsData.js');

let numCount = 0;
parts.forEach((part, idx) => {
  Object.entries(part).forEach(([key, val]) => {
    if (key !== 'spekRefs' && typeof val === 'number') {
      console.log(`Found numeric value in part at index ${idx} (val=${part.val}) [${key}]: ${val}`);
      numCount++;
    }
  });
});

console.log(`Validation finished. Total numeric values found: ${numCount}`);
if (numCount === 0) {
  console.log('✓ Validation PASSED: All fields are text strings.');
} else {
  console.log('✗ Validation FAILED: Found numeric values.');
  process.exit(1);
}
