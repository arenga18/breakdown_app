const router = require('express').Router();
const { query: db } = require('../db');
const { asyncHandler } = require('../middleware');

// GET /rekap?project_id=xxx
router.get('/', asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  const [material, hardware, edging] = await Promise.all([
    db('SELECT * FROM v_rekap WHERE project_id = $1', [project_id]),
    db('SELECT * FROM v_rekap_hardware WHERE project_id = $1', [project_id]),
    db('SELECT * FROM v_rekap_edging WHERE project_id = $1', [project_id]),
  ]);

  res.json({
    material: material.rows,
    hardware: hardware.rows[0] || {},
    edging: edging.rows,
  });
}));

// GET /rekap/production?project_id=xxx  — CNC export format
router.get('/production', asyncHandler(async (req, res) => {
  const { project_id, format } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  const result = await db(`
    SELECT
      b.komp, b.bhn, b.p, b.l, b.t, b.jml,
      b.lap_luar, b.lap_dalam,
      b.edg_p1, b.edg_p2, b.edg_l1, b.edg_l2,
      b.p1, b.p2, b.l1, b.l2,
      b.produk, b.kabinet, b.project_name
    FROM v_bom b
    WHERE b.project_id = $1
    ORDER BY b.bhn, b.t_bhn, b.komp
  `, [project_id]);

  // CNC CSV: P;L;Q;bahan;T format
  if (format === 'csv' || format === 'cnc') {
    const rows = result.rows;
    const csv = [
      'P;L;Q;bahan;T;lap_luar;lap_dalam;edg_p1;edg_p2;edg_l1;edg_l2;komp',
      ...rows.map(r =>
        [r.p, r.l, r.jml, r.bhn, r.t, r.lap_luar, r.lap_dalam,
         r.edg_p1||'', r.edg_p2||'', r.edg_l1||'', r.edg_l2||'', r.komp].join(';')
      )
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="cnc_${project_id}.csv"`);
    return res.send(csv);
  }

  res.json(result.rows);
}));

module.exports = router;
