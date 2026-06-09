const { parts } = require('../src/partsData.js');

const keys = ['l', 'd', 'p1', 'p2', 'l1', 'l2', 'lap_luar', 'lap_dalam', 'edg_p1', 'edg_p2', 'edg_l1', 'edg_l2', 'bhn', 't'];

const untranslated = [];

parts.forEach(part => {
  keys.forEach(key => {
    const val = part[key];
    if (typeof val === 'string' && val.startsWith('=')) {
      // Check for cell references like Spek! or letters followed by numbers
      const hasSpek = val.includes('Spek!');
      // match any uppercase/lowercase letter followed by numbers (excluding things like TRIM21 or HPL or H1)
      // Excel references are usually like H12, W109, I283, A35, B42 etc.
      // Let's use a regex to find them, but ignore known project variables like:
      // - bahan1, bahan2, bahan3, bahan4, bahan5
      // - lap_inv_kab, lap_blk_pintu, lap_pintu_mlp, tip_lap_inv
      // - finishing_kabinet1, finishing_kabinet2, finishing_kabinet3
      // - TKAB, TLACI, TBLK, TSS, TW
      const matches = val.match(/\b[A-Z]\d+\b/gi);
      let hasCellRef = false;
      if (matches) {
        // filter out matches that are not known variables
        const cellRefs = matches.filter(m => !['H1', 'H2', 'V1', 'V2'].includes(m.toUpperCase()));
        if (cellRefs.length > 0) {
          hasCellRef = true;
        }
      }

      if (hasSpek || hasCellRef) {
        untranslated.push({
          code: part.val,
          name: part.name,
          field: key,
          formula: val
        });
      }
    }
  });
});

console.log(`Found ${untranslated.length} untranslated formulas:`);
untranslated.forEach(item => {
  console.log(`- Code ${item.code} (${item.name}) [${item.field}]: ${item.formula}`);
});
