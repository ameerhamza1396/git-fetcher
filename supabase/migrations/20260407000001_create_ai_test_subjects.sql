-- Create AI Test Generator Subjects table
CREATE TABLE IF NOT EXISTS ai_test_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    year VARCHAR(20) NOT NULL, -- '1st', '2nd', '3rd', '4th', '5th'
    institutes TEXT[] DEFAULT ARRAY['ALL'], -- Array of institute codes, 'ALL' means visible to all
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_test_subjects ENABLE ROW LEVEL SECURITY;

-- Create policy for reading active subjects
CREATE POLICY "Enable read access for active subjects" ON ai_test_subjects
    FOR SELECT USING (is_active = true);

-- Insert current data with 'ALL' institute (visible to all)
INSERT INTO ai_test_subjects (subject_code, subject_name, year, institutes) VALUES
-- 1st Year
('FND1', 'Foundation', '1st', ARRAY['ALL']),
('HEM1', 'Hematology', '1st', ARRAY['ALL']),
('LCM1', 'Locomotor System', '1st', ARRAY['ALL']),
('RSP1', 'Respiratory System', '1st', ARRAY['ALL']),
('CVS1', 'Cardiovascular System', '1st', ARRAY['ALL']),

-- 2nd Year
('NEU1', 'Nervous System (Neurosciences)', '2nd', ARRAY['ALL']),
('HNN1', 'Head & Neck and Special Senses', '2nd', ARRAY['ALL']),
('END1', 'Endocrinology', '2nd', ARRAY['ALL']),
('GIL1', 'Gastrointestinal Tract and Liver', '2nd', ARRAY['ALL']),
('EXC1', 'Renal and Excretory System', '2nd', ARRAY['ALL']),
('REP1', 'Reproductive System', '2nd', ARRAY['ALL']),

-- 3rd Year
('FND2', 'Foundation II', '3rd', ARRAY['ALL']),
('IDD1', 'Infectious Diseases', '3rd', ARRAY['ALL']),
('HEM2', 'Hematology II', '3rd', ARRAY['ALL']),
('RSP2', 'Respiratory System II', '3rd', ARRAY['ALL']),
('CVS2', 'Cardiovascular System II', '3rd', ARRAY['ALL']),
('GIL2', 'Gastrointestinal Tract and Liver II', '3rd', ARRAY['ALL']),
('END2', 'Endocrinology II', '3rd', ARRAY['ALL']),
('EXC2', 'Renal and Excretory System II', '3rd', ARRAY['ALL']),

-- 4th Year
('ORT2', 'Orthopedics, Rheumatology, Trauma', '4th', ARRAY['ALL']),
('PMR', 'Physical Medicine & Rehabilitation', '4th', ARRAY['ALL']),
('DPS', 'Dermatology, Plastic Surgery/Burns', '4th', ARRAY['ALL']),
('GEN', 'Genetics', '4th', ARRAY['ALL']),
('REP2', 'Reproductive System II', '4th', ARRAY['ALL']),
('NEU2', 'Neurosciences and Psychiatry', '4th', ARRAY['ALL']),
('ENT', 'Ear, Nose, and Throat (ENT)', '4th', ARRAY['ALL']),
('OPH', 'Ophthalmology', '4th', ARRAY['ALL']),

-- 5th Year (Clinical Rotations)
('MED', 'Medicine Rotation', '5th', ARRAY['ALL']),
('SUR', 'Surgery Rotation', '5th', ARRAY['ALL']),
('GYO', 'Gynecology and Obstetrics', '5th', ARRAY['ALL']),
('PAE', 'Pediatrics', '5th', ARRAY['ALL'])
ON CONFLICT DO NOTHING;

-- Create function to get AI test stats for a user
CREATE OR REPLACE FUNCTION get_ai_test_user_stats(p_user_id UUID)
RETURNS TABLE (
    total_tests BIGINT,
    total_questions BIGINT,
    correct_answers BIGINT,
    accuracy DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT AS total_tests,
        COALESCE(SUM(t.total_questions), 0)::BIGINT AS total_questions,
        COALESCE(SUM(t.score), 0)::BIGINT AS correct_answers,
        CASE 
            WHEN SUM(t.total_questions) > 0 
            THEN ROUND((SUM(t.score)::NUMERIC / SUM(t.total_questions)::NUMERIC) * 100, 2)
            ELSE 0
        END AS accuracy
    FROM ai_generated_tests t
    WHERE t.user_id = p_user_id AND t.test_taken = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;