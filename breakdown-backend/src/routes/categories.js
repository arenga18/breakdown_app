// categories.js
const router = require('express').Router();
const { query: db } = require('../db');
const { asyncHandler } = require('../middleware');

router.get('/', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM categories ORDER BY name');
  res.json(result.rows);
}));

router.get('/:code', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM categories WHERE code = $1', [req.params.code]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { name, code, fieldtype, items } = req.body;
  const result = await db(`
    INSERT INTO categories (name, code, fieldtype, items) VALUES ($1,$2,$3,$4)
    ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, fieldtype=EXCLUDED.fieldtype, items=EXCLUDED.items, updated_at=NOW()
    RETURNING *
  `, [name, code, fieldtype || 'select', JSON.stringify(items || [])]);
  res.status(201).json(result.rows[0]);
}));

router.patch('/:code/items', asyncHandler(async (req, res) => {
  const { items } = req.body;
  const result = await db(
    'UPDATE categories SET items=$1 WHERE code=$2 RETURNING *',
    [JSON.stringify(items), req.params.code]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

module.exports = router;
