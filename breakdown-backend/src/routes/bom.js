const router = require('express').Router();
const { query: db } = require('../db');
const { asyncHandler, paginate } = require('../middleware');

// GET /bom?project_id=xxx
router.get('/', asyncHandler(async (req, res) => {
  const { project_id, modul_id, bhn, format } = req.query;
  const { page, limit, offset } = paginate(req.query);

  if (!project_id && !modul_id) {
    return res.status(400).json({ error: 'project_id or modul_id required' });
  }

  let where = 'WHERE 1=1';
  const params = [];

  if (project_id) { params.push(project_id); where += ` AND project_id = $${params.length}`; }
  if (modul_id)   { params.push(modul_id);   where += ` AND modul_id = $${params.length}`; }
  if (bhn)        { params.push(bhn);         where += ` AND bhn ILIKE $${params.length}`; }

  const countRes = await db(`SELECT COUNT(*) FROM v_bom ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  params.push(limit, offset);
  const result = await db(`
    SELECT * FROM v_bom ${where}
    ORDER BY urutan, komp
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `, params);

  // CSV export
  if (format === 'csv') {
    const rows = result.rows;
    if (!rows.length) return res.status(404).json({ error: 'No data' });
    const headers = ['komp','bhn','t_bhn','p','l','t','jml','m2_total','m3_total','edg_p1','edg_p2','edg_l1','edg_l2'];
    const csv = [
      headers.join(';'),
      ...rows.map(r => headers.map(h => r[h] ?? '').join(';'))
    ].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bom_${project_id || modul_id}.csv"`);
    return res.send(csv);
  }

  res.json({ data: result.rows, total, page, limit });
}));

// GET /bom/summary?project_id=xxx  — per-material summary
router.get('/summary', asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });

  const result = await db(`SELECT * FROM v_rekap WHERE project_id = $1`, [project_id]);
  res.json(result.rows);
}));

module.exports = router;
