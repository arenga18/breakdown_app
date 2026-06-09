-- ============================================================
-- MIGRATION 003: Add missing columns to template_parts and breakdown_rows
-- ============================================================

-- Add columns to template_parts (blueprints/formulas)
ALTER TABLE template_parts ADD COLUMN IF NOT EXISTS opt VARCHAR(50);
ALTER TABLE template_parts ADD COLUMN IF NOT EXISTS t_luar VARCHAR(100);
ALTER TABLE template_parts ADD COLUMN IF NOT EXISTS t_dalam VARCHAR(100);
ALTER TABLE template_parts ADD COLUMN IF NOT EXISTS q_siku INTEGER DEFAULT 0;
ALTER TABLE template_parts ADD COLUMN IF NOT EXISTS q_screw INTEGER DEFAULT 0;

-- Add columns to breakdown_rows (evaluated numbers)
ALTER TABLE breakdown_rows ADD COLUMN IF NOT EXISTS opt INTEGER DEFAULT 0;
ALTER TABLE breakdown_rows ADD COLUMN IF NOT EXISTS t_luar NUMERIC(8, 2);
ALTER TABLE breakdown_rows ADD COLUMN IF NOT EXISTS t_dalam NUMERIC(8, 2);
ALTER TABLE breakdown_rows ADD COLUMN IF NOT EXISTS q_siku INTEGER DEFAULT 0;
ALTER TABLE breakdown_rows ADD COLUMN IF NOT EXISTS q_screw INTEGER DEFAULT 0;
