ALTER TABLE t_p10685360_training_log_tracker.personal_sessions
  ADD COLUMN IF NOT EXISTS session_type varchar(40) NOT NULL DEFAULT 'personal';