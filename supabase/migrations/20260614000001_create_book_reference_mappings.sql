CREATE TABLE IF NOT EXISTS book_reference_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_pattern TEXT NOT NULL UNIQUE,
    canonical_name TEXT NOT NULL,
    edition TEXT,
    page_offset INTEGER NOT NULL DEFAULT 0,
    show_extracted_text BOOLEAN NOT NULL DEFAULT false,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO book_reference_mappings (source_pattern, canonical_name, edition, page_offset) VALUES
    ('Pathoma', 'Pathoma', '2023', 0),
    ('Harper''s Illustrated Biochemistry', 'Harper''s Illustrated Biochemistry', '31st Edition', 0),
    ('Bailey Loves Short Practice of Surgery 27th', 'Bailey & Love''s Short Practice of Surgery', '27th Edition', 0),
    ('Gynaecology by Ten Teachers', 'Gynaecology by Ten Teachers', '20th Edition', 0),
    ('BD Chaurasia s Handbook of General Anatomy', 'BD Chaurasia''s Handbook of General Anatomy', '4th Edition', 0),
    ('DavidsonMedicine24th', 'Davidson''s Principles & Practice of Medicine', '24th Edition', 0),
    ('First Aid for the USMLE Step 1 2026', 'First Aid for the USMLE Step 1', '2026', 0),
    ('Guyton and Hall Textbook of Medical Physiology', 'Guyton & Hall Textbook of Medical Physiology', '12th Ed', 0),
    ('Lippincott Illustrated Reviews', 'Lippincott Illustrated Reviews: Pharmacology', '6th Edition', 0),
    ('Lippincotts Illustrated Reviews Biochemistry', 'Lippincott Illustrated Reviews: Biochemistry', '5th Edition', 0),
    ('Obstetrics by Ten Teachers', 'Obstetrics by Ten Teachers', '19th Edition', 0),
    ('Snell''s Clinical Neuroanatomy', 'Snell''s Clinical Neuroanatomy', '8th Edition', 0)
ON CONFLICT (source_pattern) DO NOTHING;

ALTER TABLE book_reference_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for book_reference_mappings"
    ON book_reference_mappings FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage book_reference_mappings"
    ON book_reference_mappings FOR ALL
    USING (auth.role() = 'service_role');
