-- Migration to update restriction_details default and add appeal field
ALTER TABLE public.profiles 
ALTER COLUMN restriction_details SET DEFAULT '{
  "user_restricted": false,
  "reason": null,
  "duration": null,
  "reviewed": false,
  "decision": false,
  "appeal": null
}'::jsonb;

-- Update existing rows to include the appeal field if it doesn't exist
UPDATE public.profiles 
SET restriction_details = restriction_details || '{"appeal": null}'::jsonb
WHERE restriction_details IS NOT NULL AND restriction_details->>'appeal' IS NULL;
