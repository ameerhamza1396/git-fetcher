ALTER TABLE book_reference_mappings
ADD COLUMN IF NOT EXISTS show_extracted_text BOOLEAN NOT NULL DEFAULT false;
