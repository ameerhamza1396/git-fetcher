import { useState, useEffect, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import { fetchSEQChaptersBySubject, SEQChapter, SEQSubject } from '@/utils/mcqData';
import { useAuth } from '@/hooks/useAuth';
import { MCQPageLayout } from '@/pages/mcq/MCQPageLayout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

const SEQChapterSelectionPage = () => {
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [allChapters, setAllChapters] = useState<SEQChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<SEQChapter | null>(null);
  const [subject, setSubject] = useState<SEQSubject | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', 'seq-chapter-select'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: true
  });

  useEffect(() => {
    const loadData = async () => {
      if (!subjectId || profileLoading) return;
      
      setLoadingChapters(true);
      
      const [{ data: subjectData }, chapters] = await Promise.all([
        supabase.from('seqs_subjects').select('*').eq('id', subjectId).single(),
        fetchSEQChaptersBySubject(subjectId)
      ]);
      
      if (subjectData) {
        setSubject(subjectData as SEQSubject);
      }
      setAllChapters(chapters);
      setLoadingChapters(false);
      setLoading(false);
    };
    
    if (!profileLoading) {
      loadData();
    }
  }, [subjectId, profileLoading]);

  const handleContinue = () => {
    if (selectedChapter && subjectId) {
      navigate(`/seqs/quiz/${subjectId}/${selectedChapter.id}`);
    }
  };

  if (profileLoading || loading) {
    return (
      <MCQPageLayout backTo="/seqs">
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <ChapterCardSkeleton key={i} />)}
        </div>
      </MCQPageLayout>
    );
  }

  if (!subject) {
    return (
      <MCQPageLayout backTo="/seqs">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Subject not found</p>
          <Button onClick={() => navigate('/seqs')} className="mt-4">Go Back</Button>
        </div>
      </MCQPageLayout>
    );
  }

  return (
    <MCQPageLayout backTo="/seqs">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 px-4"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-3 block">Step 2 of 3</span>
      </motion.div>

      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)] -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <div className="pt-4 pb-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none text-center">
              Select <span className="text-orange-500">Chapter</span>
            </h2>
            <div className="mt-2 flex flex-col items-center gap-1">
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">{subject?.name}</p>
              <p className="text-muted-foreground/60 text-[10px] font-medium uppercase tracking-[0.2em]">
                {profile?.plan === 'free'
                  ? 'Free daily limits apply'
                  : 'Unlimited Premium Access'}
              </p>
            </div>
          </div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32 grid grid-cols-1 md:grid-cols-2 gap-4">
        {loadingChapters ? (
          Array.from({ length: 6 }).map((_, i) => <ChapterCardSkeleton key={i} />)
        ) : (
          allChapters.map((ch, idx) => {
            const isComingSoon = (ch.seq_count || 0) === 0;
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
                    ? 'border-orange-500 bg-orange-500/5 shadow-xl shadow-orange-500/10' 
                    : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-orange-500/30 hover:bg-orange-500/5'
                }`}
              >
                {isComingSoon && (
                  <div className="absolute top-2 right-2 z-20 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                    Coming Soon
                  </div>
                )}

                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                    isSelected ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-muted/50 text-foreground/70'
                  }`}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-sm font-black uppercase italic tracking-tight transition-colors ${
                      isSelected ? 'text-orange-500' : 'text-foreground'
                    }`}>
                      Chapter {ch.chapter_number}
                    </h3>
                    <p className="text-muted-foreground text-xs font-medium truncate">
                      {ch.name}
                    </p>
                  </div>

                  {!isComingSoon && (
                    <div className="flex flex-col items-end shrink-0">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${
                        isSelected ? 'text-orange-500' : 'text-muted-foreground/60'
                      }`}>{ch.seq_count} Qs</span>
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
                className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-2xl shadow-orange-500/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
                size="lg"
              >
                Start Practice
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
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • SEQ Practice System</p>
      </div>
    </MCQPageLayout>
  );
};

export default SEQChapterSelectionPage;
