/**
 * Auto-fills unpopulated columns in a row (e.g. from Excel migrations) using the template part's defaults.
 */
export function autoFillRowFromPart(row, parts) {
  if (!row || !row.komp || row.isParent) return row;
  if (!parts || parts.length === 0) return row;

  const cleanKomp = row.komp.trim();
  const partMatch = parts.find(p => p.name?.trim() === cleanKomp);
  if (!partMatch) return row;

  const updated = { ...row };

  const fields = [
    { target: 'bid', source: 'val' },
    { target: 'bhn', source: 'bhn' },
    { target: 't_bhn', source: 't' },
    { target: 'cat', source: 'code' },
    { target: 'kode', source: 'ks' },
    { target: 'opt', source: 'opt' },
    { target: 'l_fin', source: 'l' },
    { target: 'd_fin', source: 'd' },
    { target: 'p1', source: 'p1' },
    { target: 'p2', source: 'p2' },
    { target: 'l1', source: 'l1' },
    { target: 'l2', source: 'l2' },
    { target: 'lap_luar', source: 'lap_luar' },
    { target: 'lap_dalam', source: 'lap_dalam' },
    { target: 'edg_p1', source: 'edg_p1' },
    { target: 'edg_p2', source: 'edg_p2' },
    { target: 'edg_l1', source: 'edg_l1' },
    { target: 'edg_l2', source: 'edg_l2' },
    { target: 'engsel', source: 'engsel' },
    { target: 'rel', source: 'rel' },
    { target: 'dormec', source: 'q_dormec', transform: v => v > 0 ? String(v) : '' },
    { target: 'q_engsel', source: 'q_engsel' },
    { target: 'q_rel', source: 'q_rel' },
    { target: 'q_dormec', source: 'q_dormec' },
    { target: 'q_minifix', source: 'q_minifix' },
    { target: 'q_dowel', source: 'q_dowel' },
    { target: 'siku_joint', source: 'tipe_siku' },
    { target: 'screw_jf', source: 'tipe_screw' },
    { target: 'profil3', source: 'profil3' },
    { target: 'profil2', source: 'profil2' },
    { target: 'profil', source: 'profil' },
    { target: 'v', source: 'v' },
    { target: 'v2', source: 'v2' },
    { target: 'h', source: 'h' },
    { target: 'anodize', source: 'anodize' }
  ];

  fields.forEach(({ target, source, transform }) => {
    // Only auto-fill if the current row's field is empty (undefined, null, or empty string)
    if (updated[target] === undefined || updated[target] === null || updated[target] === '') {
      const val = partMatch[source];
      if (val !== undefined && val !== null) {
        updated[target] = transform ? transform(val) : val;
      }
    }
  });

  return updated;
}
