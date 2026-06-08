ALTER TABLE public.user_answers
ADD COLUMN IF NOT EXISTS correction_mode BOOLEAN NOT NULL DEFAULT false;
