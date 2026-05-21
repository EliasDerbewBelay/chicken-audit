-- ============================================================
-- 003_settings.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default starting flock count if it doesn't exist
INSERT INTO settings (key, value) 
VALUES ('starting_flock', '200')
ON CONFLICT (key) DO NOTHING;
