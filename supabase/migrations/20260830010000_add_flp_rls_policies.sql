-- Enable RLS on flp_user_attempts if not already enabled
ALTER TABLE flp_user_attempts ENABLE ROW LEVEL SECURITY;

-- Users can read their own FLP attempts
CREATE POLICY "Users can read own FLP attempts"
  ON flp_user_attempts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own FLP attempts
CREATE POLICY "Users can insert own FLP attempts"
  ON flp_user_attempts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own FLP attempts
CREATE POLICY "Users can update own FLP attempts"
  ON flp_user_attempts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own FLP attempts (for pruning old records)
CREATE POLICY "Users can delete own FLP attempts"
  ON flp_user_attempts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all FLP attempts (for RPCs and admin)
CREATE POLICY "Service role can manage all FLP attempts"
  ON flp_user_attempts
  FOR ALL
  USING (auth.role() = 'service_role');
