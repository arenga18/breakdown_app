const router = require('express').Router();
const { query: db } = require('../db');
const { asyncHandler, paginate } = require('../middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware');

// GET /moduls?project_id=xxx
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { project_id, search } = req.query;

  let where = 'WHERE 1=1';
  const params = [];

  if (project_id) {
    params.push(project_id);
    where += ` AND m.project_id = $${params.length}`;
  } else {
    where += ` AND (m.project_id IS NULL OR p.name ILIKE 'master templates')`;
  }
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (m.produk ILIKE $${params.length} OR m.kabinet ILIKE $${params.length})`;
  }

  const countRes = await db(`
    SELECT COUNT(*) FROM moduls m 
    LEFT JOIN projects p ON p.id = m.project_id 
    ${where}
  `, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await db(`
    SELECT m.*,
      p.name AS project_name,
      p.client,
      (SELECT COUNT(*) FROM breakdown_rows br WHERE br.modul_id = m.id) AS row_count
    FROM moduls m
    LEFT JOIN projects p ON p.id = m.project_id
    ${where}
    ORDER BY m.tgl DESC, m.created_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const moduls = result.rows;
  for (const m of moduls) {
    const partsRes = await db('SELECT * FROM template_parts WHERE modul_id = $1 ORDER BY urutan', [m.id]);
    m.komponen = partsRes.rows;
  }

  res.json({ data: moduls, total, page, limit });
}));


// GET /moduls/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await db(`
    SELECT m.*, p.name AS project_name, p.client
    FROM moduls m LEFT JOIN projects p ON p.id = m.project_id
    WHERE m.id = $1
  `, [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Modul not found' });
  
  const m = result.rows[0];
  const partsRes = await db('SELECT * FROM template_parts WHERE modul_id = $1 ORDER BY urutan', [m.id]);
  m.komponen = partsRes.rows;
  
  res.json(m);
}));

// GET /moduls/:id/breakdown  — all breakdown rows for this modul
router.get('/:id/breakdown', asyncHandler(async (req, res) => {
  const result = await db(`
    SELECT br.*, m.kabinet AS modul, m.kabinet
    FROM breakdown_rows br
    JOIN moduls m ON br.modul_id = m.id
    WHERE br.modul_id = $1 
    ORDER BY br.urutan, br.created_at
  `, [req.params.id]);
  res.json(result.rows);
}));

// POST /moduls
router.post('/', [
  body('project_id').isUUID(),
  body('produk').optional().trim(),
  validate,
], asyncHandler(async (req, res) => {
  const {
    project_id, tgl, nip, proyek, produk, kabinet, tinggi, p, l, t, jml,
    dunit, bbox, fin, plap, ibox, stup, jtutup, jnistutup, hndl, acc, lmp, plnt, keterangan
  } = req.body;

  const result = await db(`
    INSERT INTO moduls (project_id, tgl, nip, proyek, produk, kabinet, tinggi, p, l, t, jml,
      dunit, bbox, fin, plap, ibox, stup, jtutup, jnistutup, hndl, acc, lmp, plnt, keterangan)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
    RETURNING *
  `, [project_id, tgl, nip, proyek, produk, kabinet, tinggi, p, l, t, jml || 1,
      dunit, bbox, fin, plap, ibox, stup, jtutup, jnistutup, hndl, acc, lmp, plnt, keterangan]);

  res.status(201).json(result.rows[0]);
}));

// PUT /moduls/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const {
    tgl, nip, proyek, produk, kabinet, tinggi, p, l, t, jml,
    dunit, bbox, fin, plap, ibox, stup, jtutup, jnistutup, hndl, acc, lmp, plnt, keterangan
  } = req.body;

  const result = await db(`
    UPDATE moduls SET tgl=$1, nip=$2, proyek=$3, produk=$4, kabinet=$5, tinggi=$6,
      p=$7, l=$8, t=$9, jml=$10, dunit=$11, bbox=$12, fin=$13, plap=$14,
      ibox=$15, stup=$16, jtutup=$17, jnistutup=$18, hndl=$19, acc=$20, lmp=$21, plnt=$22, keterangan=$23
    WHERE id=$24 RETURNING *
  `, [tgl, nip, proyek, produk, kabinet, tinggi, p, l, t, jml,
      dunit, bbox, fin, plap, ibox, stup, jtutup, jnistutup, hndl, acc, lmp, plnt, keterangan,
      req.params.id]);

  if (!result.rows.length) return res.status(404).json({ error: 'Modul not found' });
  res.json(result.rows[0]);
}));

// DELETE /moduls/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db('DELETE FROM moduls WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Modul not found' });
  res.json({ deleted: result.rows[0].id });
}));

// POST /moduls/:id/template-parts/bulk - bulk insert/replace template parts for a modul
router.post('/:id/template-parts/bulk', asyncHandler(async (req, res) => {
  const { parts } = req.body;
  const modulId = req.params.id;

  // First, delete existing template parts for this modul
  await db('DELETE FROM template_parts WHERE modul_id = $1', [modulId]);

  if (parts && parts.length > 0) {
    // Perform bulk insert
    for (let i = 0; i < parts.length; i++) {
      const r = parts[i];
      await db(`
        INSERT INTO template_parts (
          modul_id, cat, type, kode, tpk, no, komp, proses,
          p, l, t, sub, jml, bhn, t_bhn, jml_muka,
          l_fin, d_fin, lap_luar, lap_dalam,
          edg_p1, edg_p2, edg_l1, edg_l2, p1, p2, l1, l2,
          q_engsel, q_rel, q_dormec, q_minifix, q_dowel,
          is_parent, urutan, opt, t_luar, t_dalam, q_siku, q_screw
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28,
          $29, $30, $31, $32, $33,
          $34, $35, $36, $37, $38, $39, $40
        )
      `, [
        modulId, r.cat || '', r.type || 'prt', r.kode || '', r.tpk || '', r.no || '', r.komp || '', r.proses || '',
        r.p !== undefined ? r.p.toString() : null,
        r.l !== undefined ? r.l.toString() : null,
        r.t !== undefined ? r.t.toString() : null,
        parseFloat(r.sub) || 1.0,
        r.jml !== undefined ? r.jml.toString() : '1',
        r.bhn || '',
        r.t_bhn !== undefined ? r.t_bhn.toString() : null,
        parseInt(r.jml_muka) || 1,
        r.l_fin !== undefined ? r.l_fin.toString() : null,
        r.d_fin !== undefined ? r.d_fin.toString() : null,
        r.lap_luar || '',
        r.lap_dalam || '',
        r.edg_p1 || '', r.edg_p2 || '', r.edg_l1 || '', r.edg_l2 || '',
        r.p1 !== undefined ? r.p1.toString() : null,
        r.p2 !== undefined ? r.p2.toString() : null,
        r.l1 !== undefined ? r.l1.toString() : null,
        r.l2 !== undefined ? r.l2.toString() : null,
        parseInt(r.q_engsel) || 0,
        parseInt(r.q_rel) || 0,
        parseInt(r.q_dormec) || 0,
        parseInt(r.q_minifix) || 0,
        parseInt(r.q_dowel) || 0,
        r.is_parent || r.isParent || false,
        i,
        r.opt !== undefined ? r.opt.toString() : '0',
        r.t_luar !== undefined ? r.t_luar.toString() : '0',
        r.t_dalam !== undefined ? r.t_dalam.toString() : '0',
        parseInt(r.q_siku) || 0,
        parseInt(r.q_screw) || 0
      ]);
    }
  }

  res.json({ success: true, count: parts ? parts.length : 0 });
}));

module.exports = router;
