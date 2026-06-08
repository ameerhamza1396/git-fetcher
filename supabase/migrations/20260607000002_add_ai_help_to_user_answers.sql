ALTER TABLE public.user_answers
ADD COLUMN IF NOT EXISTS used_ai_help BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_answers.used_ai_help IS 'True when the user pressed Help with current question from Dr Ahroid before submitting this MCQ attempt.';
