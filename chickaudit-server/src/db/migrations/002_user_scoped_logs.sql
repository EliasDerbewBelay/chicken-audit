-- ============================================================
-- 002_user_scoped_logs.sql
-- ============================================================

-- Drop the global unique constraint on log_date
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_log_date_key;

-- Add a new constraint so a user can only log once per day
ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_log_date_logged_by_key UNIQUE (log_date, logged_by);
