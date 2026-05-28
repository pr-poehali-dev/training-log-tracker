CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.notifications (
  id serial PRIMARY KEY,
  user_id integer,
  type text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW()
);