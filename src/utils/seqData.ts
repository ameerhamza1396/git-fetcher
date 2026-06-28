export type { SEQ, SEQChapter, SEQEvaluationResult, SEQSubject } from './mcqData';

export {
  evaluateSEQAnswer,
  fetchRandomSEQ,
  fetchSEQByChapter,
  fetchSEQChapterById,
  fetchSEQChaptersBySubject,
  fetchSEQSubjectById,
  fetchSEQSubjects,
  getFirstUnattemptedSEQIndex,
  getUserSEQAnswersByChapter,
  getUserSEQStats,
  saveSEQAnswer,
} from './mcqData';
