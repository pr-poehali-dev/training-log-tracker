-- Новые поля для карточки ученика
ALTER TABLE t_p10685360_training_log_tracker.students
  ADD COLUMN IF NOT EXISTS hall2 text,
  ADD COLUMN IF NOT EXISTS annual_fee_number text,
  ADD COLUMN IF NOT EXISTS birthdate date,
  ADD COLUMN IF NOT EXISTS insurance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insurance_to date,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;
