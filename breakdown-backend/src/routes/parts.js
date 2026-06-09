const router = require('express').Router();
const { query: db, getClient } = require('../db');
const { asyncHandler, paginate } = require('../middleware');

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { search, code } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { params.push(`%${search}%`); where += ` AND (val ILIKE $${params.length} OR name ILIKE $${params.length} OR code ILIKE $${params.length})`; }
  if (code)   { params.push(code);           where += ` AND code = $${params.length}`; }
  const countRes = await db(`SELECT COUNT(*) FROM parts ${where}`, params);
  params.push(limit, offset);
  const result = await db(`SELECT * FROM parts ${where} ORDER BY val::int LIMIT $${params.length-1} OFFSET $${params.length}`, params);
  res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM parts WHERE id=$1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { val, name, code, ks, lap_luar, edg, alias, opt, keterangan } = req.body;
  const result = await db(
    'INSERT INTO parts (val, name, code, ks, lap_luar, edg, alias, opt, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [val, name, code, ks, lap_luar, edg, alias, opt, keterangan]
  );
  res.status(201).json(result.rows[0]);
}));

// POST /parts/bulk — replace all parts (migration from frontend)
router.post('/bulk', asyncHandler(async (req, res) => {
  const { parts } = req.body;
  if (!Array.isArray(parts)) return res.status(400).json({ error: 'parts[] required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM parts');
    let count = 0;
    for (const p of parts) {
      await client.query(
        'INSERT INTO parts (val, name, code, ks, lap_luar, edg, alias, opt, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [
          p.val || '',
          p.name || '',
          p.code || '',
          p.ks || '',
          p.lap_luar || '',
          p.edg_p1 || p.edg || '',
          p.alias || String(p.val || ''),
          typeof p.opt === 'number' ? p.opt : 0,
          JSON.stringify({
            opt: p.opt, type: p.type, jml: p.jml, bhn: p.bhn, t: p.t,
            l: p.l, d: p.d, p1: p.p1, p2: p.p2, l1: p.l1, l2: p.l2,
            lap_luar: p.lap_luar, lap_dalam: p.lap_dalam,
            edg_p1: p.edg_p1, edg_p2: p.edg_p2, edg_l1: p.edg_l1, edg_l2: p.edg_l2,
            q_engsel: p.q_engsel, q_rel: p.q_rel, q_dormec: p.q_dormec,
            q_minifix: p.q_minifix, q_dowel: p.q_dowel, spekRefs: p.spekRefs
          })
        ]
      );
      count++;
    }
    await client.query('COMMIT');
    res.json({ inserted: count });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { val, name, code, ks, lap_luar, edg, alias, opt, keterangan } = req.body;
  const result = await db(
    'UPDATE parts SET val=$1,name=$2,code=$3,ks=$4,lap_luar=$5,edg=$6,alias=$7,opt=$8,keterangan=$9 WHERE id=$10 RETURNING *',
    [val, name, code, ks, lap_luar, edg, alias, opt, keterangan, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db('DELETE FROM parts WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: result.rows[0].id });
}));

module.exports = router;
