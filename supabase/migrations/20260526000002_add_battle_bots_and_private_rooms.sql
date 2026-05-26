ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.battle_participants
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS bot_accuracy NUMERIC(4,3);

CREATE INDEX IF NOT EXISTS idx_battle_rooms_private_status
  ON public.battle_rooms(is_private, status);

CREATE INDEX IF NOT EXISTS idx_battle_participants_bot_room
  ON public.battle_participants(battle_room_id, is_bot);
