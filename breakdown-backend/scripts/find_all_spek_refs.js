const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '../../master rekap 2026_Bom.xlsx');
const wb = XLSX.readFile(excelPath);
const sheet = wb.Sheets['Data Validation'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

const spekRefs = new Set();

for (let r = 0; r < data.length; r++) {
  const rowNum = r + 1;
  for (let colVal = 0; colVal < 40; colVal++) {
    const colLetter = XLSX.utils.encode_col(colVal);
    const cell = sheet[colLetter + rowNum];
    if (cell && cell.f && cell.f.includes('Spek!')) {
      // Find all matches of Spek!... using regex
      const matches = cell.f.match(/Spek!\$?[A-Z]+\$?[0-9]+/g);
      if (matches) {
        matches.forEach(m => spekRefs.add(m));
      }
    }
  }
}

console.log('--- All Spek! Cell References in Formulas ---');
Array.from(spekRefs).sort().forEach(r => console.log(r));
