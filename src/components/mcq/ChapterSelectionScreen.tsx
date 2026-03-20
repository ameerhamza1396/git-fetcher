import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 shadow-2xl p-1 animate-pulse">
    <div className="bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-5 border border-white/10 h-20" />
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

  useEffect(() => {
    const loadChapters = async () => {
      setLoading(true);
      const fetched = await fetchChaptersBySubject(subject.id);
      setAllChapters(fetched);
      setLoading(false);
    };
    loadChapters();
  }, [subject, userProfile]);

  const handleContinue = () => {
    if (selectedChapter) onChapterSelect(selectedChapter);
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase italic">
          Select <span className="text-primary">Test</span>
        </h2>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">{subject.name}</p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          {userProfile?.plan === 'free'
            ? 'Free users have a daily limit of MCQ submissions.'
            : 'Unlimited access to all tests.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <ChapterCardSkeleton key={i} />)
          : allChapters.map((ch, idx) => {
            const hasNoQuestions = !ch.mcq_count || ch.mcq_count === 0;
            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileTap={hasNoQuestions ? {} : { scale: 0.98 }}
                onClick={() => { if (!hasNoQuestions) setSelectedChapter(ch); }}
                className={hasNoQuestions ? 'cursor-not-allowed' : 'cursor-pointer'}
              >
                <div className={`relative overflow-hidden rounded-[1.5rem] p-1 shadow-xl transition-all duration-300 ${
                  hasNoQuestions
                    ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 opacity-50'
                    : selectedChapter?.id === ch.id
                      ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700'
                      : 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600'
                }`}>
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                  }} />

                  <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.3rem] px-4 py-3.5 border border-white/10 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0 border border-white/20">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white">Practice Test {ch.chapter_number}</h3>
                      <p className="text-white/50 text-xs truncate">{hasNoQuestions ? 'Coming Soon' : ch.name}</p>
                    </div>
                    <span className="text-white/40 text-xs font-bold flex-shrink-0">
                      {hasNoQuestions ? 'Coming Soon' : `${ch.mcq_count} Qs`}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
      </div>

      {selectedChapter && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.01] transition-all rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl"
            size="lg"
          >
            Continue with {selectedChapter.name}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Footer */}
      <div className="text-center pt-6 pb-4">
        <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
      </div>
    </div>
  );
};
