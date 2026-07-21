import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, CheckCircle2, FileClock, Target, WifiOff } from 'lucide-react';
import { fetchChaptersBySubject, fetchSubjectById, Subject, Chapter } from '@/utils/mcqData';
import { MCQPageLayout } from './MCQPageLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CollaborateModal } from '@/components/CollaborateModal';
import { ChapterDownloadButton } from '@/components/mcq/ChapterDownloadButton';
import { getOfflineChapterSummaries, subscribeOfflineChapterChanges } from '@/utils/offlineChapters';
import { useAuth } from '@/hooks/useAuth';

const ChapterProgressDonut = ({
  attempted,
  total,
  isSelected,
  isLoading
}: {
  attempted: number;
  total: number;
  isSelected: boolean;
  isLoading: boolean;
}) => {
  const clampedAttempted = Math.min(attempted, total);
  const percentage = total > 0 ? Math.round((clampedAttempted / total) * 100) : 0;
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1">
      <div className="relative h-12 w-12">
        <svg className="-rotate-90 h-12 w-12" viewBox="0 0 48 48" aria-hidden="true">
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="5"
            className="stroke-muted"
          />
          <circle
            cx="24"
            cy="24"
            r={radius}
            fill="none"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`transition-all duration-500 ${isSelected ? 'stroke-primary' : 'stroke-emerald-500'}`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-[10px] font-black ${isSelected ? 'text-primary' : 'text-foreground'}`}>
            {isLoading ? '--' : `${percentage}%`}
          </span>
        </div>
      </div>
      <span className={`text-[9px] font-black uppercase tracking-widest ${
        isSelected ? 'text-primary' : 'text-muted-foreground/60'
      }`}>
        Progress
      </span>
    </div>
  );
};

const ChapterCardSkeleton = () => (
  <div className="relative min-h-[112px] animate-pulse overflow-hidden rounded-2xl border-2 border-border/40 bg-white/5 p-4 backdrop-blur-xl dark:bg-white/[0.035]">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 shrink-0 rounded-xl bg-muted" />
      <div className="min-w-0 flex-1 pr-1">
        <div className="h-3.5 w-1/3 rounded-full bg-muted" />
        <div className="mt-2 min-h-10 space-y-1.5">
          <div className="h-3.5 w-full rounded-full bg-muted" />
          <div className="h-3.5 w-2/3 rounded-full bg-muted" />
        </div>
        <div className="mt-1 h-2.5 w-1/2 rounded-full bg-muted" />
      </div>
      <div className="h-12 w-12 shrink-0 rounded-full bg-muted" />
    </div>
  </div>
);

type ChapterTab = 'question_bank' | 'past_paper';

const getChapterContentType = (chapter: Chapter): ChapterTab => (
  chapter.content_type === 'past_paper' ? 'past_paper' : 'question_bank'
);

const MCQChapterSelectionPage = () => {
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [offlineChapterIds, setOfflineChapterIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ChapterTab>('question_bank');

  const chaptersByType = useMemo(() => ({
    question_bank: allChapters.filter(chapter => getChapterContentType(chapter) === 'question_bank'),
    past_paper: allChapters.filter(chapter => getChapterContentType(chapter) === 'past_paper'),
  }), [allChapters]);
  const visibleChapters = chaptersByType[activeTab];

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['mcq-profile-plan', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: Boolean(user?.id)
  });

  const { data: attemptedByChapter = {}, isLoading: progressLoading } = useQuery({
    queryKey: ['mcq-chapter-progress', user?.id, allChapters.map(ch => ch.id).join(',')],
    queryFn: async () => {
      if (allChapters.length === 0 || !user?.id) return {};

      const chapterIds = allChapters.map(ch => ch.id);
      const chapterIdSet = new Set(chapterIds);

      const { data: compactProgress, error: compactProgressError } = await supabase
        .rpc('get_mcq_chapter_progress', { p_chapter_ids: chapterIds });
      if (!compactProgressError && compactProgress) {
        const progressRows = compactProgress as Array<{
          chapter_id: string;
          attempted_count: number;
        }>;
        return progressRows.reduce<Record<string, number>>((acc, row) => {
          acc[row.chapter_id] = Number(row.attempted_count || 0);
          return acc;
        }, {});
      }

      const { data: answerRows, error } = await supabase
        .from('user_answers')
        .select('mcq_id, mcqs(chapter_id)')
        .eq('user_id', user.id);

      if (error || !answerRows) return {};

      const typedAnswerRows = answerRows as Array<{
        mcq_id: string | null;
        mcqs: Array<{ chapter_id: string | null }> | null;
      }>;
      const attemptedMcqIds = new Set(typedAnswerRows.map(answer => answer.mcq_id).filter(Boolean));
      return typedAnswerRows.reduce<Record<string, number>>((acc, answer) => {
        if (!answer.mcq_id || !attemptedMcqIds.delete(answer.mcq_id)) return acc;
        const chapterId = answer.mcqs?.[0]?.chapter_id;
        if (!chapterId || !chapterIdSet.has(chapterId)) return acc;
        acc[chapterId] = (acc[chapterId] || 0) + 1;
        return acc;
      }, {});
    },
    enabled: Boolean(user?.id) && allChapters.length > 0 && !isOfflineMode
  });

  const loadData = useCallback(async () => {
    if (!subjectId) return;

    setLoading(true);

    const [subjectData, chapters] = await Promise.all([
      fetchSubjectById(subjectId),
      fetchChaptersBySubject(subjectId)
    ]);

    if (subjectData) {
      setSubject(subjectData);
    }
    setAllChapters(chapters);
    setLoading(false);
  }, [subjectId]);

  const loadOfflineAvailability = useCallback(async () => {
    const summaries = await getOfflineChapterSummaries();
    setOfflineChapterIds(new Set(
      summaries
        .filter(summary => !subjectId || summary.subjectId === subjectId)
        .map(summary => summary.id),
    ));
  }, [subjectId]);

  useEffect(() => {
    const updateOnlineState = () => setIsOfflineMode(!navigator.onLine);
    const handleOnline = () => {
      updateOnlineState();
      loadData();
    };

    updateOnlineState();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadOfflineAvailability();
    return subscribeOfflineChapterChanges(loadOfflineAvailability);
  }, [loadOfflineAvailability]);

  useEffect(() => {
    if (isOfflineMode && selectedChapter && !offlineChapterIds.has(selectedChapter.id)) {
      setSelectedChapter(null);
    }
  }, [isOfflineMode, offlineChapterIds, selectedChapter]);

  const handleContinue = () => {
    if (selectedChapter && subjectId && (!isOfflineMode || offlineChapterIds.has(selectedChapter.id))) {
      navigate(`/mcqs/settings/${subjectId}/${selectedChapter.id}`, {
        state: { subject, chapter: selectedChapter },
      });
    }
  };

  const selectTab = (tab: ChapterTab) => {
    setActiveTab(tab);
    setSelectedChapter(null);
  };

  if (!subject && !loading) {
    return (
      <MCQPageLayout backTo="/mcqs">
        <div className="text-center py-20">
          <p className="font-semibold text-foreground">We are not fully available in your institute yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">Help us bring Medmacs to your campus.</p>
          <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild variant="outline"><Link to="/contact-us?subject=campus-collaboration">Request campus collaboration</Link></Button>
            <Button onClick={() => setShowCollaborateModal(true)}>Become Medmacs Ambassador</Button>
          </div>
          <CollaborateModal open={showCollaborateModal} onOpenChange={setShowCollaborateModal} />
          <Button onClick={() => navigate('/mcqs')} variant="ghost" className="mt-4">Go Back</Button>
        </div>
      </MCQPageLayout>
    );
  }

  return (
    <MCQPageLayout backTo="/mcqs" scrollable>
      <div className="z-50 -mx-3 shrink-0 bg-gradient-to-b from-background via-background to-background/95 px-3 sm:mx-0 sm:px-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <div className="py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-['Syne'] text-2xl font-extrabold leading-tight tracking-[-0.035em] text-foreground sm:text-3xl">
                Select <span className="live-gradient-text">Chapter</span>
              </h2>
              <Button asChild variant="outline" className="h-9 shrink-0 rounded-full px-3">
                <Link to="/detailed-analytics"><Target className="mr-2 h-4 w-4 text-primary" /><span className="hidden text-[11px] sm:inline">Practice Analytics</span><span className="text-[11px] sm:hidden">Analyze</span></Link>
              </Button>
            </div>
            <div className="mt-1 flex flex-col items-center gap-1">
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">{subject?.name}</p>
              <p className="text-muted-foreground/60 text-[10px] font-medium uppercase tracking-[0.2em]">
                {isOfflineMode
                  ? 'Offline mode - downloaded MCQs only'
                  : subject?.free_unlimited_access
                  ? 'Free · No limits'
                  : profile?.plan === 'free'
                  ? 'Free daily limits apply'
                  : 'Unlimited Premium Access'}
              </p>
            </div>
          </div>
          <nav className="no-scrollbar flex w-full gap-2 overflow-x-auto pb-3" aria-label="Chapter content type">
            <button
              type="button"
              onClick={() => selectTab('question_bank')}
              aria-pressed={activeTab === 'question_bank'}
              className={`flex min-w-[170px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'question_bank'
                  ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Question Bank
              <span className="rounded-full bg-background/15 px-2 py-0.5 text-[9px]">{chaptersByType.question_bank.length}</span>
            </button>
            <button
              type="button"
              onClick={() => selectTab('past_paper')}
              aria-pressed={activeTab === 'past_paper'}
              className={`flex min-w-[150px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 py-3 text-xs font-black uppercase tracking-wider transition-all ${
                activeTab === 'past_paper'
                  ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                  : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <FileClock className="h-4 w-4" />
              Past Papers
              <span className="rounded-full bg-background/15 px-2 py-0.5 text-[9px]">{chaptersByType.past_paper.length}</span>
            </button>
          </nav>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/40 dark:from-background/10 to-transparent pointer-events-none" />
      </div>

      <div className="no-scrollbar mx-auto grid min-h-0 w-full max-w-4xl flex-1 grid-cols-1 gap-4 overflow-y-auto px-4 pb-32 sm:px-0 md:grid-cols-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ChapterCardSkeleton key={i} />)
        ) : allChapters.length === 0 ? (
          <div className="col-span-full text-center py-16">
            <p className="font-semibold text-foreground">We are not fully available in your institute yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">Help us bring chapter-wise content to your campus.</p>
            <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
              <Button asChild variant="outline"><Link to="/contact-us?subject=campus-collaboration">Request campus collaboration</Link></Button>
              <Button onClick={() => setShowCollaborateModal(true)}>Become Medmacs Ambassador</Button>
            </div>
            <CollaborateModal open={showCollaborateModal} onOpenChange={setShowCollaborateModal} />
          </div>
        ) : visibleChapters.length === 0 && activeTab === 'past_paper' ? (
          <div className="col-span-full py-10 text-center sm:py-16">
            <div className="mx-auto max-w-lg rounded-3xl border border-primary/15 bg-primary/5 px-6 py-10 shadow-xl shadow-primary/5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FileClock className="h-7 w-7" />
              </div>
              <h3 className="brand-syne mt-5 text-xl uppercase italic text-foreground">Past papers are not yet ready for your institute</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Help us curate the papers students at your institute need most.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild variant="outline">
                  <Link to="/contact-us?subject=campus-collaboration">Request campus collaboration</Link>
                </Button>
                <Button onClick={() => setShowCollaborateModal(true)}>Collaborate with Medmacs</Button>
              </div>
              <CollaborateModal open={showCollaborateModal} onOpenChange={setShowCollaborateModal} />
            </div>
          </div>
        ) : visibleChapters.length === 0 ? (
          <div className="col-span-full py-16 text-center">
            <p className="font-semibold text-foreground">Question Bank chapters are being prepared.</p>
            <p className="mt-2 text-sm text-muted-foreground">Please check back soon.</p>
          </div>
        ) : (
          visibleChapters.map((ch) => {
            const isComingSoon = (ch.mcq_count || 0) === 0;
            const isSelected = selectedChapter?.id === ch.id;
            const isOfflineUnavailable = isOfflineMode && !offlineChapterIds.has(ch.id);
            const isDisabled = isComingSoon || isOfflineUnavailable;
            const attemptedCount = attemptedByChapter[ch.id] || 0;
            const totalCount = ch.mcq_count || 0;
            const isFreeUnlimited = subject?.free_unlimited_access === true;

            return (
              <div
                key={ch.id}
                onClick={() => !isDisabled && setSelectedChapter(ch)}
                aria-disabled={isDisabled}
                className={`group relative min-h-[112px] overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 ${
                  isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                    : 'border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {isComingSoon && (
                  <div className="absolute top-2 right-2 z-20 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Coming Soon
                  </div>
                )}
                {isOfflineUnavailable && (
                  <div className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">
                    <WifiOff className="h-3 w-3" />
                    Not downloaded
                  </div>
                )}

                <div className="relative z-10 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center">
                    {!isDisabled && subject ? (
                      <ChapterDownloadButton
                        subject={subject}
                        chapter={ch}
                        compact
                        className={`h-12 w-12 rounded-xl ${
                          isSelected ? 'border-primary/30 shadow-lg shadow-primary/20' : ''
                        }`}
                      />
                    ) : (
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all ${
                        isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-muted/50 text-foreground/70'
                      }`}>
                        <BookOpen className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pr-1">
                    <h3 className={`text-sm font-black uppercase italic tracking-normal leading-snug transition-colors ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      Chapter {ch.chapter_number}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 min-h-10 break-words text-sm font-bold leading-snug text-foreground/90">
                      {ch.name}
                    </p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground/70">
                      {isOfflineMode
                        ? `${totalCount} questions`
                        : progressLoading
                        ? '--/-- questions'
                        : `${Math.min(attemptedCount, totalCount)}/${totalCount} questions`}
                    </p>
                    {isFreeUnlimited && (
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                        Free · No limits
                      </p>
                    )}
                  </div>

                  {!isDisabled && (
                    <div className="ml-auto flex shrink-0 items-center justify-end">
                      {isOfflineMode ? (
                        <div className="flex w-12 flex-col items-center justify-center">
                          <WifiOff className="mb-1 h-4 w-4 text-amber-600 dark:text-amber-300" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">
                            Offline
                          </span>
                        </div>
                      ) : (
                        <ChapterProgressDonut
                          attempted={attemptedCount}
                          total={totalCount}
                          isSelected={isSelected}
                          isLoading={progressLoading}
                        />
                      )}
                    </div>
                  )}
                </div>
                {offlineChapterIds.has(ch.id) && (
                  <div className="mt-3 flex w-full items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    This chapter is available for offline use
                  </div>
                )}
              </div>
            );
          })
        )}
        <div className="col-span-full py-10 text-center opacity-40">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • MCQ Practice System</p>
        </div>
      </div>

      {selectedChapter && (
          <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6">
            <div className="w-full max-w-md pointer-events-auto">
              <Button
                onClick={handleContinue}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
                size="lg"
              >
                Start Practice Test
                <span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </span>
              </Button>
            </div>
          </div>
      )}

    </MCQPageLayout>
  );
};

export default MCQChapterSelectionPage;
