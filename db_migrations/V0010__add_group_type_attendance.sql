ALTER TABLE t_p10685360_training_log_tracker.attendance
  ADD COLUMN IF NOT EXISTS group_type text NOT NULL DEFAULT 'main';

ALTER TABLE t_p10685360_training_log_tracker.attendance
  DROP CONSTRAINT IF EXISTS attendance_student_date_unique;

ALTER TABLE t_p10685360_training_log_tracker.students
  ADD COLUMN IF NOT EXISTS has_sport boolean NOT NULL DEFAULT false;

ALTER TABLE t_p10685360_training_log_tracker.students
  ADD COLUMN IF NOT EXISTS sport_schedule text;
