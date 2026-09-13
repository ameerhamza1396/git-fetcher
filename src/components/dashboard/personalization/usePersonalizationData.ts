import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { normalizeWrongAttempts } from './personalizationUtils';
import { MistakeChapter, MistakeSubject } from './types';
import { fetchCloudContent } from '@/utils/cloudContent';
import { Subject } from '@/utils/mcqData';

export const usePersonalizationData = () => {
  const { user } = useAuth();

  const { data: wrongAttempts = [], isLoading } = useQuery({
    queryKey: ['personalization-wrong-attempts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const [wrongResult, correctedResult] = await Promise.all([
        supabase
          .from('user_answers')
          .select(`
            id,
            selected_answer,
            created_at,
            mcqs(
              id,
              question,
              options,
              correct_answer,
              explanation,
              chapter_id,
              chapters(
                id,
                name,
                chapter_number,
                subject_id,
                subjects(id, name, icon)
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

      if (wrongResult.error) {
        console.error('[MistakeBook usePersonalizationData] wrongResult error:', wrongResult.error);
        throw wrongResult.error;
      }
      if (correctedResult.error) {
        console.error('[MistakeBook usePersonalizationData] correctedResult error:', correctedResult.error);
        throw correctedResult.error;
      }

      console.log('[MistakeBook usePersonalizationData] Raw wrong attempts fetched from DB:', wrongResult.data?.length, wrongResult.data);
      console.log('[MistakeBook usePersonalizationData] Corrected mode answers count:', correctedResult.data?.length);

      const correctedMcqIds = new Set((correctedResult.data || []).map(row => row.mcq_id).filter(Boolean));
      const userSubjects = await fetchCloudContent<Subject[]>('mcq-subjects').catch((err) => {
        console.error('[MistakeBook usePersonalizationData] Error fetching mcq-subjects:', err);
        return null;
      }) ?? [];
      console.log('[MistakeBook usePersonalizationData] Available userSubjects fetched:', userSubjects?.length, userSubjects);
      const availableSubjectIds = new Set(userSubjects.map((s: Subject) => s.id));
      const seenWrongMcqIds = new Set<string>();

      const normalized = normalizeWrongAttempts(wrongResult.data || []);
      console.log('[MistakeBook usePersonalizationData] Normalized wrong attempts count:', normalized?.length, normalized);

      const filtered = normalized.filter(attempt => {
        if (correctedMcqIds.has(attempt.mcq.id)) {
          console.log('[MistakeBook] Excluding corrected MCQ:', attempt.mcq.id);
          return false;
        }
        if (seenWrongMcqIds.has(attempt.mcq.id)) {
          return false;
        }
        // Check that attempt belongs to one of user's available subjects/chapters
        if (availableSubjectIds.size > 0 && attempt.mcq.subjectId && !availableSubjectIds.has(attempt.mcq.subjectId)) {
          console.log('[MistakeBook] Excluding attempt due to subject filter not in availableSubjectIds:', attempt.mcq.subjectId, attempt.mcq);
          return false;
        }
        seenWrongMcqIds.add(attempt.mcq.id);
        return true;
      });

      console.log('[MistakeBook usePersonalizationData] Final filtered wrong attempts count:', filtered?.length, filtered);
      return filtered;
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
