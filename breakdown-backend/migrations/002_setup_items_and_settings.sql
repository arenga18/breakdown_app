-- ============================================================
-- MIGRATION 002: setup_items + app_settings
-- ============================================================

-- Setup Items (komponen Set_up / aksesori yang dicustom user)
CREATE TABLE IF NOT EXISTS setup_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(500) NOT NULL,
  no          VARCHAR(100) DEFAULT '•',
  ks          VARCHAR(100) DEFAULT '[ks]',
  urutan      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_setup_items_name ON setup_items USING GIN(name gin_trgm_ops);

-- App Settings (global JSONB store — tplSections, modulMasterData, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key         VARCHAR(255) PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for setup_items updated_at
DROP TRIGGER IF EXISTS set_updated_at ON setup_items;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON setup_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
