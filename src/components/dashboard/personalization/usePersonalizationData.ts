import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeWrongAttempts } from './personalizationUtils';
import { MistakeChapter, MistakeSubject } from './types';

export const usePersonalizationData = () => {
  const { user } = useAuth();

  const { data: wrongAttempts = [], isLoading } = useQuery({
    queryKey: ['personalization-wrong-attempts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const [profileResult, wrongResult, correctedResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('year')
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('user_answers')
          .select(`
            id,
            selected_answer,
            created_at,
            mcqs!inner(
              id,
              question,
              options,
              correct_answer,
              explanation,
              chapter_id,
              subject,
              chapters(
                id,
                name,
                chapter_number,
                subject_id,
                subjects(id, name, icon, year)
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('is_correct', false)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('user_answers')
          .select('mcq_id')
          .eq('user_id', user.id)
          .eq('is_correct', true)
          .eq('correction_mode', true),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (wrongResult.error) throw wrongResult.error;
      if (correctedResult.error) throw correctedResult.error;

      const userYear = profileResult.data?.year || null;
      const correctedMcqIds = new Set((correctedResult.data || []).map(row => row.mcq_id).filter(Boolean));
      const seenWrongMcqIds = new Set<string>();

      return normalizeWrongAttempts(wrongResult.data || []).filter(attempt => {
        if (userYear && attempt.mcq.year && attempt.mcq.year !== userYear) return false;
        if (correctedMcqIds.has(attempt.mcq.id)) return false;
        if (seenWrongMcqIds.has(attempt.mcq.id)) return false;
        seenWrongMcqIds.add(attempt.mcq.id);
        return true;
      });
    },
    enabled: !!user?.id,
  });

  const groupedSubjects: MistakeSubject[] = useMemo(() => {
    type WorkingSubject = Omit<MistakeSubject, 'chapters'> & {
      chapters: Map<string, MistakeChapter>;
    };
    const subjects = new Map<string, WorkingSubject>();
    wrongAttempts.forEach(attempt => {
      const subjectKey = attempt.mcq.subjectId || attempt.mcq.subjectName;
      if (!subjects.has(subjectKey)) {
        subjects.set(subjectKey, {
          id: subjectKey,
          name: attempt.mcq.subjectName,
          icon: attempt.mcq.subjectIcon,
          chapters: new Map(),
          total: 0,
        });
      }
      const subject = subjects.get(subjectKey)!;
      subject.total += 1;

      const chapterKey = attempt.mcq.chapterId;
      if (!subject.chapters.has(chapterKey)) {
        subject.chapters.set(chapterKey, {
          id: chapterKey,
          subjectId: attempt.mcq.subjectId,
          name: attempt.mcq.chapterName,
          number: attempt.mcq.chapterNumber,
          attempts: [],
        });
      }
      subject.chapters.get(chapterKey).attempts.push(attempt);
    });

    return Array.from(subjects.values()).map((subject) => ({
      ...subject,
      chapters: Array.from(subject.chapters.values()).sort((a, b) => b.attempts.length - a.attempts.length),
    }));
  }, [wrongAttempts]);

  const weakestChapter = useMemo(() => {
    return groupedSubjects
      .flatMap(subject => subject.chapters.map(chapter => ({ ...chapter, subjectName: subject.name })))
      .sort((a, b) => b.attempts.length - a.attempts.length)[0] || null;
  }, [groupedSubjects]);

  return {
    wrongAttempts,
    groupedSubjects,
    weakestChapter,
    isLoading,
  };
};
