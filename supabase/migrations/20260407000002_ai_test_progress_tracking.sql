-- AI Test Generator Progress Tracking

-- 1. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_generated_tests_user_id ON ai_generated_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generated_tests_test_taken ON ai_generated_tests(test_taken);
CREATE INDEX IF NOT EXISTS idx_ai_generated_tests_created_at ON ai_generated_tests(created_at DESC);

-- 2. Function to get detailed AI test progress
CREATE OR REPLACE FUNCTION get_ai_test_progress(p_user_id UUID)
RETURNS TABLE (
    total_tests BIGINT,
    total_questions BIGINT,
    correct_answers BIGINT,
    accuracy DECIMAL(5,2),
    average_time_per_question DECIMAL(6,2),
    best_score DECIMAL(5,2),
    last_test_date TIMESTAMPTZ,
    streak_days INTEGER
) AS $$
DECLARE
    v_total_tests BIGINT;
    v_total_questions BIGINT;
    v_correct_answers BIGINT;
    v_accuracy DECIMAL(5,2);
    v_avg_time DECIMAL(6,2);
    v_best_score DECIMAL(5,2);
    v_last_date TIMESTAMPTZ;
    v_streak INTEGER := 0;
    v_test_date DATE;
    v_prev_date DATE;
BEGIN
    -- Get basic stats
    SELECT 
        COUNT(*),
        COALESCE(SUM(total_questions), 0),
        COALESCE(SUM(score), 0),
        CASE 
            WHEN SUM(total_questions) > 0 
            THEN ROUND((SUM(score)::NUMERIC / SUM(total_questions)::NUMERIC) * 100, 2)
            ELSE 0
        END,
        COALESCE(MAX(accuracy), 0),
        MAX(created_at)
    INTO v_total_tests, v_total_questions, v_correct_answers, v_accuracy, v_best_score, v_last_date
    FROM ai_generated_tests 
    WHERE user_id = p_user_id AND test_taken = true;

    -- Calculate streak (consecutive days with tests)
    IF v_last_date IS NOT NULL THEN
        v_test_date := v_last_date::DATE;
        
        -- Count backwards from last test date
        WHILE EXISTS (
            SELECT 1 FROM ai_generated_tests 
            WHERE user_id = p_user_id 
            AND test_taken = true 
            AND created_at::DATE = v_test_date
        ) LOOP
            v_streak := v_streak + 1;
            v_test_date := v_test_date - 1;
        END LOOP;
    END IF;

    RETURN QUERY SELECT 
        v_total_tests,
        v_total_questions,
        v_correct_answers,
        v_accuracy,
        v_avg_time,
        v_best_score,
        v_last_date,
        v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Function to get recent AI test history
CREATE OR REPLACE FUNCTION get_ai_test_history(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    topic VARCHAR,
    total_questions INTEGER,
    score INTEGER,
    accuracy DECIMAL(5,2),
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.topic,
        t.total_questions,
        t.score,
        t.accuracy,
        t.created_at
    FROM ai_generated_tests t
    WHERE t.user_id = p_user_id AND t.test_taken = true
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. View for easy access to AI test stats
CREATE OR REPLACE VIEW ai_test_user_stats_view AS
SELECT 
    t.user_id,
    COUNT(*) as total_tests,
    SUM(t.total_questions) as total_questions,
    SUM(t.score) as total_correct,
    ROUND(AVG(t.accuracy), 2) as avg_accuracy,
    MAX(t.created_at) as last_test
FROM ai_generated_tests t
WHERE t.test_taken = true
GROUP BY t.user_id;