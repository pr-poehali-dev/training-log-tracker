CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.restore_requests (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL,
  trainer_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER
);

CREATE INDEX IF NOT EXISTS idx_restore_requests_student ON t_p10685360_training_log_tracker.restore_requests (student_id, status);

ALTER TABLE t_p10685360_training_log_tracker.notifications ADD COLUMN IF NOT EXISTS ref_id INTEGER;