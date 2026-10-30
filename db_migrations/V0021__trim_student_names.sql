UPDATE t_p10685360_training_log_tracker.students
SET name = btrim(regexp_replace(name, '\s+', ' ', 'g'))
WHERE name <> btrim(regexp_replace(name, '\s+', ' ', 'g'));

UPDATE t_p10685360_training_log_tracker.student_events
SET student_name = btrim(regexp_replace(student_name, '\s+', ' ', 'g'))
WHERE student_name IS NOT NULL AND student_name <> btrim(regexp_replace(student_name, '\s+', ' ', 'g'));