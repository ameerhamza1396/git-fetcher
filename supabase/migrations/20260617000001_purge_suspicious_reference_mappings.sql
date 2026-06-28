UPDATE book_reference_mappings
SET enabled = false
WHERE source_pattern ILIKE '%medicalstudyzone%'
   OR source_pattern ILIKE '%pdfdrive%'
   OR source_pattern ILIKE '%pdf drive%'
   OR source_pattern = '356 20190306181657 (1)';

INSERT INTO book_reference_mappings (source_pattern, canonical_name, edition, page_offset, enabled) VALUES
    ('Pathoma', 'Pathoma', '2023', 0, true),
    ('Gynaecology by Ten Teachers', 'Gynaecology by Ten Teachers', '20th Edition', 0, true),
    ('Lippincott Illustrated Reviews', 'Lippincott Illustrated Reviews: Pharmacology', '6th Edition', 0, true)
ON CONFLICT (source_pattern) DO UPDATE
SET canonical_name = EXCLUDED.canonical_name,
    edition = EXCLUDED.edition,
    page_offset = EXCLUDED.page_offset,
    enabled = true;
