import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchReferenceChunks, publicReferenceChunk } from './reference-utils';

const GROQ_MODEL = process.env.GROQ_SUMMARY_MODEL || process.env.GROQ_VERIFICATION_MODEL || 'openai/gpt-oss-120b';

const extractOutputText = (data: any) => data?.choices?.[0]?.message?.content || '';

const parseSummary = (text: string) => {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Summary response was not JSON');
  return JSON.parse(jsonMatch[0]);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });

    const { question, top_k = 5, mode = 'summary', options = [], correctAnswer = '', explanation = '' } = req.body || {};
    if (!question?.trim()) return res.status(400).json({ error: 'question is required' });

    const referenceData = await fetchReferenceChunks(question, top_k);
    const references = referenceData.results.slice(0, 10);

    if (references.length === 0) {
      return res.status(200).json({
        summary: '',
        citations: [],
        status: 'no_references',
      });
    }

    const referenceText = references
      .map((ref: any, index: number) => `${index}: ${ref.book || 'Reference'}, page ${ref.page || '-'}\n${ref.content || ''}`)
      .join('\n\n');

    const optionExplainMode = mode === 'option_explanations';
    const optionList = Array.isArray(options) ? options : [];
    const prompt = optionExplainMode ? `You are Dr Ahroid, an MBBS tutor.

Explain why each MCQ option is correct or wrong using the internal reference snippets as private context.

Question:
${question}

Options:
${optionList.map((option: string, index: number) => `${String.fromCharCode(65 + index)}. ${option}`).join('\n')}

Marked correct answer:
${correctAnswer}

Existing explanation:
${explanation || 'None provided'}

Private reference context:
${referenceText}

Return only JSON in this exact shape:
{"optionExplanations":[{"option":"exact option text","verdict":"correct|wrong","explanation":"1 concise original sentence explaining support or contradiction."}],"citationIndexes":[0,2]}

Rules:
- Include every option in the same order.
- Do not quote the private snippets.
- Do not rewrite the snippets sentence-by-sentence.
- Do not mention hidden chunks or internal context.
- Keep explanations concise, educational, and focused on why the marked answer is supported and the other options are wrong.
- citationIndexes should include only the private references that materially support the explanations.`
      : `You are Dr Ahroid, an MBBS tutor.

Create a short original teaching summary that answers the student's question using the internal reference snippets as private context.

Question:
${question}

Private reference context:
${referenceText}

Return only JSON in this exact shape:
{"summary":"2-4 concise sentences, no quotes and no close paraphrase of source text.","citationIndexes":[0,2]}

Rules:
- Do not quote the private snippets.
- Do not rewrite the snippets sentence-by-sentence.
- Do not mention hidden chunks or internal context.
- Keep it educational and focused on the question.
- citationIndexes should include only the private references that materially support the summary.`;

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
            content: 'Return only valid JSON. Do not include markdown, raw source text, or quotes from private snippets.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return res.status(response.status).json({ error: `Groq summary error: ${response.status}`, detail });
    }

    const data = await response.json();
    const parsed = parseSummary(extractOutputText(data));
    const citationIndexes = Array.isArray(parsed?.citationIndexes)
      ? parsed.citationIndexes.filter((index: number) => Number.isInteger(index) && index >= 0 && index < references.length)
      : [];
    const citations = (citationIndexes.length ? citationIndexes : references.map((_, index) => index).slice(0, 3))
      .map((index: number) => publicReferenceChunk(references[index]));

    if (optionExplainMode) {
      const optionExplanations = Array.isArray(parsed?.optionExplanations)
        ? parsed.optionExplanations
          .filter((item: any) => item?.option && item?.explanation)
          .map((item: any) => ({
            option: String(item.option),
            verdict: item.verdict === 'correct' ? 'correct' : 'wrong',
            explanation: String(item.explanation),
          }))
        : [];

      return res.status(200).json({
        optionExplanations,
        citations,
        status: 'explained',
      });
    }

    return res.status(200).json({
      summary: parsed?.summary || '',
      citations,
      status: 'summarized',
    });
  } catch (error: any) {
    console.error('Reference summary error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
