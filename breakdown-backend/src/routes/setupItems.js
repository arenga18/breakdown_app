const router = require('express').Router();
const { query: db, getClient } = require('../db');
const { asyncHandler, paginate } = require('../middleware');

// GET /setup-items
router.get('/', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM setup_items ORDER BY urutan, name');
  res.json(result.rows);
}));

// POST /setup-items (single)
router.post('/', asyncHandler(async (req, res) => {
  const { name, no, ks, urutan } = req.body;
  const result = await db(
    'INSERT INTO setup_items (name, no, ks, urutan) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, no || '•', ks || '[ks]', urutan || 0]
  );
  res.status(201).json(result.rows[0]);
}));

// POST /setup-items/bulk — replace all (migration)
router.post('/bulk', asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'items[] required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM setup_items');
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await client.query(
        'INSERT INTO setup_items (name, no, ks, urutan) VALUES ($1,$2,$3,$4)',
        [it.name, it.no || '•', it.ks || '[ks]', i]
      );
    }
    await client.query('COMMIT');
    res.json({ inserted: items.length });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PUT /setup-items/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const { name, no, ks, urutan } = req.body;
  const result = await db(
    'UPDATE setup_items SET name=$1, no=$2, ks=$3, urutan=$4 WHERE id=$5 RETURNING *',
    [name, no, ks, urutan, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

// DELETE /setup-items/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db('DELETE FROM setup_items WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: result.rows[0].id });
}));

module.exports = router;
