INSERT INTO t_p10685360_training_log_tracker.users (username, password, role, full_name, hall)
SELECT 'admin', 'admin123', 'admin', 'Администратор', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM t_p10685360_training_log_tracker.users WHERE username = 'admin'
);
