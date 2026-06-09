const XLSX = require('xlsx');

const wb = XLSX.readFile('../master rekap 2026_Bom.xlsx');
const sheet = wb.Sheets['Data Validation'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const cols = ['W', 'X', 'Y', 'Z', 'AA', 'AB'];
const formulas = new Set();

for (let r = 7; r < data.length; r++) {
  const rowNum = r + 1;
  const codeVal = sheet['B' + rowNum]?.v;
  if (!codeVal) continue;
  const codeStr = codeVal.toString().trim();
  if (codeStr !== 'Parts' && codeStr !== 'Prt') continue;

  const valCell = sheet['D' + rowNum];
  if (!valCell || typeof valCell.v !== 'number' || valCell.v < 100) continue;

  const nameCell = sheet['C' + rowNum]?.v;

  let rowInfo = `Row ${rowNum}: Code=${valCell.v} Name="${nameCell}"`;
  let hasFormulas = false;
  cols.forEach(col => {
    const cell = sheet[col + rowNum];
    if (cell && cell.f) {
      rowInfo += ` | ${col}: "${cell.f}"`;
      formulas.add(`${col}: ${cell.f}`);
      hasFormulas = true;
    } else if (cell) {
      rowInfo += ` | ${col}: ${cell.v}`;
    }
  });
  if (hasFormulas) {
    console.log(rowInfo);
  }
}

console.log('\n--- Unique Formulas Found ---');
Array.from(formulas).sort().forEach(f => console.log(f));
