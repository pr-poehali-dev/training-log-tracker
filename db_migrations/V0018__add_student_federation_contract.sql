ALTER TABLE t_p10685360_training_log_tracker.students
  ADD COLUMN IF NOT EXISTS federation_contract BOOLEAN NOT NULL DEFAULT FALSE;