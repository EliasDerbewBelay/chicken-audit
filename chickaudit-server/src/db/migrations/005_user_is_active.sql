-- ============================================================
-- 005_user_is_active.sql
-- ============================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
