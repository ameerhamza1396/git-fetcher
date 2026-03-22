import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import { fetchChaptersBySubject, Chapter, Subject } from '@/utils/mcqData';
import { useAuth } from '@/hooks/useAuth';

interface ChapterSelectionScreenProps {
  subject: Subject;
  onChapterSelect: (chapter: Chapter) => void;
  onBack: () => void;
  userProfile: { plan: 'free' | 'premium' | 'iconic' } | null | undefined;
}

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

export const ChapterSelectionScreen = ({
  subject,
  onChapterSelect,
  onBack,
  userProfile
}: ChapterSelectionScreenProps) => {
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  const handleContinue = () => {
    if (selectedChapter) onChapterSelect(selectedChapter);
  };

  useEffect(() => {
    const loadChapters = async () => {
      setLoading(true);
      const fetched = await fetchChaptersBySubject(subject.id);
      setAllChapters(fetched);
      setLoading(false);
    };
    loadChapters();
  }, [subject, userProfile]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block">Step 2 of 3</span>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none">
          Select <span className="text-primary">Chapter</span>
        </h2>
        <div className="mt-4 flex flex-col items-center gap-2">
           <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">{subject.name}</p>
           <p className="text-muted-foreground/60 text-[10px] font-medium uppercase tracking-[0.2em]">
            {userProfile?.plan === 'free'
              ? 'Free daily limits apply'
              : 'Unlimited Premium Access'}
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="flex flex-col items-end shrink-0">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${
                         isSelected ? 'text-primary' : 'text-muted-foreground/60'
                       }`}>{ch.mcq_count} Qs</span>
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
            className="fixed bottom-0 left-0 right-0 p-6 z-50 flex justify-center pointer-events-none"
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
    </div>
  );
};
