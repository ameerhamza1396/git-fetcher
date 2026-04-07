import type { VercelRequest, VercelResponse } from "@vercel/node";

const groqApiKey = process.env.VITE_GROQ_API_KEY;

if (!groqApiKey) {
  console.error("VITE_GROQ_API_KEY is not set");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigins = [
    "https://medmacs.app",
    "http://localhost:8080",
    "http://localhost:8081",
    "https://com.hmacs.medmacs"
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userAnswer, question, bookReferences } = req.body ?? {};
  
  console.log("Received body:", req.body);
  console.log("Parsed values:", { userAnswer, question, bookReferences });

  if (!userAnswer || !question) {
    return res.status(400).json({ error: "userAnswer and question are required", received: { userAnswer: !!userAnswer, question: !!question } });
  }

  if (!groqApiKey) {
    console.error("GROQ_API_KEY not configured");
    return res.status(500).json({ error: "AI service not configured" });
  }

  try {
    console.log("SEQ evaluation request:", { question: question?.slice(0, 50), userAnswer: userAnswer?.slice(0, 50), hasRefs: !!bookReferences });
    
    const references = bookReferences || "";

    const systemPrompt = `You are a medical exam evaluator. Your task is to evaluate a student's answer to a Short Essay Question (SEQ) against the model answer and book references.

Evaluate the answer based on:
1. Content accuracy - Is the key concept correct?
2. Completeness - Does it cover all important points?
3. Clinical relevance - Is it appropriate for medical practice?

Do NOT penalize for:
- Grammar mistakes
- Spelling errors
- Minor formatting issues

Output ONLY a valid JSON object with these exact fields:
{
  "is_correct": boolean,
  "satisfaction_index": number (0-100),
  "corrected_answer": string (user answer with grammar corrections),
  "explanation": string (under 300 words explaining the evaluation)
}

The satisfaction_index should reflect:
- Content coverage (not grammar/spelling)
- Clinical accuracy
- Understanding depth

Now evaluate this:`;

    const userPrompt = `
Question: ${question}

Student's Answer: ${userAnswer}

${references ? `Book References:\n${references}` : ''}

Evaluate and return ONLY JSON.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content || "";

    let parsedResult;
    try {
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("JSON parse error:", parseError, "Content:", aiContent);
      parsedResult = {
        is_correct: false,
        satisfaction_index: 0,
        corrected_answer: userAnswer,
        explanation: "Failed to parse AI response. Please try again."
      };
    }

    const result = {
      is_correct: Boolean(parsedResult.is_correct),
      satisfaction_index: Math.min(100, Math.max(0, Number(parsedResult.satisfaction_index) || 0)),
      corrected_answer: String(parsedResult.corrected_answer || userAnswer),
      explanation: String(parsedResult.explanation || "").slice(0, 1500)
    };

    return res.status(200).json(result);

  } catch (error: any) {
    console.error('SEQ evaluation error:', error);
    return res.status(500).json({ 
      error: "Failed to evaluate answer",
      details: error.message
    });
  }
}