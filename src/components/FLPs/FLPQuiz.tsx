import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, ChevronLeft, PanelLeft, Clock, Menu } from 'lucide-react';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FLPResults } from '@/components/FLPResults';

// Define the MCQ type (should match your database schema for 'mcqs' table)
interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  chapter_id: string;
}

// Define the ShuffledMCQ type for internal use
interface ShuffledMCQ extends Omit<MCQ, 'options'> {
  shuffledOptions: string[];
  originalCorrectIndex: number;
}

// Define type for storing quiz results
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
}

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const FLPQuiz = ({ mcqs, onFinish, timePerQuestion = 60 }: FLPQuizProps) => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
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
  const [unattemptedCount, setUnattemptedCount] = useState(0);

  // New state for the desktop left panel
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Placeholder for userPlan
  const userPlan = 'premium';

  // New, more professional color palette
  const planColors = {
    'free': {
      light: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      dark: 'dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-700'
    },
    'premium': {
      light: 'bg-orange-100 text-orange-800 border-orange-300',
      dark: 'dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-700'
    },
    'pro': {
      light: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      dark: 'dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-700'
    },
    'default': {
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  const getPlanBadgeClasses = (plan: string) => {
    const colors = planColors[plan as keyof typeof planColors] || planColors.default;
    return `${colors.light} ${colors.dark}`;
  };

  const totalQuestions = shuffledMcqs.length;
  const totalTestTime = totalQuestions * timePerQuestion;

  useEffect(() => {
    if (mcqs && mcqs.length > 0) {
      const initialShuffled = mcqs.map(mcq => {
        const shuffledOptions = shuffleArray(mcq.options);
        const newCorrectIndex = shuffledOptions.indexOf(mcq.correct_answer);
        return {
          ...mcq,
          shuffledOptions,
          originalCorrectIndex: newCorrectIndex
        };
      });
      setShuffledMcqs(initialShuffled);

      const initialUserAnswers: Record<string, string | null> = {};
      initialShuffled.forEach(mcq => {
        initialUserAnswers[mcq.id] = null;
      });
      setUserAnswers(initialUserAnswers);

      setCurrentQuestionIndex(0);
      setIsQuizEnded(false);
      setCurrentTestResultId(null);
      setTotalTimeLeft(totalTestTime);
    }
  }, [mcqs, timePerQuestion, totalTestTime]);

  useEffect(() => {
    if (totalTimeLeft <= 0 && !isQuizEnded && totalQuestions > 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      submitTestToSupabase(true);
      return;
    }

    if (isQuizEnded || totalQuestions === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTotalTimeLeft(prevTime => prevTime - 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [totalTimeLeft, isQuizEnded, totalQuestions]);

  const currentMCQ = shuffledMcqs[currentQuestionIndex];

  const handleOptionSelect = (mcqId: string, selectedOption: string) => {
    if (isQuizEnded) return;
    setUserAnswers(prevAnswers => ({
      ...prevAnswers,
      [mcqId]: selectedOption
    }));
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prevIndex => prevIndex - 1);
    }
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setIsDrawerOpen(false);
  };

  const isQuestionAnswered = (mcqId: string) => {
    return userAnswers[mcqId] !== null && userAnswers[mcqId] !== undefined;
  };

  const countUnattempted = () => {
    if (!shuffledMcqs) return 0;
    return shuffledMcqs.filter(mcq => !isQuestionAnswered(mcq.id)).length;
  };

  const submitTestToSupabase = async (autoSubmit: boolean = false) => {
    if (!user || !shuffledMcqs || isQuizEnded) {
      console.error("User not logged in, questions not loaded, or quiz already ended. Cannot submit test.");
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let finalScore = 0;
    const questionsAttemptDetails: QuizResultForDb[] = [];

    shuffledMcqs.forEach(mcq => {
      const userAnswer = userAnswers[mcq.id] || null;
      const isCorrect = userAnswer === mcq.correct_answer;

      if (isCorrect) {
        finalScore++;
      }

      questionsAttemptDetails.push({
        mcq_id: mcq.id,
        selectedAnswer: userAnswer,
        isCorrect: isCorrect,
        timeTaken: 0
      });
    });

    const flpTestConfigId = 'flp_weekly_test_id';

    const resultData = {
      user_id: user.id,
      username: user.email ? user.email.split('@')[0] : 'unknown',
      score: finalScore,
      total_questions: totalQuestions,
      completed_at: new Date().toISOString(),
      test_config_id: flpTestConfigId,
      question_attempts: questionsAttemptDetails,
    };

    try {
      const { error: deleteError } = await (supabase as any)
        .from('flp_user_attempts')
        .delete()
        .eq('user_id', user.id)
        .eq('test_config_id', flpTestConfigId);

      if (deleteError) {
        console.error('Error deleting previous FLP attempts:', deleteError.message);
      }

      const { data: insertedResult, error: insertError } = await (supabase as any)
        .from('flp_user_attempts')
        .insert([resultData])
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      const newTestResultId = (insertedResult as any).id;
      setCurrentTestResultId(newTestResultId);
      setIsQuizEnded(true);
      toast({
        title: autoSubmit ? "Time's Up! Test Submitted." : "Test Submitted!",
        description: `You scored ${finalScore}/${totalQuestions}.`,
        duration: 3000,
      });

      navigate(`/results/flp/${newTestResultId}`);

    } catch (err: any) {
      console.error('Error during FLP test submission to Supabase:', err.message);
      toast({
        title: "Submission Error",
        description: `An unexpected error occurred: ${err.message}`,
        variant: "destructive",
      });
      setIsQuizEnded(false);
    }
  };

  const handleSubmitTest = () => {
    const unattempted = countUnattempted();
    if (unattempted > 0) {
      setUnattemptedCount(unattempted);
      setShowUnattemptedDialog(true);
    } else {
      submitTestToSupabase();
    }
  };

  const handleConfirmSubmission = () => {
    setShowUnattemptedDialog(false);
    submitTestToSupabase();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isQuizEnded && currentTestResultId) {
    return <FLPResults />;
  }

  if (shuffledMcqs.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0 min-h-[50vh] flex items-center justify-center">
        <CardContent className="text-center py-6 sm:py-8 flex flex-col items-center justify-center h-full">
          <div className="flex justify-center items-end h-24 space-x-2">
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-4">Preparing your Full-Length Paper...</p>
        </CardContent>
      </Card>
    );
  }

  const displayUsername = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-slate-50 to-indigo-50 dark:bg-gradient-to-br dark:from-gray-950 dark:via-slate-950/50 dark:to-indigo-950/50 flex flex-col">
      {/* Header */}
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
            <div className="container mx-auto px-4 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* Toggle Panel Button for Desktop */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="hidden lg:block"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className="w-10 h-10 p-0"
              >
                <Menu className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </Button>
            </motion.div>

            {/* Mobile Drawer Trigger */}
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 flex flex-col">
                <SheetHeader>
                  <SheetTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Question Map</SheetTitle>
                </SheetHeader>
                <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {shuffledMcqs.map((mcq, index) => (
                      <Button
                        key={mcq.id}
                        variant="outline"
                        className={`
                          w-full h-12 rounded-lg text-lg font-semibold transition-all duration-200 ease-in-out
                          ${currentQuestionIndex === index
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                            : isQuestionAnswered(mcq.id)
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }
                        `}
                        onClick={() => goToQuestion(index)}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    <p className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mr-2"></span>Current Question</p>
                    <p className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>Answered</p>
                    <p className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 mr-2"></span>Unanswered</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/dashboard" className="text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors hidden lg:inline-flex items-center font-bold text-xl">
              <ChevronLeft className="w-5 h-5 mr-2" />
              Full-Length Paper
            </Link>
            <span className="text-xl font-bold text-gray-900 dark:text-white lg:hidden">Full-Length Paper</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Timer Display */}
            <div className="flex items-center space-x-1 font-semibold text-lg text-gray-800 dark:text-gray-200 min-w-[80px]">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{formatTime(totalTimeLeft)}</span>
            </div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-9 h-9 p-0"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-slate-700" />
                )}
              </Button>
            </motion.div>
            {userPlan && (
              <Badge className={`hidden sm:block text-xs font-semibold ${getPlanBadgeClasses(userPlan)}`}>
                {userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} Plan
              </Badge>
            )}
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        {/* Animated Desktop Panel */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 fixed top-16 h-[calc(100vh-64px)]"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Question Map</h2>
              </div>
              <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-4 gap-3 mb-6">
                  {shuffledMcqs.map((mcq, index) => (
                    <motion.div
                      key={mcq.id}
                      whileHover={{ scale: 1.05, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        className={`
                          w-full h-12 rounded-lg text-lg font-semibold transition-all duration-200 ease-in-out
                          ${currentQuestionIndex === index
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-105'
                            : isQuestionAnswered(mcq.id)
                              ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }
                        `}
                        onClick={() => goToQuestion(index)}
                      >
                        {index + 1}
                      </Button>
                    </motion.div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <p className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mr-2"></span>Current Question</p>
                  <p className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-emerald-500 mr-2"></span>Answered</p>
                  <p className="flex items-center"><span className="inline-block w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 mr-2"></span>Unanswered</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-grow container mx-auto px-4 lg:px-8 py-8 flex flex-col items-center overflow-y-auto h-full pt-[calc(75px+env(safe-area-inset-top))] overscroll-y-contain">
          <motion.h1
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-3xl md:text-4xl font-extrabold mb-4 text-gray-900 dark:text-white text-center flex items-center justify-center"
          >
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medmacs Logo"
              className="w-12 h-12 object-contain mr-3"
            />
            Full-Length Paper
          </motion.h1>
          <motion.p
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center font-medium"
          >
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </motion.p>

          <AnimatePresence mode="wait">
            {currentMCQ && (
              <motion.div
                key={currentMCQ.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-2xl"
              >
                <Card className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl text-gray-900 dark:text-white"></CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-800 dark:text-gray-200 text-lg mb-6 font-semibold leading-relaxed">{currentMCQ.question}</p>
                    <div className="space-y-4">
                      {currentMCQ.shuffledOptions.map((option, idx) => (
                        <motion.div
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx * 0.05 }}
                        >
                          <Button
                            variant="outline"
                            className={`
                              w-full justify-start text-left py-4 px-6 rounded-xl font-medium text-base
                              ${userAnswers[currentMCQ.id] === option
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-transparent shadow-lg'
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
                              }
                            `}
                            onClick={() => handleOptionSelect(currentMCQ.id, option)}
                          >
                            {option}
                          </Button>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between items-center mt-6">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={goToPreviousQuestion}
                        disabled={currentQuestionIndex === 0}
                        variant="outline"
                        className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" /> Previous
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      {currentQuestionIndex < totalQuestions - 1 ? (
                        <Button
                          onClick={goToNextQuestion}
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-md"
                        >
                          Next Question
                          <ChevronLeft className="w-4 h-4 ml-2 rotate-180" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleSubmitTest}
                          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-md"
                        >
                          Finish Test
                        </Button>
                      )}
                    </motion.div>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-lg font-semibold text-gray-700 dark:text-gray-300 animate-fade-in"
          >
            Best of luck, <span className="text-indigo-600 dark:text-indigo-400">{displayUsername}</span>!
          </motion.p>
        </main>
      </div>

      {/* Confirmation Dialog for Unattempted Questions */}
      <AlertDialog open={showUnattemptedDialog} onOpenChange={setShowUnattemptedDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Unattempted Questions</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-700 dark:text-gray-300">
              You have {unattemptedCount} question(s) unattempted. Are you sure you want to submit the test?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              Go Back to Test
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmission}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
            >
              Submit Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};