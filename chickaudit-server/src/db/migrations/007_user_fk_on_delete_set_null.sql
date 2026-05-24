-- Allow user deletion while preserving related farm records.
-- Child rows keep their data; user references are cleared automatically.

ALTER TABLE daily_logs ALTER COLUMN logged_by DROP NOT NULL;
ALTER TABLE sales ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN recorded_by DROP NOT NULL;
ALTER TABLE health_events ALTER COLUMN recorded_by DROP NOT NULL;

ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_logged_by_fkey;
ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_logged_by_fkey
  FOREIGN KEY (logged_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_recorded_by_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_recorded_by_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE health_events DROP CONSTRAINT IF EXISTS health_events_recorded_by_fkey;
ALTER TABLE health_events ADD CONSTRAINT health_events_recorded_by_fkey
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL;
