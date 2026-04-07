-- SEQs Tables
CREATE TABLE IF NOT EXISTS seqs_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    year TEXT NOT NULL,
    institutes TEXT[] DEFAULT '{all}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seqs_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    chapter_number INTEGER NOT NULL,
    subject_id UUID NOT NULL REFERENCES seqs_subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    model_answer TEXT NOT NULL,
    explanation TEXT,
    chapter_id UUID NOT NULL REFERENCES seqs_chapters(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_seq_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seq_id UUID NOT NULL REFERENCES seqs(id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN,
    satisfaction_index INTEGER,
    corrected_answer TEXT,
    explanation TEXT,
    book_reference TEXT,
    time_taken INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seqs_chapters_subject ON seqs_chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_seqs_chapter ON seqs(chapter_id);
CREATE INDEX IF NOT EXISTS idx_user_seq_answers_user ON user_seq_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_seq_answers_seq ON user_seq_answers(seq_id);
CREATE INDEX IF NOT EXISTS idx_seqs_subjects_year ON seqs_subjects(year);

ALTER TABLE seqs_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seqs_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE seqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_seq_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for seqs_subjects" ON seqs_subjects FOR SELECT USING (true);
CREATE POLICY "Service role can manage seqs_subjects" ON seqs_subjects FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access for seqs_chapters" ON seqs_chapters FOR SELECT USING (true);
CREATE POLICY "Service role can manage seqs_chapters" ON seqs_chapters FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access for seqs" ON seqs FOR SELECT USING (true);
CREATE POLICY "Service role can manage seqs" ON seqs FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can read own seq answers" ON user_seq_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own seq answers" ON user_seq_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own seq answers" ON user_seq_answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage all seq answers" ON user_seq_answers FOR ALL USING (auth.role() = 'service_role');
