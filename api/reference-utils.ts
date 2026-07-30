export interface Mapping {
  source_pattern: string;
  canonical_name: string;
  edition: string | null;
  page_offset: number;
  show_extracted_text?: boolean | null;
  enabled?: boolean | null;
}

export interface ReferenceChunk {
  book: string;
  page: number;
  content?: string;
  score?: number;
  [key: string]: any;
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pxjvltgarzvoptdfdkxq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_RVLZ7IetJ-w7raWeYGWa5A_5wV4g5rI';
const REFERENCE_API_URL = process.env.REFERENCE_API_URL || 'https://medmacs-refs-cqd2.onrender.com';

export const CLEAN_BOOK_MAPPINGS: Mapping[] = [
  { source_pattern: '[Medicalstudyzone.com] Pathoma 2023 PDF', canonical_name: 'Pathoma', edition: '2023', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Harpers Illustrated Biochemistry by Victor W Rodwell', canonical_name: "Harper's Illustrated Biochemistry", edition: '31st Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: '27th Bailey Loves Short Practice of Surgery 27th', canonical_name: "Bailey & Love's Short Practice of Surgery", edition: '27th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: '356 20190306181657 (1)', canonical_name: 'Gynaecology by Ten Teachers', edition: '20th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'BD Chaurasia s Handbook of General Anatomy, 4th Edition', canonical_name: "BD Chaurasia's Handbook of General Anatomy", edition: '4th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'DavidsonMedicine24th', canonical_name: "Davidson's Principles & Practice of Medicine", edition: '24th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'First Aid for the USMLE Step 1 2026 [Medicalstudyzone.com]', canonical_name: 'First Aid for the USMLE Step 1', edition: '2026', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Guyton and Hall Textbook of Medical Physiology 12th Ed', canonical_name: 'Guyton & Hall Textbook of Medical Physiology', edition: '12th Ed', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Lippincott Illustrated Reviews ( PDFDrive ) (1)', canonical_name: 'Lippincott Illustrated Reviews: Pharmacology', edition: '6th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Lippincotts Illustrated Reviews Biochemistry 5th edition', canonical_name: 'Lippincott Illustrated Reviews: Biochemistry', edition: '5th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'OceanofPDF.com Obstetrics by Ten Teachers Louise Kenny', canonical_name: 'Obstetrics by Ten Teachers', edition: '19th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Snells Clinical Neuroanatomy 1', canonical_name: "Snell's Clinical Neuroanatomy", edition: '8th Edition', page_offset: 0, show_extracted_text: false },
];

const LEGACY_BOOK_MAPPINGS: Mapping[] = [
  { source_pattern: 'Pathoma', canonical_name: 'Pathoma', edition: '2023', page_offset: 0, show_extracted_text: false },
  { source_pattern: "Harper's Illustrated Biochemistry", canonical_name: "Harper's Illustrated Biochemistry", edition: '31st Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Bailey Loves Short Practice of Surgery 27th', canonical_name: "Bailey & Love's Short Practice of Surgery", edition: '27th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Gynaecology by Ten Teachers', canonical_name: 'Gynaecology by Ten Teachers', edition: '20th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'BD Chaurasia s Handbook of General Anatomy', canonical_name: "BD Chaurasia's Handbook of General Anatomy", edition: '4th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'DavidsonMedicine24th', canonical_name: "Davidson's Principles & Practice of Medicine", edition: '24th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'First Aid for the USMLE Step 1 2026', canonical_name: 'First Aid for the USMLE Step 1', edition: '2026', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Guyton and Hall Textbook of Medical Physiology', canonical_name: 'Guyton & Hall Textbook of Medical Physiology', edition: '12th Ed', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Lippincott Illustrated Reviews', canonical_name: 'Lippincott Illustrated Reviews: Pharmacology', edition: '6th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Lippincotts Illustrated Reviews', canonical_name: 'Lippincott Illustrated Reviews: Pharmacology', edition: '6th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Lippincotts Illustrated Reviews Biochemistry', canonical_name: 'Lippincott Illustrated Reviews: Biochemistry', edition: '5th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: 'Obstetrics by Ten Teachers', canonical_name: 'Obstetrics by Ten Teachers', edition: '19th Edition', page_offset: 0, show_extracted_text: false },
  { source_pattern: "Snell's Clinical Neuroanatomy", canonical_name: "Snell's Clinical Neuroanatomy", edition: '8th Edition', page_offset: 0, show_extracted_text: false },
];

const SUSPICIOUS_SOURCE_PATTERNS = [
  /medicalstudyzone/i,
  /pdf\s*drive/i,
  /pdfdrive/i,
  /^356\s+20190306181657/i,
];

export const hasSuspiciousSourceName = (value = '') =>
  SUSPICIOUS_SOURCE_PATTERNS.some(pattern => pattern.test(value));

const displayNameFor = (mapping: Mapping) =>
  mapping.edition ? `${mapping.canonical_name}, ${mapping.edition}` : mapping.canonical_name;

const shouldShowExtractedText = (mapping: Mapping | null) =>
  mapping?.enabled !== false && mapping?.show_extracted_text === true;

const normalizeSourceKey = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');

const sourceMatches = (rawBook: string, pattern: string) => {
  const rawLower = rawBook.toLowerCase();
  const patternLower = pattern.toLowerCase();
  const rawKey = normalizeSourceKey(rawBook);
  const patternKey = normalizeSourceKey(pattern);

  return rawLower.includes(patternLower) ||
    (patternKey.length > 0 && rawKey.includes(patternKey));
};

export const normalizeReferenceChunk = (
  chunk: ReferenceChunk,
  mappings: Mapping[] = CLEAN_BOOK_MAPPINGS
) => {
  const rawBook = String(chunk.book || '');
  const match = mappings.find(mapping => sourceMatches(rawBook, mapping.source_pattern));

  if (match) {
    const showText = shouldShowExtractedText(match);
    return {
      ...chunk,
      book: displayNameFor(match),
      page: Number(chunk.page || 0) + match.page_offset,
      show_extracted_text: showText,
      content: showText ? chunk.content : undefined,
    };
  }

  if (hasSuspiciousSourceName(rawBook)) {
    return {
      ...chunk,
      book: 'Reference Source',
      show_extracted_text: false,
      content: undefined,
    };
  }

  return {
    ...chunk,
    show_extracted_text: false,
    content: undefined,
  };
};

export const publicReferenceChunk = (chunk: ReferenceChunk) => {
  if (chunk.show_extracted_text) return chunk;
  const { content, ...safeChunk } = chunk;
  return safeChunk;
};

const readBookReferenceMappings = async () => {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/book_reference_mappings?select=${encodeURIComponent('source_pattern,canonical_name,edition,page_offset,show_extracted_text,enabled')}`,
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
    }
  );

  if (!response.ok) return [];
  const rows = await response.json();
  return Array.isArray(rows) ? rows.filter((row: Mapping) => row.enabled !== false) : [];
};

export const fetchReferenceChunks = async (query: string, topK = 5) => {
  const [refRes, mappings] = await Promise.all([
    fetch(`${REFERENCE_API_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: Math.min(topK, 20) }),
    }),
    readBookReferenceMappings(),
  ]);

  if (!refRes.ok) {
    const detail = await refRes.text();
    throw new Error(`Reference API error: ${refRes.status} ${detail}`);
  }

  const data = await refRes.json();
  const activeMappings = mappings.length ? mappings : [...CLEAN_BOOK_MAPPINGS, ...LEGACY_BOOK_MAPPINGS];
  const results = (data.results || []).map((chunk: ReferenceChunk) => normalizeReferenceChunk(chunk, activeMappings));

  return {
    results,
    total_vectors: data.total_vectors,
  };
};
