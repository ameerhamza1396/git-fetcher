import { Flashcard, WrongAttempt } from './types';

const normalizeOptions = (options: any): string[] => {
  if (Array.isArray(options)) return options.map(option => String(option));
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.map(option => String(option)) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const normalizeWrongAttempts = (rows: any[]): WrongAttempt[] => {
  return (rows || [])
    .filter(row => row.mcqs)
    .map(row => ({
      id: row.id,
      selectedAnswer: row.selected_answer,
      createdAt: row.created_at,
      mcq: {
        id: row.mcqs.id,
        question: row.mcqs.question,
        options: normalizeOptions(row.mcqs.options),
        correctAnswer: row.mcqs.correct_answer,
        explanation: row.mcqs.explanation || '',
        chapterId: row.mcqs.chapter_id,
        chapterName: row.mcqs.chapters?.name || 'Unknown Chapter',
        chapterNumber: row.mcqs.chapters?.chapter_number || 0,
        subjectId: row.mcqs.chapters?.subjects?.id || row.mcqs.chapters?.subject_id,
        subjectName: row.mcqs.chapters?.subjects?.name || row.mcqs.subject || 'Unknown Subject',
        subjectIcon: row.mcqs.chapters?.subjects?.icon,
        year: row.mcqs.chapters?.subjects?.year || null,
      },
    }));
};

export const buildFallbackCards = (attempts: WrongAttempt[], batchIndex: number, batchSize = 5): Flashcard[] => {
  const start = batchIndex * batchSize;
  const selected = attempts.slice(start, start + batchSize);
  const source = selected.length ? selected : attempts.slice(0, batchSize);

  return source.map((attempt, index) => ({
    front: attempt.mcq.question,
    back: attempt.mcq.explanation || `Correct answer: ${attempt.mcq.correctAnswer}`,
    source: `Card ${start + index + 1}`,
  }));
};

export const fetchReferenceSnippet = async (question: string) => {
  try {
    const response = await fetch('https://ai.medmacs.app/api/reference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question, top_k: 2 }),
    });
    if (!response.ok) return '';
    const data = await response.json();
    return (data.results || [])
      .map((ref: any) => `${ref.book || 'Reference'} p.${ref.page || '-'}: ${ref.content || ''}`)
      .join('\n');
  } catch {
    return '';
  }
};

export const refineFlashcardsWithAI = async (attempts: WrongAttempt[], batchIndex: number, batchSize = 5): Promise<Flashcard[]> => {
  const selected = attempts.slice(batchIndex * batchSize, batchIndex * batchSize + batchSize);
  const cardSource = selected.length ? selected : attempts.slice(0, batchSize);
  const references = await Promise.all(cardSource.map(attempt => fetchReferenceSnippet(attempt.mcq.question)));

  const response = await fetch('https://ai.medmacs.app/api/ai/titration-flashcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: cardSource.map((attempt, index) => ({
        question: attempt.mcq.question,
        correctAnswer: attempt.mcq.correctAnswer,
        explanation: attempt.mcq.explanation || '',
        reference: references[index] || '',
      })),
    }),
  });
  if (!response.ok) throw new Error('AI flashcard generation failed');

  const data = await response.json();
  const cards = Array.isArray(data.cards) ? data.cards : [];

  return cards
    .filter((card: any) => card.front && card.back)
    .slice(0, batchSize)
    .map((card: any, index: number) => ({
      front: String(card.front),
      back: String(card.back),
      source: card.source ? String(card.source) : `AI card ${index + 1}`,
    }));
};
