const router = require('express').Router();
const { query: db } = require('../db');
const { asyncHandler } = require('../middleware');

// GET /modul-master  — returns all grouped by tipe
router.get('/', asyncHandler(async (req, res) => {
  const { tipe } = req.query;
  let where = '';
  const params = [];
  if (tipe) { params.push(tipe); where = 'WHERE tipe=$1'; }
  const result = await db(`SELECT * FROM modul_master ${where} ORDER BY tipe, urutan, name`, params);

  // Group by tipe if no filter
  if (!tipe) {
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.tipe]) grouped[row.tipe] = [];
      grouped[row.tipe].push(row);
    }
    return res.json(grouped);
  }
  res.json(result.rows);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { tipe, name, code, urutan } = req.body;
  const result = await db(
    'INSERT INTO modul_master (tipe, name, code, urutan) VALUES ($1,$2,$3,$4) RETURNING *',
    [tipe, name, code, urutan || 0]
  );
  res.status(201).json(result.rows[0]);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const { name, code, urutan } = req.body;
  const result = await db(
    'UPDATE modul_master SET name=$1, code=$2, urutan=$3 WHERE id=$4 RETURNING *',
    [name, code, urutan, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db('DELETE FROM modul_master WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: result.rows[0].id });
}));

module.exports = router;
