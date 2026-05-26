-- Ensure Rapid Fire is accepted by existing Battle Arena schemas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'battle_type'
      AND t.typtype = 'e'
  ) THEN
    ALTER TYPE public.battle_type ADD VALUE IF NOT EXISTS 'rapid_fire';
  END IF;
END;
$$;

DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class rel ON rel.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = rel.relnamespace
    WHERE n.nspname = 'public'
      AND rel.relname = 'battle_rooms'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%battle_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.battle_rooms DROP CONSTRAINT %I', constraint_record.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.battle_rooms
  ADD CONSTRAINT battle_rooms_battle_type_check
  CHECK (battle_type IN ('1v1', '2v2', 'ffa', 'rapid_fire'));
