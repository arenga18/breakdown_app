const router = require('express').Router();
const { query: db } = require('../db');
const { asyncHandler } = require('../middleware');

// GET /settings/:key
router.get('/:key', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM app_settings WHERE key=$1', [req.params.key]);
  if (!result.rows.length) return res.json({ key: req.params.key, value: null });
  res.json(result.rows[0]);
}));

// PUT /settings/:key  — upsert
router.put('/:key', asyncHandler(async (req, res) => {
  const { value } = req.body;
  const result = await db(`
    INSERT INTO app_settings (key, value) VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
    RETURNING *
  `, [req.params.key, JSON.stringify(value)]);
  res.json(result.rows[0]);
}));

module.exports = router;
