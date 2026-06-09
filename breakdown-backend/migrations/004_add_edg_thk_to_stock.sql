-- ============================================================
-- MIGRATION 004: Add edg_thk to stock table
-- ============================================================

ALTER TABLE stock ADD COLUMN IF NOT EXISTS edg_thk NUMERIC(8, 2) DEFAULT NULL;
