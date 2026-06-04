CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.expenses (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);