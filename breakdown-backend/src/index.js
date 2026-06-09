require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { testConnection } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const API = process.env.API_PREFIX || '/api/v1';

// ── Middleware ──────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ── Routes ─────────────────────────────────────────────────
app.use(`${API}/projects`,    require('./routes/projects'));
app.use(`${API}/moduls`,      require('./routes/moduls'));
app.use(`${API}/breakdown`,   require('./routes/breakdown'));
app.use(`${API}/bom`,         require('./routes/bom'));
app.use(`${API}/rekap`,       require('./routes/rekap'));
app.use(`${API}/categories`,  require('./routes/categories'));
app.use(`${API}/parts`,       require('./routes/parts'));
app.use(`${API}/stock`,       require('./routes/stock'));
app.use(`${API}/speks`,       require('./routes/speks'));
app.use(`${API}/modul-master`,require('./routes/modulMaster'));
app.use(`${API}/setup-items`, require('./routes/setupItems'));
app.use(`${API}/settings`,    require('./routes/settings'));

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ── Error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Start ──────────────────────────────────────────────────
async function start() {
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error('Cannot start: database not available.');
    process.exit(1);
  }
  app.listen(PORT, () => {
    console.log(`🚀 Breakdown API running at http://localhost:${PORT}${API}`);
  });
}

start();
