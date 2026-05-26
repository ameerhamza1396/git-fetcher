import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import { fetchChaptersBySubject, Subject, Chapter } from '@/utils/mcqData';
import { MCQPageLayout } from './MCQPageLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    <div className="flex items-center gap-3 shrink-0">
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
      <div className="flex w-16 flex-col items-start">
        <span className={`text-[10px] font-black uppercase tracking-widest ${
          isSelected ? 'text-primary' : 'text-muted-foreground/70'
        }`}>
          {isLoading ? 'Loading' : `${clampedAttempted}/${total}`}
        </span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
          Attempted
        </span>
      </div>
    </div>
  );
};

const ChapterCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-2xl bg-muted/20 p-4 animate-pulse border border-border/30">
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/4 bg-muted rounded-full" />
        <div className="h-3 w-3/4 bg-muted rounded-full" />
      </div>
    </div>
  </div>
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
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [isHeadingStuck, setIsHeadingStuck] = useState(false);
  const stickyHeadingRef = useRef<HTMLDivElement>(null);
  const stickyHeadingStartTop = useRef<number | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', 'chapter-select'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: true
  });

  const { data: attemptedByChapter = {}, isLoading: progressLoading } = useQuery({
    queryKey: ['mcq-chapter-progress', allChapters.map(ch => ch.id).join(',')],
    queryFn: async () => {
      if (allChapters.length === 0) return {};

      const chapterIds = allChapters.map(ch => ch.id);
      const chapterIdSet = new Set(chapterIds);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return {};

      const { data: answerRows, error } = await supabase
        .from('user_answers')
        .select('mcq_id, mcqs(chapter_id)')
        .eq('user_id', user.id);

      if (error || !answerRows) return {};

      const attemptedMcqIds = new Set(answerRows.map(answer => answer.mcq_id).filter(Boolean));
      return answerRows.reduce<Record<string, number>>((acc, answer: any) => {
        if (!answer.mcq_id || !attemptedMcqIds.delete(answer.mcq_id)) return acc;
        const chapterId = answer.mcqs?.chapter_id;
        if (!chapterId || !chapterIdSet.has(chapterId)) return acc;
        acc[chapterId] = (acc[chapterId] || 0) + 1;
        return acc;
      }, {});
    },
    enabled: allChapters.length > 0
  });

  useEffect(() => {
    const loadData = async () => {
      if (!subjectId) return;
      
      setLoading(true);
      
      const [{ data: subjectData }, chapters] = await Promise.all([
        supabase.from('subjects').select('*').eq('id', subjectId).single(),
        fetchChaptersBySubject(subjectId)
      ]);
      
      if (subjectData) {
        setSubject(subjectData as Subject);
      }
      setAllChapters(chapters);
      setLoading(false);
    };
    
    loadData();
  }, [subjectId]);

  useEffect(() => {
    const handleScroll = () => {
      if (!stickyHeadingRef.current) return;
      if (stickyHeadingStartTop.current === null) {
        stickyHeadingStartTop.current = stickyHeadingRef.current.offsetTop;
      }
      setIsHeadingStuck(window.scrollY >= stickyHeadingStartTop.current - 1);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  const handleContinue = () => {
    if (selectedChapter && subjectId) {
      navigate(`/mcqs/settings/${subjectId}/${selectedChapter.id}`);
    }
  };

  if (!subject && !loading) {
    return (
      <MCQPageLayout backTo="/mcqs">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Subject not found</p>
          <Button onClick={() => navigate('/mcqs')} className="mt-4">Go Back</Button>
        </div>
      </MCQPageLayout>
    );
  }

  return (
    <MCQPageLayout backTo="/mcqs">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 px-4"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block">Step 2 of 3</span>
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
                Select <span className="live-gradient-text">Chapter</span>
              </motion.h2>
            </motion.div>
            <motion.div
              animate={{
                opacity: isHeadingStuck ? 0 : 1,
                y: isHeadingStuck ? -8 : 0,
                height: isHeadingStuck ? 0 : 'auto',
                marginTop: isHeadingStuck ? 0 : 8
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex flex-col items-center gap-1"
            >
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">{subject?.name}</p>
              <p className="text-muted-foreground/60 text-[10px] font-medium uppercase tracking-[0.2em]">
                {profile?.plan === 'free'
                  ? 'Free daily limits apply'
                  : 'Unlimited Premium Access'}
              </p>
            </motion.div>
          </motion.div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32 grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ChapterCardSkeleton key={i} />)
        ) : (
          allChapters.map((ch, idx) => {
            const isComingSoon = (ch.mcq_count || 0) === 0;
            const isSelected = selectedChapter?.id === ch.id;
            
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={!isComingSoon ? { scale: 1.02, x: 5 } : {}}
                whileTap={isComingSoon ? {} : { scale: 0.98 }}
                onClick={() => !isComingSoon && setSelectedChapter(ch)}
                className={`group relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 ${
                  isComingSoon ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'
                } ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' 
                    : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {isComingSoon && (
                  <div className="absolute top-2 right-2 z-20 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Coming Soon
                  </div>
                )}

                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isSelected ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-muted/50 text-foreground/70'
                  }`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-black uppercase italic tracking-tight transition-colors ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      Chapter {ch.chapter_number}
                    </h3>
                    <p className="text-muted-foreground text-xs font-medium truncate">
                      {ch.name}
                    </p>
                  </div>

                  {!isComingSoon && (
                    <div className="shrink-0">
                      <ChapterProgressDonut
                        attempted={attemptedByChapter[ch.id] || 0}
                        total={ch.mcq_count || 0}
                        isSelected={isSelected}
                        isLoading={progressLoading}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedChapter && (
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
                Start Practice Test
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
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • MCQ Practice System</p>
      </div>
    </MCQPageLayout>
  );
};

export default MCQChapterSelectionPage;
