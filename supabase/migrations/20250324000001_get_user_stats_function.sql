-- Optimized user stats function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_total_questions INTEGER;
  v_correct_answers INTEGER;
  v_accuracy INTEGER;
  v_current_streak INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE is_correct = true)
  INTO v_total_questions, v_correct_answers
  FROM user_answers
  WHERE user_id = p_user_id;

  v_accuracy := CASE WHEN v_total_questions > 0 THEN ROUND((v_correct_answers::NUMERIC / v_total_questions) * 100)::INTEGER ELSE 0 END;

  WITH daily_dates AS (
    SELECT DISTINCT (created_at AT TIME ZONE 'Asia/Karachi')::date as d
    FROM user_answers
    WHERE user_id = p_user_id
    ORDER BY d DESC
  ),
  today_pkt AS (
    SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::date as d
  ),
  streak AS (
    SELECT d, d = (SELECT d FROM today_pkt) OR d = (SELECT d FROM today_pkt) - 1 as has_today,
           ROW_NUMBER() OVER (ORDER BY d DESC) as rn,
           ROW_NUMBER() OVER (ORDER BY d ASC) as rn_asc
    FROM daily_dates
  )
  SELECT COALESCE(MAX(CASE WHEN has_today THEN rn_asc END), 0)
  INTO v_current_streak
  FROM streak
  WHERE d >= (SELECT d FROM today_pkt) - 30;

  RETURN json_build_object(
    'total_questions', v_total_questions,
    'correct_answers', v_correct_answers,
    'accuracy', v_accuracy,
    'current_streak', v_current_streak
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
