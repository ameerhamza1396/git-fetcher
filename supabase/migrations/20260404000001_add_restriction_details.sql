-- Migration to add restriction_details to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS restriction_details JSONB DEFAULT '{
  "user_restricted": false,
  "reason": null,
  "duration": null,
  "reviewed": false,
  "decision": false
}'::jsonb;

-- Comment on the column for documentation
COMMENT ON COLUMN public.profiles.restriction_details IS 'Stores user restriction info: user_restricted (bool), reason (text), duration (timestamp), reviewed (bool), decision (bool)';
