// @ts-nocheck
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Lock, RotateCcw, Sparkles, Target, XCircle } from 'lucide-react';
import { fetchReferenceSnippet } from './personalizationUtils';
import { MistakeChapter, MistakeSubject, WrongAttempt } from './types';

type MistakeBookProps = {
  subjects: MistakeSubject[];
  isPremium: boolean;
};

export const MistakeBook = ({ subjects, isPremium }: MistakeBookProps) => {
  const navigate = useNavigate();
  const [activeChapter, setActiveChapter] = useState<MistakeChapter | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiExplainTarget, setAiExplainTarget] = useState<WrongAttempt | null>(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const activeAttempt = activeChapter?.attempts[activeIndex];

  const openChapter = (chapter: MistakeChapter) => {
    setActiveChapter(chapter);
    setActiveIndex(0);
  };

  const goToAttempt = (direction: 1 | -1) => {
    if (!activeChapter) return;
    setActiveIndex(index => Math.min(activeChapter.attempts.length - 1, Math.max(0, index + direction)));
  };

  const startCorrectionSession = (chapter = activeChapter) => {
    if (!chapter) return;
    navigate(`/mcqs/quiz/${chapter.subjectId}/${chapter.id}?mode=mistakes&timer=false`, {
      state: { wrongMcqIds: chapter.attempts.map((attempt: WrongAttempt) => attempt.mcq.id) },
    });
  };

  const loadAiExplanation = async (attempt: WrongAttempt) => {
    if (!isPremium) return;
    setAiExplainTarget(attempt);
    setAiExplanation('');
    setAiLoading(true);
    try {
      const reference = await fetchReferenceSnippet(attempt.mcq.question);
      const response = await fetch('https://medmacs.app/api/ai/study-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Explain this wrong MCQ attempt positively and concisely for revision.
Question: ${attempt.mcq.question}
User selected: ${attempt.selectedAnswer}
Correct answer: ${attempt.mcq.correctAnswer}
Existing explanation: ${attempt.mcq.explanation || 'None'}
Book reference: ${reference || 'No reference retrieved'}
Avoid negative language. End with one memory hook.`,
        }),
      });
      if (!response.ok) throw new Error('AI explanation failed');
      const data = await response.json();
      setAiExplanation(data.answer || 'Explanation generated, but no text was returned.');
    } catch {
      setAiExplanation(attempt.mcq.explanation || `Correct answer: ${attempt.mcq.correctAnswer}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-20 grid grid-cols-1 md:grid-cols-2 gap-4">
        {subjects.flatMap(subject => subject.chapters.map((chapter, index) => (
          <motion.button
            key={chapter.id}
            type="button"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => openChapter({ ...chapter, subjectName: subject.name })}
            className="group relative overflow-hidden rounded-2xl border-2 border-border/40 bg-white/5 p-4 text-left transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 dark:bg-zinc-900/50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 transition-all group-hover:bg-primary group-hover:text-white">
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Chapter {chapter.number} - {subject.name}</p>
                <h3 className="truncate text-base font-black uppercase italic tracking-tight text-foreground">
                  {chapter.name}
                </h3>
                <p className="truncate text-xs font-medium text-muted-foreground">{chapter.attempts.length} marked MCQs</p>
              </div>
              <div className="shrink-0 text-right">
                <Badge className="border-0 bg-rose-500/10 text-rose-600 dark:text-rose-300">{chapter.attempts.length}</Badge>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">MCQs</p>
              </div>
            </div>
          </motion.button>
        )))}
      </div>

      <Dialog open={!!activeChapter} onOpenChange={(open) => !open && setActiveChapter(null)}>
        <DialogContent className="max-w-2xl overflow-hidden rounded-3xl border-border/40 p-0">
          <DialogHeader className="border-b border-border/40 bg-background px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <BookOpen className="h-5 w-5 text-primary" />
              {activeChapter?.name}
            </DialogTitle>
            <DialogDescription>
              Chapter {activeChapter?.number} - swipe to review marked answers.
            </DialogDescription>
          </DialogHeader>

          {activeAttempt && (
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <Badge variant="secondary">{activeIndex + 1}/{activeChapter?.attempts.length}</Badge>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{activeChapter?.subjectName}</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeAttempt.id}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.16}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -45 || info.velocity.x < -350) goToAttempt(1);
                    if (info.offset.x > 45 || info.velocity.x > 350) goToAttempt(-1);
                  }}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-3xl border border-border/40 bg-card p-4 shadow-sm"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Mistake Book MCQ</p>
                  <h3 className="mt-2 text-base font-black leading-relaxed text-foreground">{activeAttempt.mcq.question}</h3>

                  <div className="mt-4 grid gap-2">
                    <div className="rounded-2xl bg-red-500/10 p-3 ring-1 ring-red-500/15">
                      <div className="mb-1 flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-700 dark:text-red-300">Marked Answer</p>
                      </div>
                      <p className="text-sm font-bold text-red-700 dark:text-red-200">{activeAttempt.selectedAnswer}</p>
                    </div>
                    <div className="rounded-2xl bg-emerald-500/10 p-3 ring-1 ring-emerald-500/15">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Correct Answer</p>
                      <p className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-200">{activeAttempt.mcq.correctAnswer}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-muted/50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Explanation</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground">{activeAttempt.mcq.explanation || 'No explanation provided.'}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="rounded-xl"
                      variant={isPremium ? 'default' : 'secondary'}
                      disabled={!isPremium}
                      onClick={() => loadAiExplanation(activeAttempt)}
                    >
                      {isPremium ? <Sparkles className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                      AI Explain
                    </Button>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => startCorrectionSession()}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Correct Chapter
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-xl" disabled={activeIndex === 0} onClick={() => goToAttempt(-1)}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button className="rounded-xl" disabled={!activeChapter || activeIndex === activeChapter.attempts.length - 1} onClick={() => goToAttempt(1)}>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!aiExplainTarget} onOpenChange={(open) => !open && setAiExplainTarget(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Explain
            </DialogTitle>
            <DialogDescription>Premium revision for this mistake-book MCQ.</DialogDescription>
          </DialogHeader>
          {aiLoading ? (
            <div className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Dr Ahroid is preparing the explanation.
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {aiExplanation}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
