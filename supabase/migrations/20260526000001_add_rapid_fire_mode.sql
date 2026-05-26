-- Rapid Fire support for Battle Arena.
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS win_target INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS question_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS winner_user_id UUID,
  ADD COLUMN IF NOT EXISTS winner_team INTEGER,
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.battle_answer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_room_id UUID REFERENCES public.battle_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  team INTEGER,
  question_index INTEGER NOT NULL,
  question_id TEXT,
  selected_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (battle_room_id, user_id, question_index)
);

ALTER TABLE public.battle_answer_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_answer_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_battle_answer_events_room_question
  ON public.battle_answer_events(battle_room_id, question_index, submitted_at);

CREATE INDEX IF NOT EXISTS idx_battle_answer_events_room_user
  ON public.battle_answer_events(battle_room_id, user_id);

CREATE INDEX IF NOT EXISTS idx_battle_answer_events_room_team
  ON public.battle_answer_events(battle_room_id, team)
  WHERE team IS NOT NULL;

CREATE OR REPLACE FUNCTION public.submit_rapid_fire_answer(
  p_room_id UUID,
  p_user_id UUID,
  p_question_index INTEGER,
  p_question_id TEXT,
  p_selected_answer TEXT,
  p_response_time_ms INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.battle_rooms%ROWTYPE;
  v_participant public.battle_participants%ROWTYPE;
  v_question JSONB;
  v_correct_answer TEXT;
  v_is_correct BOOLEAN := FALSE;
  v_inserted_id UUID;
  v_player_correct INTEGER := 0;
  v_team_correct INTEGER := 0;
  v_win_target INTEGER := 20;
BEGIN
  SELECT *
  INTO v_room
  FROM public.battle_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'room_not_found');
  END IF;

  IF v_room.battle_type <> 'rapid_fire' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'not_rapid_fire');
  END IF;

  IF v_room.status <> 'in_progress' THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'room_not_active');
  END IF;

  SELECT *
  INTO v_participant
  FROM public.battle_participants
  WHERE battle_room_id = p_room_id
    AND user_id = p_user_id
    AND kicked_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'participant_not_found');
  END IF;

  v_question := v_room.questions -> p_question_index;
  IF v_question IS NULL THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'question_not_found');
  END IF;

  v_correct_answer := v_question ->> 'correct_answer';
  v_is_correct := COALESCE(trim(p_selected_answer), '') = COALESCE(trim(v_correct_answer), '');
  v_win_target := COALESCE(v_room.win_target, 20);

  INSERT INTO public.battle_answer_events (
    battle_room_id,
    user_id,
    username,
    team,
    question_index,
    question_id,
    selected_answer,
    is_correct,
    response_time_ms
  )
  VALUES (
    p_room_id,
    p_user_id,
    v_participant.username,
    v_participant.team,
    p_question_index,
    p_question_id,
    p_selected_answer,
    v_is_correct,
    GREATEST(COALESCE(p_response_time_ms, 0), 0)
  )
  ON CONFLICT (battle_room_id, user_id, question_index) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN jsonb_build_object('accepted', false, 'reason', 'already_answered');
  END IF;

  IF v_is_correct THEN
    SELECT COUNT(*)
    INTO v_player_correct
    FROM public.battle_answer_events
    WHERE battle_room_id = p_room_id
      AND user_id = p_user_id
      AND is_correct = true;

    UPDATE public.battle_participants
    SET score = v_player_correct,
        answers = COALESCE(answers, '[]'::jsonb) || jsonb_build_object(
          'questionIndex', p_question_index,
          'questionId', p_question_id,
          'selectedAnswer', p_selected_answer,
          'isCorrect', v_is_correct,
          'responseTimeMs', GREATEST(COALESCE(p_response_time_ms, 0), 0),
          'submittedAt', now()
        )
    WHERE battle_room_id = p_room_id
      AND user_id = p_user_id;

    IF v_participant.team IS NOT NULL THEN
      SELECT COUNT(*)
      INTO v_team_correct
      FROM public.battle_answer_events
      WHERE battle_room_id = p_room_id
        AND team = v_participant.team
        AND is_correct = true;
    END IF;

    IF v_player_correct >= v_win_target THEN
      UPDATE public.battle_rooms
      SET status = 'completed',
          winner_user_id = p_user_id,
          winner_team = NULL,
          ended_at = now()
      WHERE id = p_room_id
        AND status = 'in_progress';
    ELSIF v_participant.team IS NOT NULL AND v_team_correct >= v_win_target THEN
      UPDATE public.battle_rooms
      SET status = 'completed',
          winner_user_id = NULL,
          winner_team = v_participant.team,
          ended_at = now()
      WHERE id = p_room_id
        AND status = 'in_progress';
    END IF;
  ELSE
    UPDATE public.battle_participants
    SET answers = COALESCE(answers, '[]'::jsonb) || jsonb_build_object(
      'questionIndex', p_question_index,
      'questionId', p_question_id,
      'selectedAnswer', p_selected_answer,
      'isCorrect', v_is_correct,
      'responseTimeMs', GREATEST(COALESCE(p_response_time_ms, 0), 0),
      'submittedAt', now()
    )
    WHERE battle_room_id = p_room_id
      AND user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'accepted', true,
    'isCorrect', v_is_correct,
    'correctAnswer', v_correct_answer,
    'playerCorrect', v_player_correct,
    'teamCorrect', v_team_correct,
    'winnerUserId', CASE WHEN v_player_correct >= v_win_target THEN p_user_id ELSE NULL END,
    'winnerTeam', CASE WHEN v_team_correct >= v_win_target THEN v_participant.team ELSE NULL END,
    'submittedAt', now()
  );
END;
$$;
