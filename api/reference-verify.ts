import type { ApiRequest, ApiResponse } from './http-types';
import { fetchReferenceChunks } from './reference-utils';

const GROQ_MODEL = process.env.GROQ_VERIFICATION_MODEL || 'openai/gpt-oss-120b';

const extractOutputText = (data: any) => data?.choices?.[0]?.message?.content || '';

const parseVerification = (text: string) => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Verification response was not JSON');
  return JSON.parse(jsonMatch[0]);
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });

    const {
      question,
      correctAnswer,
      options = [],
      explanation = '',
    } = req.body || {};

    if (!question?.trim() || !correctAnswer?.trim()) {
      return res.status(400).json({ error: 'question and correctAnswer are required' });
    }

    let internalReferences: any[] = [];
    try {
      const referenceData = await fetchReferenceChunks(question, 10);
      internalReferences = referenceData.results;
    } catch (error) {
      console.error('Reference fetch for verification failed:', error);
    }

    const internalReferenceText = internalReferences.length
      ? internalReferences
        .map((ref: any, index: number) => `${index}: ${ref.book || 'Reference'}, page ${ref.page || '-'}\n${ref.content || ''}`)
        .join('\n\n')
      : 'No internal references were found.';

    const prompt = `You are Dr Ahroid, an MBBS tutor and MCQ authenticity reviewer.

Task:
1. Review internal RAG snippets, if provided.
2. If internal evidence is weak, missing, or conflicts with the marked answer, use your medical knowledge as a secondary check.
3. Decide whether the marked correct answer is authentic.
4. Do not quote, paraphrase, or expose internal snippet text.

Question: ${question}
Marked correct answer: ${correctAnswer}
Options: ${Array.isArray(options) ? options.join(' | ') : String(options || 'Not provided')}
Existing explanation: ${explanation || 'None'}

Internal references:
${internalReferenceText}

Return only JSON in this exact shape:
{"verdict":"verified|incorrect|no_references|unconfirmed","matchingIndexes":[0,2],"sourceBasis":"internal|external|llm_knowledge|none","markedAnswerWrong":false,"correctAnswerSuggestion":"","summary":"One short user-facing sentence with no quoted textbook text.","citations":[{"title":"Source title","url":"https://example.com"}]}

Rules:
- Use "verified" only when evidence supports the question and marked correct answer.
- Use "incorrect" only when internal evidence plus secondary model-knowledge verification suggest the marked answer is wrong, or when the options are mismarked.
- Use "verified" with sourceBasis "llm_knowledge" when no useful internal references were found but the question and marked answer appear correct by medical knowledge.
- In that case, start the summary exactly with: "No internal reference found, however question appears to be correct." Then add one concise explanation sentence.
- Use "no_references" only when no useful internal references were found and you cannot confirm correctness from medical knowledge.
- Use "unconfirmed" when evidence is weak, mixed, or insufficient.
- Set markedAnswerWrong true if the marked correct answer appears wrong.
- matchingIndexes must only include internal snippets that directly support the verdict.
- sourceBasis must be "internal" when the verdict depends on internal snippets, "llm_knowledge" when it depends on general model knowledge, or "none" when unconfirmed/no references.
- citations must stay empty unless public-source URLs are separately provided. Do not include textbook chunk text.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Return only valid JSON. Do not include markdown, citations copied from private snippets, or any raw textbook text.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: `Groq verification error: ${response.status}`, detail });
    }

    const data = await response.json();
    const text = extractOutputText(data);
    const parsed = parseVerification(text);

    return res.status(200).json(parsed);
  } catch (error: any) {
    console.error('Reference verification error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
