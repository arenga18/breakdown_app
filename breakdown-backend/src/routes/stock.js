const router = require('express').Router();
const { query: db, getClient } = require('../db');
const { asyncHandler, paginate } = require('../middleware');

router.get('/', asyncHandler(async (req, res) => {
  const { page, limit, offset } = paginate(req.query);
  const { search } = req.query;
  let where = 'WHERE 1=1';
  const params = [];
  if (search) { params.push(`%${search}%`); where += ` AND (nama ILIKE $${params.length} OR kode ILIKE $${params.length})`; }
  const countRes = await db(`SELECT COUNT(*) FROM stock ${where}`, params);
  params.push(limit, offset);
  const result = await db(`SELECT * FROM stock ${where} ORDER BY nama LIMIT $${params.length-1} OFFSET $${params.length}`, params);
  res.json({ data: result.rows, total: parseInt(countRes.rows[0].count), page, limit });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const result = await db('SELECT * FROM stock WHERE id=$1', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

router.post('/', asyncHandler(async (req, res) => {
  const { nama, kode, kat, tebal, satuan, harga, keterangan } = req.body;
  const result = await db(
    'INSERT INTO stock (nama, kode, kat, tebal, satuan, harga, keterangan) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [nama, kode, kat, tebal || 0, satuan, harga || 0, keterangan]
  );
  res.status(201).json(result.rows[0]);
}));

// POST /stock/bulk — replace all stock (migration from frontend stockData)
router.post('/bulk', asyncHandler(async (req, res) => {
  const { stock } = req.body;
  if (!Array.isArray(stock)) return res.status(400).json({ error: 'stock[] required' });

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM stock');
    let count = 0;
    for (const s of stock) {
      await client.query(
        'INSERT INTO stock (kode, kat, nama, tebal, satuan, keterangan) VALUES ($1,$2,$3,$4,$5,$6)',
        [s.kode || s.id || null, s.kat || null, s.nama, s.tebal || 0, s.satuan || s.sat || null, s.keterangan || s.ket || null]
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
  const { nama, kode, kat, tebal, satuan, harga, keterangan } = req.body;
  const result = await db(
    'UPDATE stock SET nama=$1,kode=$2,kat=$3,tebal=$4,satuan=$5,harga=$6,keterangan=$7 WHERE id=$8 RETURNING *',
    [nama, kode, kat, tebal, satuan, harga, keterangan, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

router.patch('/:id/adjust', asyncHandler(async (req, res) => {
  const { delta } = req.body;
  const result = await db(
    'UPDATE stock SET tebal = tebal + $1 WHERE id=$2 RETURNING *',
    [delta, req.params.id]
  );
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const result = await db('DELETE FROM stock WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ deleted: result.rows[0].id });
}));

module.exports = router;
