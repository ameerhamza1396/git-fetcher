
-- Enable realtime for battle rooms and participants
ALTER TABLE public.battle_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.battle_participants REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_participants;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON public.battle_rooms(status);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_created_at ON public.battle_rooms(created_at);
CREATE INDEX IF NOT EXISTS idx_battle_participants_room_id ON public.battle_participants(battle_room_id);
CREATE INDEX IF NOT EXISTS idx_battle_participants_user_id ON public.battle_participants(user_id);

-- Function to automatically update participant count
CREATE OR REPLACE FUNCTION update_battle_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.battle_rooms 
    SET current_players = (
      SELECT COUNT(*) 
      FROM public.battle_participants 
      WHERE battle_room_id = NEW.battle_room_id 
      AND kicked_at IS NULL
    )
    WHERE id = NEW.battle_room_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.battle_rooms 
    SET current_players = (
      SELECT COUNT(*) 
      FROM public.battle_participants 
      WHERE battle_room_id = OLD.battle_room_id 
      AND kicked_at IS NULL
    )
    WHERE id = OLD.battle_room_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for participant count updates
DROP TRIGGER IF EXISTS trigger_update_participant_count_insert ON public.battle_participants;
DROP TRIGGER IF EXISTS trigger_update_participant_count_delete ON public.battle_participants;

CREATE TRIGGER trigger_update_participant_count_insert
  AFTER INSERT ON public.battle_participants
  FOR EACH ROW EXECUTE FUNCTION update_battle_room_participant_count();

CREATE TRIGGER trigger_update_participant_count_delete
  AFTER DELETE ON public.battle_participants
  FOR EACH ROW EXECUTE FUNCTION update_battle_room_participant_count();
