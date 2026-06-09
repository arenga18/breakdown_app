const router = require('express').Router();
const { query: db } = require('../db');
const { asyncHandler, paginate } = require('../middleware');
const { body, param } = require('express-validator');
const { validate } = require('../middleware');

// GET /projects
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { status, search } = req.query;

  let where = 'WHERE 1=1';
  const params = [];

  if (status) { params.push(status); where += ` AND p.status = $${params.length}`; }
  if (search) { params.push(`%${search}%`); where += ` AND (p.name ILIKE $${params.length} OR p.client ILIKE $${params.length})`; }

  const countRes = await db(`SELECT COUNT(*) FROM projects p ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await db(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM moduls m WHERE m.project_id = p.id) AS modul_count
    FROM projects p
    ${where}
    ORDER BY p.updated_at DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  const projects = result.rows;
  for (const proj of projects) {
    // Attach breakdown rows grouped by module creation date, then by urutan
    const brRes = await db(`
      SELECT br.*, m.kabinet AS modul, m.kabinet
      FROM breakdown_rows br
      JOIN moduls m ON br.modul_id = m.id
      WHERE br.project_id = $1 
      ORDER BY m.created_at, br.urutan
    `, [proj.id]);
    proj.breakdown = brRes.rows;

    // Normalize speks format (frontend expects array of specs)
    if (!proj.speks || Object.keys(proj.speks).length === 0) {
      proj.speks = [];
    } else if (!Array.isArray(proj.speks)) {
      proj.speks = [proj.speks];
    }
  }

  res.json({ data: projects, total, page, limit, pages: Math.ceil(total / limit) });
}));

// GET /projects/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM projects WHERE id = $1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
  res.json(result.rows[0]);
}));

// GET /projects/:id/speks
router.get('/:id/speks', asyncHandler(async (req, res) => {
  const result = await db(
    'SELECT * FROM speks WHERE project_id = $1 ORDER BY section, alias',
    [req.params.id]
  );
  res.json(result.rows);
}));

// POST /projects
router.post('/', [
  body('name').notEmpty().trim(),
  body('client').optional().trim(),
  body('kode').optional().trim(),
  validate,
], asyncHandler(async (req, res) => {
  const { name, client, kode, status, speks, tgl_mulai, tgl_selesai, keterangan, created_by } = req.body;
  const result = await db(`
    INSERT INTO projects (name, client, kode, status, speks, tgl_mulai, tgl_selesai, keterangan, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
  `, [name, client, kode, status || 'active', JSON.stringify(speks || {}), tgl_mulai, tgl_selesai, keterangan, created_by]);
  res.status(201).json(result.rows[0]);
}));

// PUT /projects/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, client, kode, status, speks, tgl_mulai, tgl_selesai, keterangan } = req.body;
  const result = await db(`
    UPDATE projects SET name=$1, client=$2, kode=$3, status=$4, speks=$5,
      tgl_mulai=$6, tgl_selesai=$7, keterangan=$8
    WHERE id=$9 RETURNING *
  `, [name, client, kode, status, JSON.stringify(speks || {}), tgl_mulai, tgl_selesai, keterangan, req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
  res.json(result.rows[0]);
}));

// DELETE /projects/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db('DELETE FROM projects WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Project not found' });
  res.json({ deleted: result.rows[0].id });
}));

module.exports = router;
