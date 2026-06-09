-- MIGRATION 005: Drop views, alter breakdown_rows columns to VARCHAR(100), and recreate views

-- 1. Drop dependent views first
DROP VIEW IF EXISTS v_rekap_edging;
DROP VIEW IF EXISTS v_rekap_hardware;
DROP VIEW IF EXISTS v_rekap;
DROP VIEW IF EXISTS v_bom;

-- 2. Create helper function for safe numeric casting
CREATE OR REPLACE FUNCTION safe_numeric(val VARCHAR)
RETURNS NUMERIC AS $$
BEGIN
  IF val IS NULL OR val = '' OR val LIKE '=%' THEN
    RETURN NULL;
  END IF;
  RETURN val::NUMERIC;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Alter columns of breakdown_rows to VARCHAR(100)
ALTER TABLE breakdown_rows ALTER COLUMN p TYPE VARCHAR(100) USING p::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN l TYPE VARCHAR(100) USING l::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN t TYPE VARCHAR(100) USING t::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN sub TYPE VARCHAR(100) USING sub::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN jml TYPE VARCHAR(100) USING jml::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN t_bhn TYPE VARCHAR(100) USING t_bhn::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN l_fin TYPE VARCHAR(100) USING l_fin::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN d_fin TYPE VARCHAR(100) USING d_fin::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN p1 TYPE VARCHAR(100) USING p1::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN p2 TYPE VARCHAR(100) USING p2::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN l1 TYPE VARCHAR(100) USING l1::VARCHAR;
ALTER TABLE breakdown_rows ALTER COLUMN l2 TYPE VARCHAR(100) USING l2::VARCHAR;

-- 4. Recreate v_bom using safe_numeric casting
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
  -- Area calculations using safe_numeric
  ROUND((safe_numeric(br.p) * safe_numeric(br.l) / 1000000.0)::NUMERIC, 4) AS m2_per_unit,
  ROUND((safe_numeric(br.p) * safe_numeric(br.l) * safe_numeric(br.jml) / 1000000.0)::NUMERIC, 4) AS m2_total,
  ROUND((safe_numeric(br.p) * safe_numeric(br.l) * safe_numeric(br.t) * safe_numeric(br.jml) / 1000000000.0)::NUMERIC, 6) AS m3_total,
  -- Edging
  br.edg_p1, br.edg_p2, br.edg_l1, br.edg_l2,
  br.p1, br.p2, br.l1, br.l2,
  -- Hardware
  br.q_engsel, br.q_rel, br.q_dormec, br.q_minifix, br.q_dowel,
  br.urutan
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id
JOIN moduls m ON m.id = br.modul_id
WHERE br.type = 'prt';

-- 5. Recreate v_rekap using safe_numeric casting
CREATE OR REPLACE VIEW v_rekap AS
SELECT
  br.project_id,
  p.name AS project_name,
  p.client,
  br.bhn,
  br.t_bhn,
  br.lap_luar,
  COUNT(*)                                                    AS jumlah_baris,
  SUM(safe_numeric(br.jml))                                   AS total_qty,
  ROUND(SUM(safe_numeric(br.p) * safe_numeric(br.l) * safe_numeric(br.jml) / 1000000.0)::NUMERIC, 4)  AS total_m2,
  ROUND(SUM(safe_numeric(br.p) * safe_numeric(br.l) * safe_numeric(br.t) * safe_numeric(br.jml) / 1000000000.0)::NUMERIC, 6) AS total_m3
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id
WHERE br.type = 'prt'
  AND br.bhn IS NOT NULL
  AND br.bhn != ''
GROUP BY br.project_id, p.name, p.client, br.bhn, br.t_bhn, br.lap_luar;

-- 6. Recreate v_rekap_hardware using safe_numeric casting
CREATE OR REPLACE VIEW v_rekap_hardware AS
SELECT
  br.project_id,
  p.name AS project_name,
  SUM(br.q_engsel * safe_numeric(br.jml))  AS total_engsel,
  SUM(br.q_rel * safe_numeric(br.jml))     AS total_rel,
  SUM(br.q_dormec * safe_numeric(br.jml))  AS total_dormec,
  SUM(br.q_minifix * safe_numeric(br.jml)) AS total_minifix,
  SUM(br.q_dowel * safe_numeric(br.jml))   AS total_dowel
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id
WHERE br.type = 'prt'
GROUP BY br.project_id, p.name;

-- 7. Recreate v_rekap_edging using safe_numeric casting
CREATE OR REPLACE VIEW v_rekap_edging AS
SELECT
  br.project_id,
  p.name AS project_name,
  edg_type,
  ROUND(SUM(safe_numeric(edg_length) * safe_numeric(br.jml) / 1000.0)::NUMERIC, 3) AS total_meter
FROM breakdown_rows br
JOIN projects p ON p.id = br.project_id,
LATERAL (VALUES
  (br.edg_p1, br.p1, br.p),
  (br.edg_p2, br.p2, br.p),
  (br.edg_l1, br.l1, br.l),
  (br.edg_l2, br.l2, br.l)
) AS t(edg_type, edg_fin, edg_length)
WHERE br.type = 'prt'
GROUP BY br.project_id, p.name, edg_type;
