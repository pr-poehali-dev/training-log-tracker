ALTER TABLE t_p10685360_training_log_tracker.attendance
  ADD CONSTRAINT attendance_student_date_type_unique
  UNIQUE (student_id, date, group_type);
