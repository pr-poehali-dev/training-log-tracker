CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.student_events (
  id SERIAL PRIMARY KEY,
  student_id INTEGER,
  trainer_id INTEGER,
  student_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_events_date ON t_p10685360_training_log_tracker.student_events (event_date);
CREATE INDEX IF NOT EXISTS idx_student_events_trainer ON t_p10685360_training_log_tracker.student_events (trainer_id);

INSERT INTO t_p10685360_training_log_tracker.student_events (student_id, trainer_id, student_name, event_type, event_date)
SELECT id, trainer_id, name, 'joined', (created_at AT TIME ZONE 'Europe/Moscow')::date
FROM t_p10685360_training_log_tracker.students
WHERE created_at IS NOT NULL;

INSERT INTO t_p10685360_training_log_tracker.student_events (student_id, trainer_id, student_name, event_type, event_date, reason)
SELECT id, trainer_id, name, 'left', (archived_at AT TIME ZONE 'Europe/Moscow')::date, archive_reason
FROM t_p10685360_training_log_tracker.students
WHERE archived = TRUE AND archived_at IS NOT NULL;