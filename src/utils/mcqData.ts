import { supabase } from '@/integrations/supabase/client';

export interface Subject {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  year: string;
}

export interface Chapter {
  id: string;
  name: string;
  description: string;
  chapter_number: number;
  subject_id: string;
  mcq_count?: number; // Added for optimization
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

export const fetchSubjects = async (): Promise<Subject[]> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return [];

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('year')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return [];

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('year', profile.year)
      .order('name');

    if (error) return [];
    return data || [];
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
      return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0 };
    }

    const totalQuestions = answers?.length || 0;
    const correctAnswers = answers?.filter(a => a.is_correct).length || 0;
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const averageTime = answers?.length > 0
      ? Math.round(answers.reduce((sum, a) => sum + (a.time_taken || 0), 0) / answers.length)
      : 0;

    let currentStreak = 0;
    let bestStreak = 0;
    answers?.forEach(answer => {
      if (answer.is_correct) {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    return { totalQuestions, correctAnswers, accuracy, averageTime, bestStreak };
  } catch {
    return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0 };
  }
};
