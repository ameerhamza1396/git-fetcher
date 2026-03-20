import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { ChevronLeft, PanelLeft, Clock, Menu } from 'lucide-react';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FLPResults } from '@/components/FLPResults';
import { Capacitor } from '@capacitor/core';

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  chapter_id: string;
}

interface ShuffledMCQ extends Omit<MCQ, 'options'> {
  shuffledOptions: string[];
  originalCorrectIndex: number;
}

interface QuizResultForDb {
  mcq_id: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeTaken: number;
}

interface FLPQuizProps {
  mcqs: MCQ[];
  onFinish: (score: number, totalQuestions: number) => void;
  timePerQuestion?: number;
  subjectName?: string;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const FLPQuiz = ({ mcqs, onFinish, timePerQuestion = 60, subjectName }: FLPQuizProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [shuffledMcqs, setShuffledMcqs] = useState<ShuffledMCQ[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | null>>({});
  const [totalTimeLeft, setTotalTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isQuizEnded, setIsQuizEnded] = useState(false);
  const [currentTestResultId, setCurrentTestResultId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showUnattemptedDialog, setShowUnattemptedDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [unattemptedCount, setUnattemptedCount] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const lastScrollY = useRef(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  const totalQuestions = shuffledMcqs.length;
  const totalTestTime = totalQuestions * timePerQuestion;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHeaderVisible(currentScrollY < lastScrollY.current || currentScrollY < 10);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Capacitor back button handler
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle: any = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('backButton', () => {
        setShowLeaveDialog(true);
      }).then(handle => { listenerHandle = handle; });
    });
    return () => { listenerHandle?.remove?.(); };
  }, []);

  // FLP localStorage progress save
  const FLP_PROGRESS_KEY = 'flp_in_progress';
  
  const saveFLPProgress = () => {
    if (isQuizEnded || shuffledMcqs.length === 0) return;
    const progress = {
      mcqIds: shuffledMcqs.map(m => m.id),
      userAnswers,
      currentQuestionIndex,
      totalTimeLeft,
      subjectName,
      timestamp: Date.now()
    };
    localStorage.setItem(FLP_PROGRESS_KEY, JSON.stringify(progress));
  };

  const clearFLPProgress = () => {
    localStorage.removeItem(FLP_PROGRESS_KEY);
  };

  // Save progress on every answer change and question navigation
  useEffect(() => {
    if (shuffledMcqs.length > 0 && !isQuizEnded) {
      saveFLPProgress();
    }
  }, [userAnswers, currentQuestionIndex, totalTimeLeft, shuffledMcqs.length, isQuizEnded]);

  useEffect(() => {
    if (mcqs && mcqs.length > 0) {
      const initialShuffled = mcqs.map(mcq => {
        const shuffledOptions = shuffleArray(mcq.options);
        const newCorrectIndex = shuffledOptions.indexOf(mcq.correct_answer);
        return { ...mcq, shuffledOptions, originalCorrectIndex: newCorrectIndex };
      });
      setShuffledMcqs(initialShuffled);
      const initialUserAnswers: Record<string, string | null> = {};
      initialShuffled.forEach(mcq => { initialUserAnswers[mcq.id] = null; });
      setUserAnswers(initialUserAnswers);
      setCurrentQuestionIndex(0);
      setIsQuizEnded(false);
      setCurrentTestResultId(null);
      setTotalTimeLeft(totalTestTime);
    }
  }, [mcqs, timePerQuestion, totalTestTime]);

  useEffect(() => {
    if (totalTimeLeft <= 0 && !isQuizEnded && totalQuestions > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      submitTestToSupabase(true);
      return;
    }
    if (isQuizEnded || totalQuestions === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => { setTotalTimeLeft(prevTime => prevTime - 1); }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [totalTimeLeft, isQuizEnded, totalQuestions]);

  const currentMCQ = shuffledMcqs[currentQuestionIndex];
  const handleOptionSelect = (mcqId: string, selectedOption: string) => {
    if (isQuizEnded) return;
    setUserAnswers(prev => ({ ...prev, [mcqId]: selectedOption }));
  };
  const goToNextQuestion = () => { if (currentQuestionIndex < totalQuestions - 1) setCurrentQuestionIndex(prev => prev + 1); };
  const goToPreviousQuestion = () => { if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1); };
  const goToQuestion = (index: number) => { setCurrentQuestionIndex(index); setIsDrawerOpen(false); };
  const isQuestionAnswered = (mcqId: string) => userAnswers[mcqId] !== null && userAnswers[mcqId] !== undefined;
  const countUnattempted = () => shuffledMcqs ? shuffledMcqs.filter(mcq => !isQuestionAnswered(mcq.id)).length : 0;

  const submitTestToSupabase = async (autoSubmit: boolean = false) => {
    if (!user || !shuffledMcqs || isQuizEnded) return;
    if (timerRef.current) clearInterval(timerRef.current);
    let finalScore = 0;
    const questionsAttemptDetails: QuizResultForDb[] = [];
    shuffledMcqs.forEach(mcq => {
      const userAnswer = userAnswers[mcq.id] || null;
      const isCorrect = userAnswer === mcq.correct_answer;
      if (isCorrect) finalScore++;
      questionsAttemptDetails.push({ mcq_id: mcq.id, selectedAnswer: userAnswer, isCorrect, timeTaken: 0 });
    });
    const flpTestConfigId = 'flp_weekly_test_id';
    const resultData = { user_id: user.id, username: user.email ? user.email.split('@')[0] : 'unknown', score: finalScore, total_questions: totalQuestions, completed_at: new Date().toISOString(), test_config_id: flpTestConfigId, question_attempts: questionsAttemptDetails };
    try {
      await (supabase as any).from('flp_user_attempts').delete().eq('user_id', user.id).eq('test_config_id', flpTestConfigId);
      const { data: insertedResult, error: insertError } = await (supabase as any).from('flp_user_attempts').insert([resultData]).select('id').single();
      if (insertError) throw insertError;
      setCurrentTestResultId((insertedResult as any).id);
      setIsQuizEnded(true);
      toast({ title: autoSubmit ? "Time's Up! Test Submitted." : "Test Submitted!", description: `You scored ${finalScore}/${totalQuestions}.`, duration: 3000 });
      navigate(`/results/flp/${(insertedResult as any).id}`);
    } catch (err: any) {
      toast({ title: "Submission Error", description: err.message, variant: "destructive" });
      setIsQuizEnded(false);
    }
  };

  const handleSubmitTest = () => {
    const unattempted = countUnattempted();
    if (unattempted > 0) { setUnattemptedCount(unattempted); setShowUnattemptedDialog(true); }
    else submitTestToSupabase();
  };
  const handleConfirmSubmission = () => { setShowUnattemptedDialog(false); submitTestToSupabase(); };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isQuizEnded && currentTestResultId) return <FLPResults />;

  if (shuffledMcqs.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-16 h-16 animate-pulse" />
          <p className="text-sm text-muted-foreground font-medium">Preparing your Full-Length Paper...</p>
        </div>
      </div>
    );
  }

  const displayUsername = user?.email ? user.email.split('@')[0] : 'User';

  // Question map grid component
  const QuestionMapGrid = () => (
    <>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {shuffledMcqs.map((mcq, index) => (
          <Button key={mcq.id} variant="outline" size="sm"
            className={`w-full h-10 rounded-xl text-sm font-bold transition-all ${
              currentQuestionIndex === index
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-lg'
                : isQuestionAnswered(mcq.id)
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                  : 'bg-muted text-muted-foreground'
            }`}
            onClick={() => goToQuestion(index)}>
            {index + 1}
          </Button>
        ))}
      </div>
      <div className="mt-4 text-xs text-muted-foreground space-y-1.5">
        <p className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mr-2" />Current</p>
        <p className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2" />Answered</p>
        <p className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-muted mr-2" />Unanswered</p>
      </div>
    </>
  );

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950 flex flex-col overflow-y-auto">
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-7xl">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="hidden lg:flex w-9 h-9 p-0" onClick={() => setIsPanelOpen(!isPanelOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden w-9 h-9 p-0">
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px] p-6 flex flex-col">
                <SheetHeader><SheetTitle className="text-lg font-black">Question Map</SheetTitle></SheetHeader>
                <div className="flex-grow overflow-y-auto mt-4"><QuestionMapGrid /></div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
              <span className="text-lg font-black hidden sm:inline">Full-Length Paper</span>
              <span className="text-lg font-black sm:hidden">FLP</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="flex flex-grow">
        {/* Desktop Panel */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div initial={{ x: -256 }} animate={{ x: 0 }} exit={{ x: -256 }} transition={{ duration: 0.3 }}
              className="hidden lg:flex flex-col w-64 bg-background border-r border-border flex-shrink-0 fixed top-0 pt-[calc(env(safe-area-inset-top)+60px)] h-screen z-40">
              <div className="p-4 border-b border-border">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Question Map</h2>
              </div>
              <div className="flex-grow overflow-y-auto p-4"><QuestionMapGrid /></div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className={`flex-grow flex flex-col items-center px-4 py-8 mt-[var(--header-height)] pb-[env(safe-area-inset-bottom)] overflow-y-auto ${isPanelOpen ? 'lg:ml-64' : ''}`}>
          <div className="text-center mb-6 space-y-1">
            {subjectName && (
              <p className="text-primary text-xs uppercase tracking-[0.2em] font-bold">{subjectName}</p>
            )}
            <p className="text-foreground text-lg font-black">Question {currentQuestionIndex + 1} <span className="text-muted-foreground font-medium text-sm">of {totalQuestions}</span></p>
          </div>

          <AnimatePresence mode="wait">
            {currentMCQ && (
              <motion.div key={currentMCQ.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="w-full max-w-2xl">
                {/* Question Card */}
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-2xl p-1">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                  <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10">
                    {/* Timer inside question box */}
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Clock className="w-4 h-4 text-white/70" />
                      <span className={`text-lg font-black ${totalTimeLeft < 60 ? 'text-red-300 animate-pulse' : 'text-white'}`}>{formatTime(totalTimeLeft)}</span>
                    </div>

                    <p className="text-base sm:text-lg leading-relaxed font-semibold mb-6">{currentMCQ.question}</p>

                    <div className="space-y-3">
                      {currentMCQ.shuffledOptions.map((option, idx) => (
                        <motion.div key={idx} whileTap={{ scale: 0.98 }}>
                          <button
                            className={`w-full text-left py-3 px-4 rounded-xl font-medium text-sm transition-all break-words whitespace-normal ${
                              userAnswers[currentMCQ.id] === option
                                ? 'bg-white text-slate-900 shadow-lg'
                                : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                            }`}
                            onClick={() => handleOptionSelect(currentMCQ.id, option)}>
                            {option}
                          </button>
                        </motion.div>
                      ))}
                    </div>

                    {/* Navigation inside card */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                      <Button onClick={goToPreviousQuestion} disabled={currentQuestionIndex === 0} variant="ghost" className="text-white hover:bg-white/10 disabled:opacity-30">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      {currentQuestionIndex < totalQuestions - 1 ? (
                        <Button onClick={goToNextQuestion} className="bg-white text-slate-900 hover:bg-white/90 rounded-xl font-bold text-xs uppercase">
                          Next <ChevronLeft className="w-4 h-4 ml-1 rotate-180" />
                        </Button>
                      ) : (
                        <Button onClick={handleSubmitTest} className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold text-xs uppercase">
                          Finish Test
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center space-y-0.5">
            <p className="text-muted-foreground/50 text-xs uppercase tracking-widest font-medium">Best of luck</p>
            <p className="text-foreground/70 text-sm font-bold truncate max-w-[200px] mx-auto">{displayUsername}</p>
          </div>
        </main>
      </div>

      <AlertDialog open={showUnattemptedDialog} onOpenChange={setShowUnattemptedDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Unattempted Questions</AlertDialogTitle>
            <AlertDialogDescription>You have {unattemptedCount} question(s) unattempted. Are you sure you want to submit?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmission} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">Submit Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};