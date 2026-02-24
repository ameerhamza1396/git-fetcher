import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  <Card className="border-2 h-full animate-pulse overflow-hidden relative border-border bg-muted/50">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-shimmer"
      style={{ animationDuration: '1.5s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}></div>
    <CardHeader className="px-4 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-muted"></div>
          <div>
            <div className="h-4 bg-muted rounded w-24 mb-1"></div>
            <div className="h-3 bg-muted rounded w-16"></div>
          </div>
        </div>
        <div className="h-3 bg-muted rounded w-10"></div>
      </div>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className="h-3 bg-muted rounded w-full mb-1"></div>
      <div className="h-3 bg-muted rounded w-5/6"></div>
    </CardContent>
  </Card>
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
  const { user } = useAuth();

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

  const numberOfSkeletons = 6;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 pb-24">
      <div className="text-center mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
          Select Test – {subject.name}
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          {userProfile?.plan === 'free'
            ? 'All tests are unlocked. Free users have a daily limit of MCQ submissions.'
            : 'You have unlimited access to all tests and MCQs.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {loading
          ? Array.from({ length: numberOfSkeletons }).map((_, index) => (
            <ChapterCardSkeleton key={index} />
          ))
          : allChapters.map((ch, idx) => (
            <motion.div
              key={ch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full cursor-pointer"
              onClick={() => setSelectedChapter(ch)}
            >
              <Card
                className={`border-2 h-full transition duration-300 ease-in-out
                  ${selectedChapter?.id === ch.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  } bg-card/80 backdrop-blur-sm`}
              >
                <CardHeader className="px-4 py-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-foreground">
                          Practice test {ch.chapter_number}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          {ch.name}
                        </CardDescription>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ch.mcq_count || 0} Qs
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">
                    {ch.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
      </div>

      {/* Fixed bottom continue button */}
      {selectedChapter && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <Button
            onClick={handleContinue}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg hover:scale-[1.01] transition-all duration-300"
            size="lg"
          >
            Continue with {selectedChapter.name}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};
