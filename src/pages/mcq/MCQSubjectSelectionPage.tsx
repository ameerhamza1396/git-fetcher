import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Flame, RefreshCw, Target, TrendingUp, WifiOff } from 'lucide-react';
import { fetchSubjects, readCachedSubjects, Subject } from '@/utils/mcqData';
import { useAuth } from '@/hooks/useAuth';
import { MCQPageLayout } from './MCQPageLayout';
import AppTransitionScreen from '@/components/AppTransitionScreen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';
import { getOfflineChapterSummaries, subscribeOfflineChapterChanges } from '@/utils/offlineChapters';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const SubjectCardSkeleton = () => (
  <div className="relative h-full min-h-[128px] animate-pulse overflow-hidden rounded-2xl border-2 border-border/40 bg-white/5 p-4 backdrop-blur-xl dark:bg-white/[0.035]">
    <div className="grid h-full grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4">
      <div className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-xl bg-muted sm:h-16 sm:w-16" />
      <div className="min-w-0 flex-1">
        <div className="space-y-2 pt-1">
          <div className="h-5 w-2/3 rounded-full bg-muted" />
          <div className="h-5 w-2/5 rounded-full bg-muted" />
        </div>
        <div className="mt-1.5 space-y-1.5">
          <div className="h-3 w-full rounded-full bg-muted" />
          <div className="h-3 w-3/4 rounded-full bg-muted" />
        </div>
      </div>
    </div>
  </div>
);

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: value >= 10000 ? 'compact' : 'standard' }).format(value || 0);

const AnalyticsBubble = ({
  value,
  label,
  icon: Icon,
  gradient,
  glow,
  isCompact,
  index,
}: {
  value: string;
  label: string;
  icon: typeof Target;
  gradient: string;
  glow: string;
  isCompact: boolean;
  index: number;
}) => {
  return (
    <motion.div
      layout
      animate={{
        y: isCompact ? -2 : 0,
        scale: isCompact ? 0.96 : 1,
      }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
      className={`group relative min-w-0 transform-gpu overflow-hidden bg-gradient-to-br ${gradient} text-white shadow-xl shadow-black/10 ring-1 ring-white/10 transition-[border-radius,padding] duration-[240ms] ease-out will-change-transform ${
        isCompact ? 'rounded-full p-0.5' : 'rounded-2xl p-0.5 sm:p-1'
      }`}
    >
      <div className="pointer-events-none absolute inset-x-3 top-0 h-1/2 rounded-full bg-white/20 blur-2xl" />
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)',
        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
      }} />
      <div
        className={`relative z-10 border border-white/15 bg-white/[0.14] backdrop-blur-xl transition-[height,padding,border-radius] duration-[240ms] ease-out ${
          isCompact ? 'flex h-10 items-center justify-center rounded-full px-2 py-0' : 'min-h-[5.9rem] rounded-[1.15rem] px-1.5 py-2.5 text-center sm:min-h-[6.35rem] sm:p-3'
        }`}
      >
        <div className={`flex min-w-0 ${isCompact ? 'items-center gap-1.5 sm:gap-2' : 'h-full flex-col items-center justify-center'}`}>
          <span
            className={`relative flex shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 transition-all duration-[240ms] ease-out ${
              isCompact ? 'h-5 w-5 rounded-full' : 'mb-2 h-7 w-7 rounded-xl sm:h-8 sm:w-8'
            }`}
          >
            <span className={`absolute inset-0 ${glow} blur-lg opacity-40 rounded-full`} />
            <Icon className={`relative text-white transition-all duration-[240ms] ease-out ${isCompact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'}`} />
          </span>
          <p className={`min-w-0 max-w-full truncate font-black leading-none transition-[font-size] duration-[240ms] ease-out ${isCompact ? 'text-[10px] sm:text-sm' : 'text-[1.05rem] sm:text-xl'}`}>
            {value}
          </p>
        </div>
        <motion.p
          animate={{
            opacity: isCompact ? 0 : 1,
            height: isCompact ? 0 : 'auto',
            marginTop: isCompact ? 0 : 4,
          }}
          transition={{ duration: 0.18 }}
          className={`overflow-hidden text-[8px] font-black uppercase leading-tight tracking-[0.08em] text-white/70 transition-[max-height,opacity,margin] duration-[160ms] ease-out sm:text-[9px] sm:tracking-[0.12em] ${
            isCompact ? 'mt-0 max-h-0 opacity-0' : 'mt-1 max-h-8 opacity-100'
          }`}
        >
          {label}
        </motion.p>
      </div>
    </motion.div>
  );
};

const MCQAnalyticsPanel = ({
  stats,
  isCompact,
  isOffline,
}: {
  stats: { totalQuestions: number; correctAnswers: number; accuracy: number; averageTime: number; bestStreak: number };
  isCompact: boolean;
  isOffline: boolean;
}) => {
  const pulseWords = ['Your', 'MCQ', 'progress,', 'pace,', 'and', 'streak', 'in', 'motion.'];

  if (isOffline) {
    return (
      <motion.section
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        className="rounded-[2rem] border border-amber-500/20 bg-amber-500/10 p-5 text-center shadow-sm backdrop-blur-xl"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
          <WifiOff className="h-6 w-6 text-amber-600 dark:text-amber-300" />
        </div>
        <p className="text-xs font-black uppercase tracking-wider text-foreground">Offline mode</p>
        <p className="mt-1 text-[11px] text-muted-foreground">MCQ analytics sync after your connection returns.</p>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[2rem] border border-border/70 bg-card/55 dark:bg-white/[0.035] p-5 shadow-sm backdrop-blur-xl"
    >
      <div className="overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Target className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Practice Pulse</p>
            <motion.h2
              className="mt-2 flex flex-wrap gap-x-1.5 gap-y-0.5 text-2xl font-black leading-tight tracking-normal"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.045 } },
              }}
            >
              {pulseWords.map((word) => (
                <motion.span
                  key={word}
                  variants={{
                    hidden: { opacity: 0, y: 8, scale: 0.96 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: { type: 'spring', stiffness: 520, damping: 18 },
                    },
                  }}
                  className={word === 'motion.' ? 'text-primary' : undefined}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h2>
          </div>
        </div>
      </div>

      <motion.div
        layout
        className={`mt-5 grid gap-2 transition-all duration-300 sm:gap-3 ${
          isCompact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
        }`}
      >
        <AnalyticsBubble
          value={formatCompactNumber(stats.totalQuestions)}
          label="Practiced"
          icon={Target}
          gradient="from-blue-600 via-indigo-600 to-violet-700"
          glow="bg-blue-400"
          isCompact={isCompact}
          index={0}
        />
        <AnalyticsBubble
          value={`${stats.accuracy || 0}%`}
          label="Accuracy"
          icon={TrendingUp}
          gradient="from-emerald-600 via-teal-600 to-cyan-700"
          glow="bg-emerald-400"
          isCompact={isCompact}
          index={1}
        />
        <AnalyticsBubble
          value={formatCompactNumber(stats.bestStreak)}
          label="Best Streak"
          icon={Flame}
          gradient="from-orange-500 via-red-500 to-rose-600"
          glow="bg-orange-400"
          isCompact={isCompact}
          index={2}
        />
        <AnalyticsBubble
          value={`${stats.averageTime || 0}s`}
          label="Avg Time"
          icon={Clock}
          gradient="from-rose-600 via-pink-600 to-fuchsia-700"
          glow="bg-rose-400"
          isCompact={isCompact}
          index={3}
        />
      </motion.div>
    </motion.section>
  );
};

const MCQSubjectSelectionPage = () => {
  const pageScrollRef = useRef<HTMLDivElement>(null);
  const subjectRequestRef = useRef(0);

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      pageScrollRef.current?.scrollTo({ top: 0 });
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  const [subjects, setSubjects] = useState<Subject[]>(readCachedSubjects);
  const [loading, setLoading] = useState(() => readCachedSubjects().length === 0);
  const [loadError, setLoadError] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [offlineSubjectIds, setOfflineSubjectIds] = useState<Set<string>>(new Set());
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [entryTransitionComplete, setEntryTransitionComplete] = useState(false);
  const [userStats, setUserStats] = useState({
    totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['mcq-profile-plan', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles').select('plan').eq('id', user.id).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  const loadSubjects = useCallback(async () => {
    const requestId = ++subjectRequestRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchSubjects();
      if (requestId !== subjectRequestRef.current) return;
      setSubjects(current => data.length > 0 ? data : current);
    } catch (error) {
      console.error('Unable to load MCQ subjects:', error);
      if (requestId === subjectRequestRef.current) setLoadError(true);
    } finally {
      if (requestId === subjectRequestRef.current) setLoading(false);
    }
  }, []);

  const loadUserStats = useCallback(async () => {
    if (!user?.id || isOfflineMode) return;
    const { getUserStats } = await import('@/utils/mcqData');
    const stats = await getUserStats(user.id);
    setUserStats(stats);
  }, [isOfflineMode, user?.id]);

  const loadOfflineAvailability = useCallback(async () => {
    const summaries = await getOfflineChapterSummaries();
    setOfflineSubjectIds(new Set(summaries.map(summary => summary.subjectId)));
  }, []);

  useEffect(() => {
    const transitionTimer = window.setTimeout(() => setEntryTransitionComplete(true), 220);
    return () => window.clearTimeout(transitionTimer);
  }, []);

  useEffect(() => {
    const updateOnlineState = () => setIsOfflineMode(!navigator.onLine);
    const handleOnline = () => {
      updateOnlineState();
      loadSubjects();
      loadUserStats();
    };

    updateOnlineState();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, [loadSubjects, loadUserStats]);

  useEffect(() => {
    loadOfflineAvailability();
    return subscribeOfflineChapterChanges(loadOfflineAvailability);
  }, [loadOfflineAvailability]);

  useEffect(() => {
    if (isOfflineMode && selectedSubject && !offlineSubjectIds.has(selectedSubject.id)) {
      setSelectedSubject(null);
    }
  }, [isOfflineMode, offlineSubjectIds, selectedSubject]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    const channel = supabase
      .channel('mcq-subject-access-flags')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'subjects' },
        () => {
          void loadSubjects();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadSubjects]);

  useEffect(() => {
    if (user?.id && !authLoading && !profileLoading) loadUserStats();
  }, [user?.id, authLoading, profileLoading, loadUserStats]);

  const handleContinue = () => {
    if (selectedSubject && (!isOfflineMode || offlineSubjectIds.has(selectedSubject.id))) {
      navigate(`/mcqs/chapter/${selectedSubject.id}`);
    }
  };

  if (!entryTransitionComplete || authLoading || profileLoading) {
    return <AppTransitionScreen label="Preparing MCQs" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background/55 dark:bg-white/[0.035] backdrop-blur-xl p-4 text-center">
        <Card className="w-full max-w-md bg-card/60 dark:bg-white/[0.05] backdrop-blur-sm border-border shadow-lg p-6">
          <CardHeader className="mb-4">
            <Lock className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle className="text-2xl font-bold text-foreground">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Please log in to access the MCQ practice section.</p>
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded-lg shadow-md">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MCQPageLayout
      backTo="/dashboard"
      showHeader={true}
      showBackButton={true}
      scrollable
      scrollRef={pageScrollRef}
    >
      <Seo title="MCQs Practice" description="Practice thousands of MCQs for MDCAT and other medical entrance exams with Medmacs App." canonical="https://medmacs.app/mcqs" />
      
      <Sheet open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <SheetContent
          side="bottom"
          className="no-scrollbar max-h-[88dvh] overflow-y-auto rounded-t-[2rem] border-x border-t border-border/70 bg-background/95 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl backdrop-blur-2xl sm:px-6"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          <SheetHeader className="sr-only">
            <SheetTitle>MCQ practice analytics</SheetTitle>
            <SheetDescription>Your practice totals, accuracy, streak and average answer time.</SheetDescription>
          </SheetHeader>
          <div className="mx-auto w-full max-w-4xl">
            <MCQAnalyticsPanel
              stats={userStats}
              isCompact={false}
              isOffline={isOfflineMode}
            />
          </div>
        </SheetContent>
      </Sheet>

      <div className="z-50 -mx-3 shrink-0 bg-gradient-to-b from-background via-background to-background/95 px-3 sm:mx-0 sm:px-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <div className="py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-['Syne'] text-2xl font-extrabold leading-tight tracking-[-0.035em] text-foreground sm:text-3xl">
                Select <span className="live-gradient-text">Subject</span>
              </h2>
              <button type="button" onClick={() => setAnalyticsOpen(true)} className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-card/55 px-3 py-2 shadow-sm backdrop-blur-xl" aria-label="Open MCQ practice analytics">
                <Target className="h-4 w-4 text-primary" />
                <span className="hidden text-[11px] font-bold sm:inline">Practice Analytics</span>
                <span className="text-[11px] font-bold sm:hidden">Analyze</span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">{formatCompactNumber(userStats.totalQuestions)}</span>
              </button>
            </div>
            <p className="mx-auto mt-1 max-w-lg text-center text-xs font-medium text-muted-foreground">
              Choose a subject to begin your practice. Each subject contains comprehensive chapters and high-yield MCQs.
            </p>
          </div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/40 dark:from-background/10 to-transparent pointer-events-none" />
      </div>

      <div className="no-scrollbar mx-auto grid min-h-0 w-full max-w-4xl flex-1 auto-rows-max grid-cols-1 items-stretch gap-3 overflow-y-auto px-4 pb-32 sm:gap-4 sm:px-0 md:grid-cols-2 md:auto-rows-fr">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SubjectCardSkeleton key={i} />)
        ) : subjects.length > 0 ? (
          subjects.map((subject) => {
            const isSelected = selectedSubject?.id === subject.id;
            const isOfflineUnavailable = isOfflineMode && !offlineSubjectIds.has(subject.id);
            const isFreeUnlimited = subject.free_unlimited_access === true;
            return (
              <button
                type="button"
                key={subject.id}
                onClick={() => !isOfflineUnavailable && setSelectedSubject(subject)}
                aria-pressed={isSelected}
                aria-disabled={isOfflineUnavailable}
                disabled={isOfflineUnavailable}
                className={`group relative h-full min-h-[128px] w-full overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  isOfflineUnavailable ? 'cursor-not-allowed opacity-45 grayscale' : 'cursor-pointer'
                } ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-2xl shadow-primary/20 ring-1 ring-primary/30'
                    : 'border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {isOfflineUnavailable && (
                  <div className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-white sm:px-2.5 sm:text-[8px] sm:tracking-widest">
                    <WifiOff className="h-3 w-3" />
                    Not downloaded
                  </div>
                )}
                {isSelected && (
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-primary/5" />
                )}

                <div className="relative z-10 grid h-full grid-cols-[3.25rem_minmax(0,1fr)_1.75rem] items-center gap-3 sm:grid-cols-[4rem_minmax(0,1fr)_2rem] sm:gap-4">
                  <div className={`flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-xl text-2xl leading-none transition-all duration-300 group-hover:scale-105 sm:h-16 sm:w-16 sm:text-3xl sm:group-hover:scale-110 ${
                    isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/30'
                      : isOfflineUnavailable
                        ? 'bg-muted/40 text-muted-foreground'
                        : 'bg-muted/50 text-foreground/70'
                  }`}>
                    <span className="block leading-none">{subject.icon || '📚'}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start gap-2">
                      <h3 className={`line-clamp-2 text-base font-black uppercase italic tracking-normal leading-snug transition-colors sm:text-xl ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}>
                        {subject.name}
                      </h3>
                      {isSelected && (
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-muted-foreground sm:text-xs">
                      {subject.description || `Master ${subject.name} with our structured question bank and detailed explanations.`}
                    </p>
                    {isFreeUnlimited && (
                      <div className="mt-3 inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                        Free
                      </div>
                    )}
                  </div>

                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center justify-self-end rounded-full transition-all sm:h-8 sm:w-8 ${
                    isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground opacity-70 group-hover:text-foreground group-hover:opacity-100'
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="col-span-full rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8 text-center">
            <WifiOff className="mx-auto h-9 w-9 text-amber-600 dark:text-amber-300" />
            <h3 className="mt-4 text-sm font-black uppercase tracking-wider text-foreground">
              {loadError ? 'Connection failure' : 'No subjects available'}
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              {loadError ? 'We could not connect to the content server. Check your connection and try again.' : 'No subjects are currently available for your institute.'}{' '}
              <a className="font-semibold underline underline-offset-2" href="mailto:hi@medmacs.app">
                hi@medmacs.app
              </a>
              .
            </p>
            <Button type="button" className="mt-5 rounded-xl" onClick={loadSubjects}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        )}
      </div>
      <footer className="shrink-0 py-2 text-center opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • All rights reserved</p>
      </footer>

      {selectedSubject && (
          <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6">
            <div className="w-full max-w-md pointer-events-auto">
              <Button
                onClick={handleContinue}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
                size="lg"
              >
                Continue to Chapters
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

export default MCQSubjectSelectionPage;
