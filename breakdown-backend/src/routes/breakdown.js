const router = require('express').Router();
const { query: db, getClient } = require('../db');
const { asyncHandler, paginate } = require('../middleware');

const parseFloatOrNull = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? null : parsed;
};

// GET /breakdown?modul_id=&project_id=&bhn=&type=
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { modul_id, project_id, bhn, type, cat } = req.query;

  let where = 'WHERE 1=1';
  const params = [];

  if (modul_id)    { params.push(modul_id);    where += ` AND modul_id = $${params.length}`; }
  if (project_id)  { params.push(project_id);  where += ` AND project_id = $${params.length}`; }
  if (bhn)         { params.push(bhn);          where += ` AND bhn ILIKE $${params.length}`; }
  if (type)        { params.push(type);         where += ` AND type = $${params.length}`; }
  if (cat)         { params.push(cat);          where += ` AND cat = $${params.length}`; }

  const countRes = await db(`SELECT COUNT(*) FROM breakdown_rows ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await db(`
    SELECT * FROM breakdown_rows ${where}
    ORDER BY urutan, created_at
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  res.json({ data: result.rows, total, page, limit });
}));

// GET /breakdown/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM breakdown_rows WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Row not found' });
  res.json(result.rows[0]);
}));

// POST /breakdown  — single row
router.post('/', asyncHandler(async (req, res) => {
  const r = req.body;
  const result = await db(`
    INSERT INTO breakdown_rows (
      modul_id, project_id, bid, cat, type, kode, tpk, no, komp, proses,
      p, l, t, sub, jml, bhn, t_bhn, jml_muka,
      l_fin, d_fin, lap_luar, lap_dalam,
      edg_p1, edg_p2, edg_l1, edg_l2, p1, p2, l1, l2,
      q_engsel, q_rel, q_dormec, q_minifix, q_dowel, is_parent, urutan,
      opt, t_luar, t_dalam, q_siku, q_screw
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,
      $19,$20,$21,$22,
      $23,$24,$25,$26,$27,$28,$29,$30,
      $31,$32,$33,$34,$35,$36,$37,
      $38,$39,$40,$41,$42
    ) RETURNING *
  `, [
    r.modul_id, r.project_id, r.bid, r.cat, r.type, r.kode, r.tpk, r.no, r.komp, r.proses,
    r.p, r.l, r.t, r.sub, r.jml, r.bhn, r.t_bhn, r.jml_muka || 1,
    r.l_fin, r.d_fin, r.lap_luar, r.lap_dalam,
    r.edg_p1, r.edg_p2, r.edg_l1, r.edg_l2, r.p1, r.p2, r.l1, r.l2,
    r.q_engsel || 0, r.q_rel || 0, r.q_dormec || 0, r.q_minifix || 0, r.q_dowel || 0,
    r.is_parent || false, r.urutan || 0,
    parseInt(r.opt) || 0,
    parseFloatOrNull(r.t_luar),
    parseFloatOrNull(r.t_dalam),
    parseInt(r.q_siku) || 0,
    parseInt(r.q_screw) || 0
  ]);
  res.status(201).json(result.rows[0]);
}));

// POST /breakdown/bulk — import array of rows (from React state)
router.post('/bulk', asyncHandler(async (req, res) => {
  const { modul_id, project_id, rows } = req.body;
  if (!modul_id || !project_id || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'modul_id, project_id and rows[] required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Replace all rows for this modul
    await client.query('DELETE FROM breakdown_rows WHERE modul_id = $1', [modul_id]);

    const inserted = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const res2 = await client.query(`
        INSERT INTO breakdown_rows (
          modul_id, project_id, bid, cat, type, kode, tpk, no, komp, proses,
          p, l, t, sub, jml, bhn, t_bhn, jml_muka,
          l_fin, d_fin, lap_luar, lap_dalam,
          edg_p1, edg_p2, edg_l1, edg_l2, p1, p2, l1, l2,
          q_engsel, q_rel, q_dormec, q_minifix, q_dowel, is_parent, urutan,
          opt, t_luar, t_dalam, q_siku, q_screw
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,$18,
          $19,$20,$21,$22,
          $23,$24,$25,$26,$27,$28,$29,$30,
          $31,$32,$33,$34,$35,$36,$37,
          $38,$39,$40,$41,$42
        ) RETURNING *
      `, [
        modul_id, project_id, r.bid, r.cat, r.type, r.kode, r.tpk, r.no, r.komp, r.proses,
        r.p, r.l, r.t, r.sub, r.jml, r.bhn, r.t_bhn, r.jml_muka || 1,
        r.l_fin, r.d_fin, r.lap_luar, r.lap_dalam,
        r.edg_p1, r.edg_p2, r.edg_l1, r.edg_l2, r.p1, r.p2, r.l1, r.l2,
        r.q_engsel || 0, r.q_rel || 0, r.q_dormec || 0, r.q_minifix || 0, r.q_dowel || 0,
        r.is_parent || false, i,
        parseInt(r.opt) || 0,
        parseFloatOrNull(r.t_luar),
        parseFloatOrNull(r.t_dalam),
        parseInt(r.q_siku) || 0,
        parseInt(r.q_screw) || 0
      ]);
      inserted.push(res2.rows[0]);
    }

    await client.query('COMMIT');
    res.json({ inserted: inserted.length, rows: inserted });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PUT /breakdown/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const r = req.body;
  const result = await db(`
    UPDATE breakdown_rows SET
      bid=$1, cat=$2, type=$3, kode=$4, tpk=$5, no=$6, komp=$7, proses=$8,
      p=$9, l=$10, t=$11, sub=$12, jml=$13, bhn=$14, t_bhn=$15, jml_muka=$16,
      l_fin=$17, d_fin=$18, lap_luar=$19, lap_dalam=$20,
      edg_p1=$21, edg_p2=$22, edg_l1=$23, edg_l2=$24, p1=$25, p2=$26, l1=$27, l2=$28,
      q_engsel=$29, q_rel=$30, q_dormec=$31, q_minifix=$32, q_dowel=$33,
      is_parent=$34, urutan=$35, opt=$36, t_luar=$37, t_dalam=$38, q_siku=$39, q_screw=$40
    WHERE id=$41 RETURNING *
  `, [
    r.bid, r.cat, r.type, r.kode, r.tpk, r.no, r.komp, r.proses,
    r.p, r.l, r.t, r.sub, r.jml, r.bhn, r.t_bhn, r.jml_muka || 1,
    r.l_fin, r.d_fin, r.lap_luar, r.lap_dalam,
    r.edg_p1, r.edg_p2, r.edg_l1, r.edg_l2, r.p1, r.p2, r.l1, r.l2,
    r.q_engsel || 0, r.q_rel || 0, r.q_dormec || 0, r.q_minifix || 0, r.q_dowel || 0,
    r.is_parent || false, r.urutan || 0,
    parseInt(r.opt) || 0,
    parseFloatOrNull(r.t_luar),
    parseFloatOrNull(r.t_dalam),
    parseInt(r.q_siku) || 0,
    parseInt(r.q_screw) || 0,
    req.params.id
  ]);
  if (!result.rows.length) return res.status(404).json({ error: 'Row not found' });
  res.json(result.rows[0]);
}));

// DELETE /breakdown/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db('DELETE FROM breakdown_rows WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Row not found' });
  res.json({ deleted: result.rows[0].id });
}));

module.exports = router;
