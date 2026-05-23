CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.users (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'trainer',
  full_name   TEXT NOT NULL,
  hall        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.students (
  id          SERIAL PRIMARY KEY,
  trainer_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.users(id),
  name        TEXT NOT NULL,
  hall        TEXT,
  grp         TEXT,
  phone       TEXT,
  iko         TEXT,
  fee         INTEGER DEFAULT 3000,
  lvl         TEXT,
  cert        BOOLEAN DEFAULT FALSE,
  cert_from   DATE,
  cert_to     DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.attendance (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.students(id),
  trainer_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.users(id),
  date        DATE NOT NULL,
  present     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.payments (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.students(id),
  trainer_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.users(id),
  month       TEXT NOT NULL,
  paid        BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at     TIMESTAMPTZ,
  UNIQUE(student_id, month)
);

CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.personal_sessions (
  id          SERIAL PRIMARY KEY,
  student_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.students(id),
  trainer_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.users(id),
  date        DATE NOT NULL,
  duration    INTEGER DEFAULT 60,
  cost        INTEGER DEFAULT 1500,
  paid        BOOLEAN DEFAULT FALSE,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p10685360_training_log_tracker.notes (
  id          SERIAL PRIMARY KEY,
  trainer_id  INTEGER NOT NULL REFERENCES t_p10685360_training_log_tracker.users(id),
  title       TEXT NOT NULL,
  body        TEXT,
  tags        TEXT,
  important   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
