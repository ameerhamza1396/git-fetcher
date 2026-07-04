import { supabase } from '@/integrations/supabase/client';
import { aiApiJson } from '@/utils/aiApi';
import { fetchCloudContent } from '@/utils/cloudContent';
import {
  getOfflineChapterById,
  getOfflineChaptersBySubject,
  getOfflineMCQsByChapter,
  getOfflineSubjectById,
  getOfflineSubjects,
} from '@/utils/offlineChapters';

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  year: string;
  institutes?: string[];
  free_unlimited_access?: boolean;
}

export interface Chapter {
  id: string;
  name: string;
  description: string;
  chapter_number: number;
  subject_id: string;
  mcq_count?: number;
}

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  subject: string;
  chapter_id: string;
}

export interface SEQSubject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  year: string;
  institutes?: string[];
}

export interface SEQChapter {
  id: string;
  name: string;
  description: string;
  chapter_number: number;
  subject_id: string;
  seq_count?: number;
}

export interface SEQ {
  id: string;
  question: string;
  model_answer: string;
  explanation: string;
  chapter_id: string;
}

export interface SEQEvaluationResult {
  is_correct: boolean;
  satisfaction_index: number;
  corrected_answer: string;
  explanation: string;
}

const mergeById = <T extends { id: string }>(primary: T[], fallback: T[]) => {
  const merged = new Map<string, T>();
  fallback.forEach(item => merged.set(item.id, item));
  primary.forEach(item => merged.set(item.id, item));
  return Array.from(merged.values());
};

const fetchSubjectFreeUnlimitedFlags = async (subjectIds: string[]) => {
  const uniqueIds = Array.from(new Set(subjectIds.filter(Boolean)));
  if (uniqueIds.length === 0) return new Map<string, boolean>();

  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('id, free_unlimited_access')
      .in('id', uniqueIds);

    if (error || !data) return new Map<string, boolean>();
    return new Map(data.map(subject => [subject.id, subject.free_unlimited_access === true]));
  } catch {
    return new Map<string, boolean>();
  }
};

const applySubjectFreeUnlimitedFlags = async (subjects: Subject[]) => {
  const flags = await fetchSubjectFreeUnlimitedFlags(subjects.map(subject => subject.id));
  if (flags.size === 0) return subjects;

  return subjects.map(subject => ({
    ...subject,
    free_unlimited_access: flags.get(subject.id) ?? subject.free_unlimited_access,
  }));
};

export const fetchSubjects = async (): Promise<Subject[]> => {
  const [cloudSubjects, offlineSubjects] = await Promise.all([
    fetchCloudContent<Subject[]>('mcq-subjects'),
    getOfflineSubjects(),
  ]);

  return applySubjectFreeUnlimitedFlags(mergeById(cloudSubjects ?? [], offlineSubjects as Subject[]));
};

export const fetchSubjectById = async (subjectId: string): Promise<Subject | null> => {
  const withFreeUnlimitedFlag = async (subject: Subject | null) => {
    if (!subject) return null;
    const flags = await fetchSubjectFreeUnlimitedFlags([subject.id]);
    return {
      ...subject,
      free_unlimited_access: flags.get(subject.id) ?? subject.free_unlimited_access,
    };
  };

  const subject = await fetchCloudContent<Subject>('mcq-subject', { subjectId });
  if (subject) return withFreeUnlimitedFlag(subject);

  const offlineSubject = await getOfflineSubjectById(subjectId);
  if (offlineSubject) return withFreeUnlimitedFlag(offlineSubject as Subject);

  const subjects = await fetchSubjects();
  return subjects.find(item => item.id === subjectId) ?? null;
};

export const fetchChaptersBySubject = async (subjectId: string): Promise<Chapter[]> => {
  const [cloudChapters, offlineChapters] = await Promise.all([
    fetchCloudContent<Chapter[]>('mcq-chapters', { subjectId }),
    getOfflineChaptersBySubject(subjectId),
  ]);

  return mergeById(cloudChapters ?? [], offlineChapters as Chapter[])
    .sort((a, b) => a.chapter_number - b.chapter_number);
};

export const fetchChapterById = async (chapterId: string, subjectId?: string): Promise<Chapter | null> => {
  const chapter = await fetchCloudContent<Chapter>('mcq-chapter', { chapterId, subjectId });
  if (chapter) return chapter;

  const offlineChapter = await getOfflineChapterById(chapterId, subjectId);
  if (offlineChapter) return offlineChapter as Chapter;

  if (!subjectId) return null;
  const chapters = await fetchChaptersBySubject(subjectId);
  return chapters.find(item => item.id === chapterId) ?? null;
};

export const fetchMCQsByChapter = async (chapterId: string): Promise<MCQ[]> => {
  const cloudMcqs = await fetchCloudContent<MCQ[]>('mcqs', { chapterId });
  if (cloudMcqs?.length) return cloudMcqs;
  return await getOfflineMCQsByChapter(chapterId) as MCQ[];
};

export const fetchMCQsBySubject = async (subjectId: string): Promise<MCQ[]> => {
  return await fetchCloudContent<MCQ[]>('mcqs-by-subject', { subjectId }) ?? [];
};

export const getUserStats = async (userId: string) => {
  try {
    const { data: answers, error: answersError } = await supabase
      .from('user_answers')
      .select('*')
      .eq('user_id', userId);

    if (answersError) {
      return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0, savedQuestions: 0 };
    }

    const totalQuestions = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const averageTime = answers?.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.time_taken || 0), 0) / answers.length)
      : 0;

    let bestStreak = 0;
    let currentCorrectStreak = 0;
    answers?.forEach(answer => {
      if (answer.is_correct) {
        currentCorrectStreak++;
        bestStreak = Math.max(bestStreak, currentCorrectStreak);
      } else {
        currentCorrectStreak = 0;
      }
    });

    // Calculate consecutive days streak
    const calculateCurrentStreak = (answersData: any[]) => {
      if (!answersData || answersData.length === 0) return 0;
      
      const answerDates = [...new Set(answersData.map(a => {
        const date = new Date(a.created_at);
        return date.toLocaleDateString("en-US", { timeZone: "Asia/Karachi" });
      }))];

      if (answerDates.length === 0) return 0;

      const today = new Date();
      const todayPKT = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
      todayPKT.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(todayPKT);
      yesterday.setDate(yesterday.getDate() - 1);

      const dateObjects = answerDates.map(d => {
        const [month, day, year] = d.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }).sort((a, b) => b.getTime() - a.getTime());

      const mostRecentDate = dateObjects[0];
      const isToday = mostRecentDate.getTime() === todayPKT.getTime();
      const isYesterday = mostRecentDate.getTime() === yesterday.getTime();

      if (!isToday && !isYesterday) return 0;

      let streak = 1;
      let currentDate = new Date(mostRecentDate);

      for (let i = 1; i < dateObjects.length; i++) {
        const prevDate = new Date(dateObjects[i]);
        const expectedPrevDate = new Date(currentDate);
        expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);

        if (prevDate.getTime() === expectedPrevDate.getTime()) {
          streak++;
          currentDate = prevDate;
        } else {
          break;
        }
      }

      return streak;
    };

    const currentStreak = calculateCurrentStreak(answers || []);

    return { totalQuestions, correctAnswers, accuracy, averageTime, bestStreak, savedQuestions: currentStreak };
  } catch {
    return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0, savedQuestions: 0 };
  }
};

export const fetchSEQSubjects = async (): Promise<SEQSubject[]> => {
  return await fetchCloudContent<SEQSubject[]>('app-seq-subjects') ?? [];
};

export const fetchSEQSubjectById = async (subjectId: string): Promise<SEQSubject | null> => {
  const subject =
    await fetchCloudContent<SEQSubject>('app-seq-subject', { subjectId }) ??
    await fetchCloudContent<SEQSubject>('seq-subject', { subjectId });
  if (subject) return subject;

  const subjects = await fetchSEQSubjects();
  return subjects.find(item => item.id === subjectId) ?? null;
};

export const fetchSEQChaptersBySubject = async (subjectId: string): Promise<SEQChapter[]> => {
  return await fetchCloudContent<SEQChapter[]>('app-seq-chapters', { subjectId }) ?? [];
};

export const fetchSEQChapterById = async (chapterId: string, subjectId?: string): Promise<SEQChapter | null> => {
  const chapter =
    await fetchCloudContent<SEQChapter>('app-seq-chapter', { chapterId, subjectId }) ??
    await fetchCloudContent<SEQChapter>('seq-chapter', { chapterId, subjectId });
  if (chapter) return chapter;

  if (!subjectId) return null;
  const chapters = await fetchSEQChaptersBySubject(subjectId);
  return chapters.find(item => item.id === chapterId) ?? null;
};

export const fetchSEQByChapter = async (chapterId: string): Promise<SEQ[]> => {
  return await fetchCloudContent<SEQ[]>('app-seqs', { chapterId }) ?? [];
};

export const fetchRandomSEQ = async (chapterId: string): Promise<SEQ | null> => {
  try {
    const seqs = await fetchSEQByChapter(chapterId);
    if (seqs.length === 0) return null;
    return seqs[Math.floor(Math.random() * seqs.length)];
  } catch {
    return null;
  }
};

export const evaluateSEQAnswer = async (
  userAnswer: string,
  question: string,
  bookReferences: string
): Promise<SEQEvaluationResult> => {
  try {
    const data = await aiApiJson<Partial<SEQEvaluationResult>>('seq_ai', {
      userAnswer,
      question,
      bookReferences
    });
    return {
      is_correct: data.is_correct ?? false,
      satisfaction_index: data.satisfaction_index ?? 0,
      corrected_answer: data.corrected_answer ?? userAnswer,
      explanation: data.explanation ?? ''
    };
  } catch (error) {
    console.error('SEQ evaluation error:', error);
    return {
      is_correct: false,
      satisfaction_index: 0,
      corrected_answer: userAnswer,
      explanation: 'Failed to evaluate answer. Please try again.'
    };
  }
};

export const saveSEQAnswer = async (
  seqId: string,
  userAnswer: string,
  isCorrect: boolean,
  satisfactionIndex: number,
  correctedAnswer: string,
  explanation: string,
  bookReference: string,
  timeTaken: number
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_seq_answers')
      .insert({
        user_id: user.id,
        seq_id: seqId,
        user_answer: userAnswer,
        is_correct: isCorrect,
        satisfaction_index: satisfactionIndex,
        corrected_answer: correctedAnswer,
        explanation: explanation,
        book_reference: bookReference,
        time_taken: timeTaken
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving SEQ answer:', error);
    return null;
  }
};

export const getUserSEQStats = async (userId: string) => {
  try {
    const { data: answers, error: answersError } = await supabase
      .from('user_seq_answers')
      .select('*')
      .eq('user_id', userId);

    if (answersError) {
      return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, avgSatisfaction: 0 };
    }

    const totalQuestions = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const averageTime = answers?.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.time_taken || 0), 0) / answers.length)
      : 0;
    const avgSatisfaction = answers?.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.satisfaction_index || 0), 0) / answers.length)
      : 0;

    return { totalQuestions, correctAnswers, accuracy, averageTime, avgSatisfaction };
  } catch {
    return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, avgSatisfaction: 0 };
  }
};

export const getUserSEQAnswersByChapter = async (userId: string, chapterId: string) => {
  try {
    const seqs = await fetchSEQByChapter(chapterId);

    const seqIds = seqs.map(s => s.id);
    
    if (seqIds.length === 0) return {};

    const { data, error } = await supabase
      .from('user_seq_answers')
      .select('*')
      .eq('user_id', userId)
      .in('seq_id', seqIds);

    if (error) throw error;
    
    const answersMap: Record<string, {
      userAnswer: string;
      isCorrect: boolean;
      satisfactionIndex: number;
      correctedAnswer: string;
      explanation: string;
      createdAt: string;
    }> = {};

    data?.forEach(answer => {
      answersMap[answer.seq_id] = {
        userAnswer: answer.user_answer,
        isCorrect: answer.is_correct,
        satisfactionIndex: answer.satisfaction_index,
        correctedAnswer: answer.corrected_answer,
        explanation: answer.explanation,
        createdAt: answer.created_at
      };
    });

    return answersMap;
  } catch {
    return {};
  }
};

export const getFirstUnattemptedSEQIndex = async (userId: string, chapterId: string, seqs: SEQ[]) => {
  try {
    const answersMap = await getUserSEQAnswersByChapter(userId, chapterId);
    
    for (let i = 0; i < seqs.length; i++) {
      if (!answersMap[seqs[i].id]) {
        return i;
      }
    }
    return seqs.length;
  } catch {
    return 0;
  }
};
