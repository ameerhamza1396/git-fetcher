
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty, questionCount, customPrompt } = await req.json();

    const systemPrompt = `You are an expert medical educator creating MCQ tests for medical students. Generate exactly ${questionCount} multiple choice questions about "${topic}" at ${difficulty} difficulty level.

${customPrompt ? `Additional requirements: ${customPrompt}` : ''}

Requirements:
- Each question must have exactly 4 options (A, B, C, D)
- Only one correct answer per question
- Include detailed explanations for correct answers
- Focus on clinically relevant scenarios
- Use proper medical terminology
- Make distractors plausible but clearly incorrect

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Detailed explanation of why this is correct"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate ${questionCount} MCQ questions about "${topic}" at ${difficulty} level.` }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the JSON response
    let parsedQuestions;
    try {
      parsedQuestions = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Invalid response format from AI');
    }

    // Validate the response structure
    if (!parsedQuestions.questions || !Array.isArray(parsedQuestions.questions)) {
      throw new Error('Invalid question format from AI');
    }

    // Add unique IDs to questions
    const questionsWithIds = parsedQuestions.questions.map((q: any, index: number) => ({
      id: `ai_${Date.now()}_${index}`,
      question: q.question,
      options: Array.isArray(q.options) ? q.options : [],
      correct_answer: q.correct_answer,
      explanation: q.explanation || 'No explanation provided'
    }));

    console.log(`Generated ${questionsWithIds.length} questions for topic: ${topic}`);

    return new Response(JSON.stringify({
      questions: questionsWithIds,
      topic,
      difficulty,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-ai-test function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to generate test',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
