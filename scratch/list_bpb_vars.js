const fs = require('fs');

const data = JSON.parse(fs.readFileSync('/Applications/Arenga/vscode/breakdown_app/scratch/bpb_setting.json', 'utf8'));

const vars = new Set();
data.forEach(row => {
  if (row.nama_barang && row.nama_barang.startsWith('=')) {
    vars.add(row.nama_barang);
  }
});

console.log("Unique variable names:");
console.log(Array.from(vars).sort());
