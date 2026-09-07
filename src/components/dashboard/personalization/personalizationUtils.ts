import { Flashcard, WrongAttempt } from './types';
import { aiApiJson } from '@/utils/aiApi';

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
    const data = await aiApiJson<{ results?: any[] }>('reference', { query: question, top_k: 2 }, {});
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

  const data = await aiApiJson<{ cards?: any[] }>('ai/titration-flashcards', {
    items: cardSource.map((attempt, index) => ({
      question: attempt.mcq.question,
      correctAnswer: attempt.mcq.correctAnswer,
      explanation: attempt.mcq.explanation || '',
      reference: references[index] || '',
    })),
  }, {});
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
