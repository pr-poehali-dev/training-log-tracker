ALTER TABLE t_p10685360_training_log_tracker.students
ADD COLUMN IF NOT EXISTS team_level TEXT NOT NULL DEFAULT 'regular';