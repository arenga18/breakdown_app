# Breakdown Backend API

Backend REST API untuk sistem breakdown furnitur (kitchen set, wardrobe, dll).

## Tech Stack
- **Node.js** + **Express**
- **PostgreSQL** (dengan JSONB + pg_trgm extension)
- **pg** (native PostgreSQL driver — lebih cepat dari ORM)

## Struktur Folder

```
breakdown-backend/
├── migrations/
│   └── 001_initial_schema.sql   ← semua tabel + views
├── src/
│   ├── db/
│   │   ├── index.js             ← pg Pool connection
│   │   ├── migrate.js           ← migration runner
│   │   └── seed.js              ← seed data awal
│   ├── middleware/
│   │   └── index.js             ← validate, paginate, asyncHandler
│   ├── routes/
│   │   ├── projects.js          ← CRUD projects
│   │   ├── moduls.js            ← CRUD moduls
│   │   ├── breakdown.js         ← CRUD breakdown rows + bulk import
│   │   ├── bom.js               ← BOM view + CSV export
│   │   ├── rekap.js             ← rekap material/hardware/edging + CNC CSV
│   │   ├── categories.js        ← dropdown options
│   │   ├── parts.js             ← parts master
│   │   ├── stock.js             ← stock/inventory
│   │   ├── speks.js             ← project spek values
│   │   └── modulMaster.js       ← deskripsiUnit, bentukBox, dll
│   └── index.js                 ← Express app entry
├── .env.example
└── package.json
```

## Quick Start

### 1. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# Mac
brew install postgresql@15
```

### 2. Buat database

```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE breakdown_db;
CREATE USER breakdown_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE breakdown_db TO breakdown_user;
\q
```

### 3. Setup project

```bash
cd breakdown-backend
cp .env.example .env
# Edit .env sesuai kredensial DB kamu

npm install
npm run migrate    # jalankan migrations
npm run seed       # seed data awal (categories, dll)
```

### 4. Jalankan server

```bash
npm run dev        # development (nodemon)
npm start          # production
```

Server berjalan di `http://localhost:3001/api/v1`

---

## API Endpoints

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects` | List projects (paginated, search) |
| GET | `/api/v1/projects/:id` | Detail project |
| GET | `/api/v1/projects/:id/speks` | Spek vals project |
| POST | `/api/v1/projects` | Buat project baru |
| PUT | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Hapus project |

### Moduls
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/moduls?project_id=xxx` | List moduls per project |
| GET | `/api/v1/moduls/:id` | Detail modul |
| GET | `/api/v1/moduls/:id/breakdown` | Semua rows modul ini |
| POST | `/api/v1/moduls` | Tambah modul |
| PUT | `/api/v1/moduls/:id` | Update modul |
| DELETE | `/api/v1/moduls/:id` | Hapus modul |

### Breakdown Rows
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/breakdown?modul_id=xxx` | List rows |
| POST | `/api/v1/breakdown` | Tambah 1 row |
| POST | `/api/v1/breakdown/bulk` | Import array rows dari React state |
| PUT | `/api/v1/breakdown/:id` | Update row |
| DELETE | `/api/v1/breakdown/:id` | Hapus row |

### BOM & Rekap
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/bom?project_id=xxx` | BOM dengan kalkulasi M² & M³ |
| GET | `/api/v1/bom?project_id=xxx&format=csv` | Export BOM ke CSV |
| GET | `/api/v1/bom/summary?project_id=xxx` | Rekap material per bahan |
| GET | `/api/v1/rekap?project_id=xxx` | Rekap material + hardware + edging |
| GET | `/api/v1/rekap/production?project_id=xxx&format=csv` | CNC export CSV (P;L;Q;bahan;T) |

### Master Data
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/categories` | Semua kategori dropdown |
| PATCH | `/api/v1/categories/:code/items` | Update items array |
| GET | `/api/v1/parts` | Parts master |
| GET | `/api/v1/stock` | Stock material |
| PATCH | `/api/v1/stock/:id/adjust` | Adjust qty stock (delta) |
| PUT | `/api/v1/speks/bulk` | Simpan semua spek project sekaligus |
| GET | `/api/v1/modul-master` | Lookup data (deskripsiUnit, bentukBox, dll) |

---

## Migrasi dari React State

Untuk import data dari `initialState.js` ke database, gunakan endpoint bulk:

```javascript
// Contoh: simpan breakdown rows dari React ke backend
await fetch('/api/v1/breakdown/bulk', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    modul_id: '<uuid>',
    project_id: '<uuid>',
    rows: state.breakdown  // langsung dari initialState
  })
});
```

---

## Database Views

| View | Description |
|------|-------------|
| `v_bom` | BOM dengan kalkulasi M², M³, join ke project & modul |
| `v_rekap` | Agregasi material per project (total M², M³) |
| `v_rekap_hardware` | Rekap qty hardware per project |
| `v_rekap_edging` | Total meter edging per tipe per project |

---

## Environment Variables

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=breakdown_db
DB_USER=postgres
DB_PASSWORD=your_password

PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
API_PREFIX=/api/v1
```
