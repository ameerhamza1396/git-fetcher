import { useState, useEffect, useLayoutEffect, useRef, useCallback, type UIEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, Flame, Target, TrendingUp, WifiOff } from 'lucide-react';
import { fetchSubjects, Subject } from '@/utils/mcqData';
import { useAuth } from '@/hooks/useAuth';
import { MCQPageLayout } from './MCQPageLayout';
import PageSkeleton from '@/components/skeletons/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

const SubjectCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-3xl bg-muted/20 p-6 animate-pulse border border-border/40">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-1/3 bg-muted rounded-full" />
        <div className="h-3 w-2/3 bg-muted rounded-full" />
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
  const stepDelay = isCompact ? index * 36 : (3 - index) * 24;

  return (
    <div
      style={{
      flexBasis: isCompact ? 'calc((100% - 1.5rem) / 4)' : 'calc((100% - 0.5rem) / 2)',
      maxWidth: isCompact ? 'calc((100% - 1.5rem) / 4)' : 'calc((100% - 0.5rem) / 2)',
        transitionDelay: `${stepDelay}ms`,
        transform: isCompact ? 'translateY(-2px) scale(0.985)' : 'translateY(0) scale(1)',
      }}
      className={`relative shrink-0 transform-gpu overflow-hidden bg-gradient-to-br ${gradient} text-white shadow-xl transition-[flex-basis,max-width,border-radius,padding,transform] duration-[240ms] ease-out will-change-[flex-basis,max-width,transform] ${
        isCompact ? 'rounded-full p-0.5' : 'rounded-[1.5rem] p-1'
      }`}
    >
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)',
        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
      }} />
      <div
        style={{ transitionDelay: `${stepDelay}ms` }}
        className={`relative z-10 border border-white/10 bg-white/10 backdrop-blur-xl transition-[height,padding,border-radius] duration-[240ms] ease-out ${
          isCompact ? 'flex h-10 items-center justify-center rounded-full px-2 py-0' : 'rounded-[1.3rem] p-3 text-center'
        }`}
      >
        <div className={`flex ${isCompact ? 'items-center gap-2' : 'flex-col items-center'}`}>
          <span
            style={{ transitionDelay: `${stepDelay}ms` }}
            className={`relative flex shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 transition-all duration-[240ms] ease-out ${
              isCompact ? 'h-5 w-5 rounded-full' : 'mb-2 h-8 w-8'
            }`}
          >
            <span className={`absolute inset-0 ${glow} blur-lg opacity-40 rounded-full`} />
            <Icon className={`relative text-white transition-all duration-[240ms] ease-out ${isCompact ? 'h-2.5 w-2.5' : 'h-4 w-4'}`} />
          </span>
          <p className={`min-w-0 truncate font-black leading-none transition-[font-size] duration-[240ms] ease-out ${isCompact ? 'text-[11px] sm:text-sm' : 'text-xl sm:text-2xl'}`}>
            {value}
          </p>
        </div>
        <p
          style={{ transitionDelay: `${Math.max(stepDelay - 12, 0)}ms` }}
          className={`overflow-hidden text-[10px] font-bold uppercase tracking-widest text-white/50 transition-[max-height,opacity,margin] duration-[160ms] ease-out ${
            isCompact ? 'mt-0 max-h-0 opacity-0' : 'mt-1 max-h-4 opacity-100'
          }`}
        >
          {label}
        </p>
      </div>
    </div>
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
      className="rounded-[2rem] border border-border/70 bg-card/82 p-5 shadow-sm backdrop-blur-xl"
    >
      <div className="overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-primary">
            <Target className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">Practice Pulse</p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight">
              Your MCQ momentum at a glance.
            </h2>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
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
      </div>
    </motion.section>
  );
};

const MCQSubjectSelectionPage = () => {
  const pageScrollRef = useRef<HTMLDivElement>(null);
  const stickyHeadingRef = useRef<HTMLDivElement>(null);
  const stickyHeadingStartTop = useRef<number | null>(null);
  const latestScrollTopRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const analyticsCompactRef = useRef(false);

  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      pageScrollRef.current?.scrollTo({ top: 0 });
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [isHeadingStuck, setIsHeadingStuck] = useState(false);
  const [isAnalyticsCompact, setIsAnalyticsCompact] = useState(false);
  const [userStats, setUserStats] = useState({
    totalQuestions: 0, correctAnswers: 0, accuracy: 0, averageTime: 0, bestStreak: 0
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
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
    setLoading(true);
    const data = await fetchSubjects();
    setSubjects(data);
    setLoading(false);
  }, []);

  const loadUserStats = useCallback(async () => {
    if (!user?.id || isOfflineMode) return;
    const { getUserStats } = await import('@/utils/mcqData');
    const stats = await getUserStats(user.id);
    setUserStats(stats);
  }, [isOfflineMode, user?.id]);

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
    loadSubjects();
  }, [loadSubjects]);

  const updateScrollState = useCallback((scrollTop: number) => {
    if (!stickyHeadingRef.current) return;
    if (stickyHeadingStartTop.current === null) {
      stickyHeadingStartTop.current = stickyHeadingRef.current.offsetTop;
    }

    const nextIsCompact = analyticsCompactRef.current ? scrollTop > 18 : scrollTop > 72;
    const nextIsHeadingStuck = scrollTop >= stickyHeadingStartTop.current - 1;

    if (analyticsCompactRef.current !== nextIsCompact) {
      analyticsCompactRef.current = nextIsCompact;
      setIsAnalyticsCompact(nextIsCompact);
    }
    setIsHeadingStuck((current) => (current === nextIsHeadingStuck ? current : nextIsHeadingStuck));
  }, []);

  const handlePageScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    latestScrollTopRef.current = event.currentTarget.scrollTop;
    if (scrollFrameRef.current !== null) return;

    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateScrollState(latestScrollTopRef.current);
    });
  }, [updateScrollState]);

  useEffect(() => {
    const handleResize = () => {
      stickyHeadingStartTop.current = null;
      updateScrollState(pageScrollRef.current?.scrollTop || 0);
    };

    const frame = requestAnimationFrame(() => updateScrollState(pageScrollRef.current?.scrollTop || 0));
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frame);
      if (scrollFrameRef.current !== null) {
        cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [updateScrollState]);

  useEffect(() => {
    if (user?.id && !authLoading && !profileLoading) loadUserStats();
  }, [user?.id, authLoading, profileLoading, loadUserStats]);

  const handleContinue = () => {
    if (selectedSubject) {
      navigate(`/mcqs/chapter/${selectedSubject.id}`);
    }
  };

  if (authLoading || profileLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm border-border shadow-lg p-6">
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
      onScroll={handlePageScroll}
    >
      <Seo title="MCQs Practice" description="Practice thousands of MCQs for MDCAT and other medical entrance exams with Medmacs App." canonical="https://medmacs.app/mcqs" />
      
      <div className="text-center mb-6 sm:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic mb-3">
          📚 MCQ <span className="text-primary">Practice</span>
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] max-w-2xl mx-auto px-4 sm:px-0">
          Master medical concepts with our comprehensive MCQ practice system
        </p>
      </div>

      <div className="mx-auto mb-6 max-w-4xl px-4 sm:mb-8 sm:px-0">
        <MCQAnalyticsPanel
          stats={userStats}
          isCompact={isAnalyticsCompact}
          isOffline={isOfflineMode}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 px-4"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block">Step 1 of 3</span>
      </motion.div>

      <div ref={stickyHeadingRef} className="sticky top-0 z-50 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)] -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <motion.div
            animate={{ paddingTop: isHeadingStuck ? 10 : 16, paddingBottom: isHeadingStuck ? 10 : 12 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <motion.div
              animate={{ height: isHeadingStuck ? 28 : 56 }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="relative"
            >
              <motion.h2
                animate={{
                  left: isHeadingStuck ? '0%' : '50%',
                  x: isHeadingStuck ? '0%' : '-50%',
                  scale: isHeadingStuck ? 0.58 : 1
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                className="absolute top-0 origin-left whitespace-nowrap text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none"
              >
                Select <span className="live-gradient-text">Subject</span>
              </motion.h2>
            </motion.div>
            <motion.p
              animate={{
                opacity: isHeadingStuck ? 0 : 1,
                y: isHeadingStuck ? -8 : 0,
                height: isHeadingStuck ? 0 : 'auto',
                marginTop: isHeadingStuck ? 0 : 8
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden text-muted-foreground text-sm font-medium max-w-lg mx-auto text-center"
            >
              Choose a subject to begin your practice. Each subject contains comprehensive chapters and high-yield MCQs.
            </motion.p>
          </motion.div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32 grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SubjectCardSkeleton key={i} />)
        ) : (
          subjects.map((subject, index) => {
            const isSelected = selectedSubject?.id === subject.id;
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSubject(subject)}
                className={`group cursor-pointer relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' 
                    : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
                )}

                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl transition-transform duration-300 group-hover:scale-110 ${
                    isSelected ? 'bg-primary text-white' : 'bg-muted/50 text-foreground/70'
                  }`}>
                    {subject.icon || '📚'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-xl font-black uppercase italic tracking-tight transition-colors ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}>
                        {subject.name}
                      </h3>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs font-medium leading-relaxed line-clamp-2">
                      {subject.description || `Master ${subject.name} with our structured question bank and detailed explanations.`}
                    </p>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-primary text-white' : 'bg-muted opacity-0 group-hover:opacity-100'
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedSubject && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
          >
            <div className="w-full max-w-md pointer-events-auto">
              <Button
                onClick={handleContinue}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
                size="lg"
              >
                Continue to Chapters
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5 ml-2" />
                </motion.div>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center pt-20 pb-10 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • All rights reserved</p>
      </div>
    </MCQPageLayout>
  );
};

export default MCQSubjectSelectionPage;
