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
  content: string;
  score: number;
}

interface ReferenceResponse {
  results: ReferenceChunk[];
  total_vectors: number;
}

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
      if (!mappings || mappings.length === 0) return chunk;

      const match = mappings.find((m: Mapping) =>
        chunk.book.toLowerCase().includes(m.source_pattern.toLowerCase())
      );

      if (!match) return chunk;

      const displayName = match.edition
        ? `${match.canonical_name}, ${match.edition}`
        : match.canonical_name;

      return {
        ...chunk,
        book: displayName,
        page: chunk.page + match.page_offset,
      };
    });

    return new Response(JSON.stringify({ results: normalizedResults, total_vectors: data.total_vectors }), {
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
