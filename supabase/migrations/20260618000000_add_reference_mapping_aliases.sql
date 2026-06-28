INSERT INTO book_reference_mappings (source_pattern, canonical_name, edition, page_offset, enabled) VALUES
    ('Lippincotts Illustrated Reviews', 'Lippincott Illustrated Reviews: Pharmacology', '6th Edition', 0, true)
ON CONFLICT (source_pattern) DO UPDATE
SET canonical_name = EXCLUDED.canonical_name,
    edition = EXCLUDED.edition,
    page_offset = EXCLUDED.page_offset,
    enabled = true;
