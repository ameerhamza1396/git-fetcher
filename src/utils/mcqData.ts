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
      }))].sort().reverse();

      if (answerDates.length === 0) return 0;

      const today = new Date();
      const todayPKT = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
      todayPKT.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(todayPKT);
      yesterday.setDate(yesterday.getDate() - 1);

      const mostRecentDate = new Date(answerDates[0]);
      const isToday = mostRecentDate.getTime() === todayPKT.getTime();
      const isYesterday = mostRecentDate.getTime() === yesterday.getTime();

      if (!isToday && !isYesterday) return 0;

      let streak = 1;
      let currentDate = new Date(mostRecentDate);

      for (let i = 1; i < answerDates.length; i++) {
        const prevDate = new Date(answerDates[i]);
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
