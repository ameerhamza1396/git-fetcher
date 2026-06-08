ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '{
  "earned_badge_ids": [],
  "stats": {},
  "synced_at": null
}'::jsonb;

COMMENT ON COLUMN public.profiles.badges IS 'Achievement badge sync data: earned_badge_ids, derived stats, and last sync timestamp.';
