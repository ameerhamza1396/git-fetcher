import type { ApiRequest, ApiResponse } from './http-types';
import { fetchReferenceChunks, publicReferenceChunk } from './reference-utils';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { query, top_k = 5 } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'query is required' });
    }

    const data = await fetchReferenceChunks(query, top_k);
    const results = data.results.map(publicReferenceChunk);

    return res.status(200).json({ results, total_vectors: data.total_vectors });
  } catch (error: any) {
    console.error('Reference search error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
