function shiftTemplateFormulas(komponenItems, shiftAmount) {
  if (shiftAmount === 0 || !komponenItems) return komponenItems;
  return komponenItems.map(item => {
    const next = { ...item };
    ['p', 'l', 't', 'jml', 'sub', 'p1', 'p2', 'l1', 'l2'].forEach(key => {
      if (next[key] && next[key].toString().startsWith('=')) {
        next[key] = next[key].toString().replace(/[A-R](\d+)/gi, (match, d1) => {
          const newRow = parseInt(d1) + shiftAmount;
          return match[0].toUpperCase() + newRow;
        });
      }
    });
    return next;
  });
}

const komponenItems = [
  { p: '=H5/5', l: '=I5' }
];
const shiftAmount = 4;
const result = shiftTemplateFormulas(komponenItems, shiftAmount);
console.log('Original P:', komponenItems[0].p);
console.log('Shifted P:', result[0].p);
console.log('Original L:', komponenItems[0].l);
console.log('Shifted L:', result[0].l);
