-- Drop table if exists to ensure clean creation
DROP TABLE IF EXISTS ai_generated_tests;

-- Create AI Generated Tests table
CREATE TABLE IF NOT EXISTS ai_generated_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    topic VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'medium',
    questions JSONB NOT NULL,
    total_questions INTEGER NOT NULL,
    test_taken BOOLEAN DEFAULT false,
    score INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE ai_generated_tests ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own tests
CREATE POLICY "Users can view own AI tests" ON ai_generated_tests
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own tests
CREATE POLICY "Users can insert own AI tests" ON ai_generated_tests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own tests
CREATE POLICY "Users can update own AI tests" ON ai_generated_tests
    FOR UPDATE USING (auth.uid() = user_id);