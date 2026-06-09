const router = require('express').Router();
const { query: db, getClient } = require('../db');
const { asyncHandler } = require('../middleware');

// GET /speks?project_id=xxx
router.get('/', asyncHandler(async (req, res) => {
  const { project_id } = req.query;
  if (!project_id) return res.status(400).json({ error: 'project_id required' });
  const result = await db('SELECT * FROM speks WHERE project_id=$1 ORDER BY section, alias', [project_id]);
  res.json(result.rows);
}));

// PUT /speks/bulk — upsert all spek values for a project (replace all)
router.put('/bulk', asyncHandler(async (req, res) => {
  const { project_id, speks } = req.body;
  if (!project_id || !Array.isArray(speks)) {
    return res.status(400).json({ error: 'project_id and speks[] required' });
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    // Delete then re-insert (cleaner than many upserts)
    await client.query('DELETE FROM speks WHERE project_id=$1', [project_id]);
    for (const s of speks) {
      await client.query(
        'INSERT INTO speks (project_id, section, alias, source, label, value) VALUES ($1,$2,$3,$4,$5,$6)',
        [project_id, s.section, s.alias, s.source, s.label, s.value]
      );
    }
    await client.query('COMMIT');
    const result = await db('SELECT * FROM speks WHERE project_id=$1 ORDER BY section, alias', [project_id]);
    res.json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PATCH /speks/alias — update single alias value
router.patch('/alias', asyncHandler(async (req, res) => {
  const { project_id, alias, value } = req.body;
  const result = await db(`
    INSERT INTO speks (project_id, alias, value) VALUES ($1,$2,$3)
    ON CONFLICT (project_id, alias) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
    RETURNING *
  `, [project_id, alias, value]);
  res.json(result.rows[0]);
}));

module.exports = router;
