CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.push_subscriptions (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW()
);