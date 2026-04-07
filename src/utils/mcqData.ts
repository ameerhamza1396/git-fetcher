import { supabase } from '@/integrations/supabase/client';

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  year: string;
  institutes?: string[];
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

export const fetchSubjects = async (): Promise<Subject[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return [];

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('year, institute')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return [];

    let query = supabase
      .from('subjects')
      .select('*')
      .eq('year', (profile as any).year)
      .order('name');

    const { data, error } = await query;
    if (error) return [];

    const userInstitute = (profile as any).institute;

    // Filter subjects that include the user's institute in their institutes JSONB array
    const filtered = (data || []).filter((subject: any) => {
      // If subject has no institutes field or it's empty, show it (backward compat)
      if (!subject.institutes || !Array.isArray(subject.institutes) || subject.institutes.length === 0) {
        return true;
      }
      // If institutes contains "all" or "ALL", show to everyone
      if (subject.institutes.map((i: string) => i.toLowerCase()).includes('all')) {
        return true;
      }
      // Check if user's institute is in the subject's institutes array
      return !userInstitute || subject.institutes.includes(userInstitute);
    });

    return filtered;
  } catch {
    return [];
  }
};

export const fetchChaptersBySubject = async (subjectId: string): Promise<Chapter[]> => {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .select('id, name, description, chapter_number, subject_id, mcqs(count)')
      .eq('subject_id', subjectId)
      .order('chapter_number');

    if (error) return [];

    return (data || []).map((ch: any) => ({
      ...ch,
      mcq_count: ch.mcqs?.[0]?.count || 0,
    }));
  } catch {
    return [];
  }
};

export const fetchMCQsByChapter = async (chapterId: string): Promise<MCQ[]> => {
  try {
    const { data, error } = await supabase
      .from('mcqs')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at');

    if (error) return [];

    return data?.map(mcq => ({
      ...mcq,
      options: Array.isArray(mcq.options)
        ? mcq.options
        : typeof mcq.options === 'string'
          ? JSON.parse(mcq.options)
          : []
    })) || [];
  } catch {
    return [];
  }
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
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return [];

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('year, institute')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return [];

    let query = supabase
      .from('seqs_subjects')
      .select('*')
      .eq('year', (profile as any).year)
      .order('name');

    const { data, error } = await query;
    if (error) return [];

    const userInstitute = (profile as any).institute;

    const filtered = (data || []).filter((subject: any) => {
      if (!subject.institutes || !Array.isArray(subject.institutes) || subject.institutes.length === 0) {
        return true;
      }
      if (subject.institutes.map((i: string) => i.toLowerCase()).includes('all')) {
        return true;
      }
      return !userInstitute || subject.institutes.includes(userInstitute);
    });

    return filtered;
  } catch {
    return [];
  }
};

export const fetchSEQChaptersBySubject = async (subjectId: string): Promise<SEQChapter[]> => {
  try {
    const { data, error } = await supabase
      .from('seqs_chapters')
      .select('id, name, description, chapter_number, subject_id, seqs(count)')
      .eq('subject_id', subjectId)
      .order('chapter_number');

    if (error) return [];

    return (data || []).map((ch: any) => ({
      ...ch,
      seq_count: ch.seqs?.[0]?.count || 0,
    }));
  } catch {
    return [];
  }
};

export const fetchSEQByChapter = async (chapterId: string): Promise<SEQ[]> => {
  try {
    const { data, error } = await supabase
      .from('seqs')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('created_at');

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

export const fetchRandomSEQ = async (chapterId: string): Promise<SEQ | null> => {
  try {
    const { data, error } = await supabase
      .from('seqs')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('RANDOM()')
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data;
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
    const response = await fetch('https://medmacs.app/api/seq_ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAnswer,
        question,
        bookReferences
      }),
    });

    if (!response.ok) {
      throw new Error('Evaluation failed');
    }

    const data = await response.json();
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
