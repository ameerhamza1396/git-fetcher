ALTER TABLE flp_user_attempts ADD COLUMN IF NOT EXISTS r2_key text;

COMMENT ON COLUMN flp_user_attempts.r2_key IS 'R2 storage key for full attempt data (MCQ JSON). NULL for legacy records.';
