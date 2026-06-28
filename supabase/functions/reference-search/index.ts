import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.1';

interface Mapping {
  source_pattern: string;
  canonical_name: string;
  edition: string | null;
  page_offset: number;
}

interface ReferenceChunk {
  book: string;
  page: number;
  content?: string;
  score: number;
}

interface ReferenceResponse {
  results: ReferenceChunk[];
  total_vectors: number;
}

const hasSuspiciousSourceName = (value = '') =>
  /medicalstudyzone/i.test(value) ||
  /pdf\s*drive/i.test(value) ||
  /pdfdrive/i.test(value) ||
  /^356\s+20190306181657/i.test(value);

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { query, top_k = 5 } = await req.json();

    if (!query || !query.trim()) {
      return new Response(JSON.stringify({ error: 'query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') as string,
      Deno.env.get('SUPABASE_ANON_KEY') as string
    );

    const { data: mappings, error: mappingsError } = await supabase
      .from('book_reference_mappings')
      .select('source_pattern, canonical_name, edition, page_offset')
      .eq('enabled', true);

    if (mappingsError) {
      console.error('Error fetching mappings:', mappingsError);
    }

    const refRes = await fetch('https://reference.medmacs.app/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, top_k: Math.min(top_k, 20) }),
    });

    if (!refRes.ok) {
      const errText = await refRes.text();
      return new Response(JSON.stringify({ error: `Reference API error: ${refRes.status}`, detail: errText }), {
        status: refRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data: ReferenceResponse = await refRes.json();

    const normalizedResults: ReferenceChunk[] = (data.results || []).map((chunk) => {
      if (!mappings || mappings.length === 0) {
        return hasSuspiciousSourceName(chunk.book) ? { ...chunk, book: 'Reference Source' } : chunk;
      }

      const match = mappings.find((m: Mapping) => sourceMatches(chunk.book, m.source_pattern));

      if (!match) return hasSuspiciousSourceName(chunk.book) ? { ...chunk, book: 'Reference Source' } : chunk;

      const displayName = match.edition
        ? `${match.canonical_name}, ${match.edition}`
        : match.canonical_name;

      return {
        ...chunk,
        book: displayName,
        page: chunk.page + match.page_offset,
      };
    });
    const publicResults = normalizedResults.map(({ content, ...chunk }) => chunk);

    return new Response(JSON.stringify({ results: publicResults, total_vectors: data.total_vectors }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in reference-search function:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
