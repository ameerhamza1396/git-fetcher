// @ts-nocheck
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, ChevronLeft, ChevronRight, FlaskConical, Loader2, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { getFlashcardQuota, recordGeneratedFlashcards } from '@/components/profile/AchievementBadges';
import { useAuth } from '@/hooks/useAuth';
import { CorrectionMCQModal } from './CorrectionMCQModal';
import { FlashcardLimitModal } from './FlashcardLimitModal';
import { buildFallbackCards, refineFlashcardsWithAI } from './personalizationUtils';
import { Flashcard, MistakeChapter } from './types';
import { parseBoldText } from '@/utils/format';

type TitrationProps = {
  weakestChapter: MistakeChapter | null;
};

const FlashcardSkeleton = () => (
  <div className="space-y-3 rounded-3xl border border-border/40 bg-background p-4">
    <div className="flex items-center justify-between">
      <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-10/12 animate-pulse rounded bg-muted" />
      <div className="h-4 w-7/12 animate-pulse rounded bg-muted" />
    </div>
    <div className="rounded-2xl bg-muted/50 p-3">
      <div className="h-3 w-full animate-pulse rounded bg-muted-foreground/20" />
      <div className="mt-2 h-3 w-9/12 animate-pulse rounded bg-muted-foreground/20" />
    </div>
  </div>
);

export const Titration = ({ weakestChapter }: TitrationProps) => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeCard, setActiveCard] = useState(0);
  const [batchIndex, setBatchIndex] = useState(0);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  const [limitDetails, setLimitDetails] = useState({ plan: 'free', limit: 2 });

  const loadFlashcards = async (nextBatch = false) => {
    if (!weakestChapter) return;
    const nextIndex = nextBatch ? batchIndex + 1 : batchIndex;
    const quota = await getFlashcardQuota(user?.id);
    const requestedCount = 5;
    const allowedCount = Math.min(requestedCount, quota.remaining);

    if (allowedCount <= 0) {
      setLimitDetails({ plan: quota.plan, limit: quota.limit });
      setFlashcardModalOpen(false);
      setLimitModalOpen(true);
      return;
    }

    setCardsLoading(true);
    setActiveCard(0);
    setFlashcardModalOpen(true);
    try {
      const cards = await refineFlashcardsWithAI(weakestChapter.attempts, nextIndex, allowedCount);
      const nextCards = cards.length ? cards : buildFallbackCards(weakestChapter.attempts, nextIndex, allowedCount);
      setFlashcards(nextCards);
      await recordGeneratedFlashcards(user?.id, nextCards.length);
      setBatchIndex(nextIndex);
    } catch {
      const nextCards = buildFallbackCards(weakestChapter.attempts, nextIndex, allowedCount);
      setFlashcards(nextCards);
      await recordGeneratedFlashcards(user?.id, nextCards.length);
      setBatchIndex(nextIndex);
    } finally {
      setCardsLoading(false);
    }
  };

  const startCorrectionSession = () => {
    if (!weakestChapter) return;
    setFlashcardModalOpen(false);
    setCorrectionOpen(true);
  };

  const currentCard = flashcards[activeCard];
  const completedCards = flashcards.length > 0 && activeCard >= flashcards.length - 1;

  return (
    <>
      <Card className="overflow-hidden border-border/40 bg-card/80 shadow-sm">
        <CardHeader className="bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-cyan-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary">
                Chapter {weakestChapter?.number} - weakest chapter
              </CardDescription>
              <CardTitle className="mt-1 text-lg font-black uppercase italic leading-tight">
                {weakestChapter?.name}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{weakestChapter?.subjectName} - {weakestChapter?.attempts.length} wrong attempts</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Step 1</p>
              <p className="mt-1 text-sm font-black text-foreground">Flashcard batch</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Step 2</p>
              <p className="mt-1 text-sm font-black text-foreground">Correction MCQs</p>
            </div>
          </div>

          <Button className="h-12 w-full rounded-2xl font-black" onClick={() => loadFlashcards(false)} disabled={cardsLoading || !weakestChapter}>
            {cardsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Build Flashcards
          </Button>

          {flashcards.length > 0 && (
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setFlashcardModalOpen(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              Open Current Batch
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={flashcardModalOpen} onOpenChange={setFlashcardModalOpen}>
        <DialogContent className="max-w-2xl overflow-hidden rounded-3xl border-border/40 p-0">
          <DialogHeader className="border-b border-border/40 bg-background px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <BookOpen className="h-5 w-5 text-primary" />
              {weakestChapter?.name}
            </DialogTitle>
            <DialogDescription>
              Batch {batchIndex + 1} - {flashcards.length || 5} flashcards for this chapter.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4">
            {cardsLoading ? (
              <FlashcardSkeleton />
            ) : currentCard ? (
              <div className="space-y-3">
                <div className="rounded-3xl border border-border/40 bg-background p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <Badge variant="secondary">{activeCard + 1}/{flashcards.length}</Badge>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <Sparkles className="h-3 w-3" />
                      {currentCard.source}
                    </span>
                  </div>
                  <p className="text-sm font-black text-foreground">{currentCard.front}</p>
                  <div className="mt-4 rounded-2xl bg-muted/60 p-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">{parseBoldText(currentCard.back)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" disabled={activeCard === 0} onClick={() => setActiveCard(index => Math.max(0, index - 1))}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Previous
                  </Button>
                  <Button className="rounded-xl" disabled={completedCards} onClick={() => setActiveCard(index => Math.min(flashcards.length - 1, index + 1))}>
                    Next
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>

                {completedCards && (
                  <div className="grid grid-cols-1 gap-2">
                    <Button className="rounded-xl" onClick={() => loadFlashcards(true)} disabled={cardsLoading}>
                      {cardsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Load Next Batch
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={startCorrectionSession}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Continue Correcting MCQs
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Button className="h-12 w-full rounded-2xl font-black" onClick={() => loadFlashcards(false)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Build Flashcards
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FlashcardLimitModal
        open={limitModalOpen}
        onOpenChange={setLimitModalOpen}
        plan={limitDetails.plan}
        limit={limitDetails.limit}
        onUpgrade={() => {
          setLimitModalOpen(false);
          navigate('/pricing');
        }}
      />

      <CorrectionMCQModal
        open={correctionOpen}
        chapter={weakestChapter}
        onOpenChange={setCorrectionOpen}
      />
    </>
  );
};
