-- ============================================================
-- BREAKDOWN APP - PostgreSQL Schema
-- Furniture manufacturing breakdown & BOM system
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for text search

-- ============================================================
-- MASTER DATA
-- ============================================================

-- Stock / Material inventory
CREATE TABLE IF NOT EXISTS stock (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama        VARCHAR(255) NOT NULL,
  kode        VARCHAR(100),
  jml         NUMERIC(12, 4) DEFAULT 0,
  satuan      VARCHAR(50),
  harga       NUMERIC(15, 2) DEFAULT 0,
  keterangan  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_kode ON stock(kode);
CREATE INDEX IF NOT EXISTS idx_stock_nama_trgm ON stock USING GIN(nama gin_trgm_ops);

-- Parts master (template components)
CREATE TABLE IF NOT EXISTS parts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  val         VARCHAR(100) NOT NULL,   -- display value / label
  code        VARCHAR(100) NOT NULL,   -- short code (KS, etc)
  ks          VARCHAR(50),             -- kode struktur
  lap_luar    VARCHAR(255),
  edg         VARCHAR(255),
  alias       VARCHAR(255),
  keterangan  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_parts_code ON parts(code);

-- Categories (dropdown options - dynamic)
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(100) NOT NULL UNIQUE,
  fieldtype   VARCHAR(50) DEFAULT 'select',
  items       JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_code ON categories(code);

-- ============================================================
-- PROJECT STRUCTURE
-- ============================================================

-- Projects (top-level container)
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(255) NOT NULL,
  client      VARCHAR(255),
  kode        VARCHAR(100),
  status      VARCHAR(50) DEFAULT 'active', -- active | completed | archived
  speks       JSONB DEFAULT '{}',            -- flexible project specs (tplSections vals)
  tgl_mulai   DATE,
  tgl_selesai DATE,
  keterangan  TEXT,
  created_by  VARCHAR(100),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_name_trgm ON projects USING GIN(name gin_trgm_ops);

-- Moduls (modul per project - e.g. Kitchen Set, Wardrobe)
CREATE TABLE IF NOT EXISTS moduls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Core modul info
  tgl         DATE,
  nip         VARCHAR(100),              -- employee ID
  proyek      VARCHAR(255),             -- project name (denorm for quick display)
  produk      VARCHAR(255),             -- product name
  kabinet     VARCHAR(500),             -- kabinet code string (e.g. FC-Ck001-sw2QK2Hk-00a)

  -- Dimensions
  tinggi      VARCHAR(50),
  p           NUMERIC(10, 2),           -- panjang
  l           NUMERIC(10, 2),           -- lebar
  t           NUMERIC(10, 2),           -- tinggi
  jml         INTEGER DEFAULT 1,

  -- Modul master data (from modulMasterData)
  dunit       VARCHAR(100),             -- deskripsiUnit code (FC, HC, TC, etc)
  bbox        VARCHAR(100),             -- bentukBox
  fin         VARCHAR(255),             -- finishing
  plap        VARCHAR(100),             -- posisiLapisan
  ibox        VARCHAR(100),             -- isiBox
  stup        VARCHAR(100),             -- sistemTutup
  jtutup      VARCHAR(50),              -- jumlahTutup
  jnistutup   VARCHAR(100),             -- jenisTutup
  hndl        VARCHAR(255),             -- handle
  acc         VARCHAR(255),             -- accessories
  lmp         VARCHAR(100),             -- lampu
  plnt        VARCHAR(100),             -- plinth

  keterangan  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moduls_project_id ON moduls(project_id);
CREATE INDEX IF NOT EXISTS idx_moduls_dunit ON moduls(dunit);

-- Sub-moduls (template groups within a modul)
CREATE TABLE IF NOT EXISTS sub_moduls (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modul_id    UUID NOT NULL REFERENCES moduls(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  urutan      INTEGER DEFAULT 0,
  keterangan  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_moduls_modul_id ON sub_moduls(modul_id);

-- Template parts (part blueprints linked to sub_moduls, with formula support)
CREATE TABLE IF NOT EXISTS template_parts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_modul_id UUID REFERENCES sub_moduls(id) ON DELETE SET NULL,
  modul_id    UUID REFERENCES moduls(id) ON DELETE CASCADE,  -- direct link when no sub_modul

  cat         VARCHAR(100),
  type        VARCHAR(100),              -- prt | Set_up | Ref
  kode        VARCHAR(100),
  tpk         VARCHAR(50),
  no          VARCHAR(50),
  komp        VARCHAR(255),
  proses      TEXT,

  -- Dimensions (support formula strings like '=L-(2*TKAB)')
  p           VARCHAR(100),
  l           VARCHAR(100),
  t           VARCHAR(100),
  sub         NUMERIC(8, 2),
  jml         VARCHAR(100),             -- can be formula

  -- Material
  bhn         VARCHAR(255),
  t_bhn       VARCHAR(100),
  jml_muka    INTEGER DEFAULT 1,

  -- Lapisan (HPL/finishing)
  l_fin       VARCHAR(100),
  d_fin       VARCHAR(100),
  lap_luar    VARCHAR(255),
  lap_dalam   VARCHAR(255),

  -- Edging
  edg_p1      VARCHAR(255),
  edg_p2      VARCHAR(255),
  edg_l1      VARCHAR(255),
  edg_l2      VARCHAR(255),
  p1          VARCHAR(100),
  p2          VARCHAR(100),
  l1          VARCHAR(100),
  l2          VARCHAR(100),

  -- Hardware quantities
  q_engsel    INTEGER DEFAULT 0,
  q_rel       INTEGER DEFAULT 0,
  q_dormec    INTEGER DEFAULT 0,
  q_minifix   INTEGER DEFAULT 0,
  q_dowel     INTEGER DEFAULT 0,

  is_parent   BOOLEAN DEFAULT FALSE,
  urutan      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_template_parts_modul_id ON template_parts(modul_id);
CREATE INDEX IF NOT EXISTS idx_template_parts_sub_modul_id ON template_parts(sub_modul_id);
CREATE INDEX IF NOT EXISTS idx_template_parts_type ON template_parts(type);

-- ============================================================
-- BREAKDOWN ROWS (actual computed breakdown)
-- ============================================================

CREATE TABLE IF NOT EXISTS breakdown_rows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  modul_id    UUID NOT NULL REFERENCES moduls(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  bid         VARCHAR(100),              -- breakdown ID (e.g. MOD-001)
  cat         VARCHAR(100),
  type        VARCHAR(100),
  kode        VARCHAR(100),
  tpk         VARCHAR(50),
  no          VARCHAR(50),
  komp        VARCHAR(255),
  proses      TEXT,

  -- Computed dimensions (numbers after formula eval)
  p           NUMERIC(12, 4),
  l           NUMERIC(12, 4),
  t           NUMERIC(12, 4),
  sub         NUMERIC(8, 2),
  jml         NUMERIC(8, 2),

  -- Material
  bhn         VARCHAR(255),
  t_bhn       NUMERIC(8, 2),
  jml_muka    INTEGER DEFAULT 1,

  -- Lapisan
  l_fin       NUMERIC(8, 4),
  d_fin       NUMERIC(8, 4),
  lap_luar    VARCHAR(255),
  lap_dalam   VARCHAR(255),

  -- Edging
  edg_p1      VARCHAR(255),
  edg_p2      VARCHAR(255),
  edg_l1      VARCHAR(255),
  edg_l2      VARCHAR(255),
  p1          NUMERIC(8, 4),
  p2          NUMERIC(8, 4),
  l1          NUMERIC(8, 4),
  l2          NUMERIC(8, 4),

  -- Hardware
  q_engsel    INTEGER DEFAULT 0,
  q_rel       INTEGER DEFAULT 0,
  q_dormec    INTEGER DEFAULT 0,
  q_minifix   INTEGER DEFAULT 0,
  q_dowel     INTEGER DEFAULT 0,

  is_parent   BOOLEAN DEFAULT FALSE,
  urutan      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_breakdown_modul_id ON breakdown_rows(modul_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_project_id ON breakdown_rows(project_id);
CREATE INDEX IF NOT EXISTS idx_breakdown_bhn ON breakdown_rows(bhn);
CREATE INDEX IF NOT EXISTS idx_breakdown_cat ON breakdown_rows(cat);
CREATE INDEX IF NOT EXISTS idx_breakdown_type ON breakdown_rows(type);

-- ============================================================
-- SPEK (project specifications per template section)
-- ============================================================

CREATE TABLE IF NOT EXISTS speks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section     VARCHAR(255) NOT NULL,    -- section name (Spesifikasi Produk, etc)
  alias       VARCHAR(100) NOT NULL,    -- alias key (TKAB, bahan1, etc)
  source      VARCHAR(100),             -- category source (bhn, thk, hpl, edg, alu, etc)
  label       VARCHAR(255),
  value       VARCHAR(500),             -- selected value
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, alias)
);
CREATE INDEX IF NOT EXISTS idx_speks_project_id ON speks(project_id);
CREATE INDEX IF NOT EXISTS idx_speks_alias ON speks(alias);

-- ============================================================
-- MODUL MASTER DATA (lookup tables)
-- ============================================================

CREATE TABLE IF NOT EXISTS modul_master (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipe        VARCHAR(100) NOT NULL,    -- deskripsiUnit | bentukBox | finishing | posisiLapisan | isiBox | sistemTutup | jumlahTutup | jenisTutup | handle | accessories | lampu | plinth
  name        VARCHAR(500) NOT NULL,
  code        VARCHAR(255),
  urutan      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_modul_master_tipe ON modul_master(tipe);
CREATE INDEX IF NOT EXISTS idx_modul_master_code ON modul_master(code);

-- ============================================================
-- VIEWS: BOM & REKAP
-- ============================================================

-- BOM View: per-row area calculation
CREATE OR REPLACE VIEW v_bom AS
SELECT
  br.id,
  br.project_id,
  br.modul_id,
  p.name AS project_name,
  p.client,
  m.produk,
  m.kabinet,
  br.bid,
  br.cat,
  br.type,
  br.kode,
  br.komp,
  br.bhn,
  br.t_bhn,
  br.lap_luar,
  br.lap_dalam,
  br.p,
  br.l,
  br.t,
  br.jml,
  br.sub,
  -- Area calculations
  ROUND((br.p * br.l / 1000000.0)::NUMERIC, 4) AS m2_per_unit,
  ROUND((br.p * br.l * br.jml / 1000000.0)::NUMERIC, 4) AS m2_total,
  ROUND((br.p * br.l * br.t * br.jml / 1000000000.0)::NUMERIC, 6) AS m3_total,
  -- Edging
  br.edg_p1, br.edg_p2, br.edg_l1, br.edg_l2,
  br.p1, br.p2, br.l1, br.l2,
  -- Hardware
  br.q_engsel, br.q_rel, br.q_dormec, br.q_minifix, br.q_dowel,
  br.urutan
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id
JOIN moduls m ON m.id = br.modul_id
WHERE br.type = 'prt';  -- exclude Set_up rows from BOM

-- Rekap View: material summary per project
CREATE OR REPLACE VIEW v_rekap AS
SELECT
  br.project_id,
  p.name AS project_name,
  p.client,
  br.bhn,
  br.t_bhn,
  br.lap_luar,
  COUNT(*)                                                    AS jumlah_baris,
  SUM(br.jml)                                                 AS total_qty,
  ROUND(SUM(br.p * br.l * br.jml / 1000000.0)::NUMERIC, 4)  AS total_m2,
  ROUND(SUM(br.p * br.l * br.t * br.jml / 1000000000.0)::NUMERIC, 6) AS total_m3
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id
WHERE br.type = 'prt'
  AND br.bhn IS NOT NULL
  AND br.bhn != ''
GROUP BY br.project_id, p.name, p.client, br.bhn, br.t_bhn, br.lap_luar
ORDER BY br.bhn, br.t_bhn;

-- Rekap hardware per project
CREATE OR REPLACE VIEW v_rekap_hardware AS
SELECT
  br.project_id,
  p.name AS project_name,
  SUM(br.q_engsel * br.jml)  AS total_engsel,
  SUM(br.q_rel * br.jml)     AS total_rel,
  SUM(br.q_dormec * br.jml)  AS total_dormec,
  SUM(br.q_minifix * br.jml) AS total_minifix,
  SUM(br.q_dowel * br.jml)   AS total_dowel
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id
WHERE br.type = 'prt'
GROUP BY br.project_id, p.name;

-- Production rekap: edging per project
CREATE OR REPLACE VIEW v_rekap_edging AS
SELECT
  br.project_id,
  p.name AS project_name,
  edg_type,
  ROUND(SUM(edg_length * br.jml / 1000.0)::NUMERIC, 3) AS total_meter
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id,
LATERAL (VALUES
  (br.edg_p1, br.p1, br.p),
  (br.edg_p2, br.p2, br.p),
  (br.edg_l1, br.l1, br.l),
  (br.edg_l2, br.l2, br.l)
) AS t(edg_type, edg_fin, edg_length)
WHERE br.type = 'prt'
  AND t.edg_type IS NOT NULL
  AND t.edg_type NOT IN ('', ' ')
GROUP BY br.project_id, p.name, edg_type
ORDER BY edg_type;

-- ============================================================
-- AUDIT TRIGGER (auto-update updated_at)
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'stock', 'parts', 'categories', 'projects', 'moduls',
    'sub_moduls', 'template_parts', 'breakdown_rows', 'speks'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', t, t);
  END LOOP;
END;
$$;
