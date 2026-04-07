import type { VercelRequest, VercelResponse } from "@vercel/node";
const RENDER_API_URL = "https://medmacs-refs.onrender.com";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:8081",
    "http://localhost:5173",
    "https://git-fetcher.vercel.app" // Example
  ];
  
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { query, top_k = 5 } = req.body ?? {};

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "query is required" });
  }

  try {
    // 2. Fetch from the upstream Medical Reference API
    const upstream = await fetch(`${RENDER_API_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim(), top_k }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: "Reference service unavailable" });
    }

    const data = await upstream.json();
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return res.status(504).json({ error: "Request timed out" });
  }
}
