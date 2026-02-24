// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Timer, Bot, MessageSquare, X, Bookmark, BookmarkCheck, Crown, LogOut, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { fetchMCQsByChapter, MCQ } from '@/utils/mcqData';
import { supabase } from '@/integrations/supabase/client';
import { AIChatbot } from './AIChatbot';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface MCQDisplayProps {
  subject: string;
  chapter: string;
  onBack: () => void;
  timerEnabled?: boolean;
  timePerQuestion?: number;
}

interface ShuffledMCQ extends Omit<MCQ, 'options'> {
  shuffledOptions: string[];
  originalCorrectIndex: number;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const LAST_ATTEMPTED_MCQ_KEY = 'lastAttemptedMCQIndex';
const LAST_ATTEMPTED_SUBJECT_KEY = 'lastAttemptedMCQSubject';
const LAST_ATTEMPTED_CHAPTER_KEY = 'lastAttemptedMCQChapter';

// --- Upgrade Account Modal ---
const UpgradeAccountModal = ({ isOpen, onClose, onUpgradeClick }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[425px] bg-background border-border rounded-2xl">
      <DialogHeader className="text-center">
        <Crown className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
        <DialogTitle className="text-2xl font-bold">Upgrade Your Account</DialogTitle>
        <DialogDescription className="text-muted-foreground mt-2">
          You've reached the daily limit of 50 free MCQ submissions. Upgrade to a premium plan for unlimited practice!
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Maybe Later</Button>
        <Button onClick={onUpgradeClick} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold">Upgrade Now</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// --- Leave Test Confirmation Modal ---
const LeaveTestModal = ({ isOpen, onClose, onConfirm }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="sm:max-w-[400px] bg-background border-border rounded-2xl">
      <DialogHeader className="text-center">
        <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <DialogTitle className="text-xl font-bold">Leave Test?</DialogTitle>
        <DialogDescription className="text-muted-foreground mt-2">
          Your progress has been saved. You can resume from where you left off next time.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button onClick={onClose} variant="outline" className="w-full sm:w-auto">Continue Test</Button>
        <Button onClick={onConfirm} variant="destructive" className="w-full sm:w-auto font-bold">Leave Test</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);


export const MCQDisplay = ({
  subject,
  chapter,
  onBack,
  timerEnabled = false,
  timePerQuestion = 30
}: MCQDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mcqs, setMcqs] = useState<ShuffledMCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [score, setScore] = useState(0);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [showHelpToast, setShowHelpToast] = useState(false);
  const [helpToastMessage, setHelpToastMessage] = useState('');
  const helpToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isCurrentMCQSaved, setIsCurrentMCQSaved] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [dailySubmissionsCount, setDailySubmissionsCount] = useState(0);
  const [lastSubmissionResetDate, setLastSubmissionResetDate] = useState<string | null>(null);

  const helpMessages = [
    "Hey, you look stuck. May I help you?",
    "Things going dude or may I help you?",
    "Hey, I am Dr. Sultan. Tap here to ask me if you need help.",
    "Don't hesitate to ask! Dr. Ahroid is here.",
    "Need a hint? I'm here to assist!",
    "Feeling puzzled? Dr. Ahroid has answers!",
    "Stuck on this one? Let's figure it out together.",
    "I can explain this question further. Just tap me!"
  ];

  const username = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profileForChatbot', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, daily_mcq_submissions, last_submission_reset_date')
        .eq('id', user.id)
        .maybeSingle();
      if (error) { console.error('Error fetching profile for chatbot:', error); return null; }
      return data;
    },
    enabled: !!user?.id
  });

  const userPlanForChatbot = profile?.plan?.toLowerCase() || 'free';

  useEffect(() => {
    if (profile && !profileLoading) {
      setDailySubmissionsCount(profile.daily_mcq_submissions || 0);
      setLastSubmissionResetDate(profile.last_submission_reset_date);
    }
  }, [profile, profileLoading]);

  const isNewDayPKT = (lastResetDateStr: string | null): boolean => {
    if (!lastResetDateStr) return true;
    const now = new Date();
    const nowPKT = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    const today12AMPKT = new Date(nowPKT);
    today12AMPKT.setHours(0, 0, 0, 0);
    const lastResetDateTime = new Date(lastResetDateStr);
    const lastResetDateTimePKT = new Date(lastResetDateTime.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    return lastResetDateTimePKT < today12AMPKT;
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastSubject = localStorage.getItem(LAST_ATTEMPTED_SUBJECT_KEY);
      const lastChapter = localStorage.getItem(LAST_ATTEMPTED_CHAPTER_KEY);
      const lastIndex = localStorage.getItem(LAST_ATTEMPTED_MCQ_KEY);
      if (lastSubject === subject && lastChapter === chapter && lastIndex !== null) {
        const parsedIndex = parseInt(lastIndex, 10);
        if (!isNaN(parsedIndex) && parsedIndex >= 0) setCurrentQuestionIndex(parsedIndex);
      } else {
        localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
        setCurrentQuestionIndex(0);
      }
    }
  }, [subject, chapter]);

  useEffect(() => {
    const loadMCQs = async () => {
      setLoading(true);
      const data = await fetchMCQsByChapter(chapter);
      const shuffledMCQs = data.map(mcq => {
        const shuffledOptions = shuffleArray(mcq.options);
        const newCorrectIndex = shuffledOptions.indexOf(mcq.correct_answer);
        return { ...mcq, shuffledOptions, originalCorrectIndex: newCorrectIndex };
      });
      setMcqs(shuffledMCQs);
      setLoading(false);
    };
    loadMCQs();
  }, [chapter]);

  useEffect(() => {
    if (!loading && mcqs.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(LAST_ATTEMPTED_MCQ_KEY, currentQuestionIndex.toString());
      localStorage.setItem(LAST_ATTEMPTED_SUBJECT_KEY, subject);
      localStorage.setItem(LAST_ATTEMPTED_CHAPTER_KEY, chapter);
    }
  }, [currentQuestionIndex, subject, chapter, loading, mcqs.length]);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!user || !mcqs[currentQuestionIndex]?.id) { setIsCurrentMCQSaved(false); return; }
      try {
        const { data, error } = await supabase.from('saved_mcqs').select('id').eq('user_id', user.id).eq('mcq_id', mcqs[currentQuestionIndex].id).single();
        setIsCurrentMCQSaved(!!data);
        if (error && error.code !== 'PGRST116') console.error('Error checking saved status:', error);
      } catch (error) { console.error('Error checking saved status:', error); setIsCurrentMCQSaved(false); }
    };
    if (!loading && mcqs.length > 0) checkSavedStatus();
  }, [mcqs, currentQuestionIndex, user, loading]);

  useEffect(() => {
    if (helpToastTimerRef.current) clearTimeout(helpToastTimerRef.current);
    setShowHelpToast(false);
    if (user && userPlanForChatbot === 'premium' && !selectedAnswer && !isChatbotOpen) {
      helpToastTimerRef.current = setTimeout(() => {
        if (!selectedAnswer && !isChatbotOpen) {
          setHelpToastMessage(helpMessages[Math.floor(Math.random() * helpMessages.length)]);
          setShowHelpToast(true);
        }
      }, 10000);
    }
    return () => { if (helpToastTimerRef.current) clearTimeout(helpToastTimerRef.current); };
  }, [currentQuestionIndex, selectedAnswer, isChatbotOpen, user, userPlanForChatbot]);

  const currentMCQ = mcqs[currentQuestionIndex];
  const totalQuestions = mcqs.length;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleTimeUp = () => { if (!showExplanation) handleSubmitAnswer(true); };

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answer);
    setShowHelpToast(false);
    if (helpToastTimerRef.current) clearTimeout(helpToastTimerRef.current);
  };

  const handleSubmitAnswer = async (timeUp = false) => {
    if (!currentMCQ || !user) return;
    if (userPlanForChatbot === 'free') {
      const isNewDay = isNewDayPKT(lastSubmissionResetDate);
      let currentSubmissions = dailySubmissionsCount;
      let currentResetDate = lastSubmissionResetDate;
      if (isNewDay) { currentSubmissions = 0; currentResetDate = new Date().toISOString(); }
      if (currentSubmissions >= 50) { setShowUpgradeModal(true); return; }
      const { error: updateError } = await supabase.from('profiles').update({ daily_mcq_submissions: currentSubmissions + 1, last_submission_reset_date: currentResetDate }).eq('id', user.id);
      if (updateError) { console.error('Error updating daily submissions:', updateError); toast({ title: "Error", description: "Failed to update daily submission count.", variant: "destructive" }); return; }
      setDailySubmissionsCount(currentSubmissions + 1);
      setLastSubmissionResetDate(currentResetDate);
    }
    const answer = timeUp ? '' : selectedAnswer;
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = answer === currentMCQ.correct_answer;
    if (isCorrect && !timeUp) setScore(prev => prev + 1);
    try {
      await supabase.from('user_answers').insert({ user_id: user.id, mcq_id: currentMCQ.id, selected_answer: answer || 'No answer', is_correct: isCorrect, time_taken: timeTaken });
    } catch (error) { console.error('Error saving answer:', error); }
    setShowExplanation(true);
    setShowHelpToast(false);
    if (helpToastTimerRef.current) clearTimeout(helpToastTimerRef.current);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now());
    } else {
      toast({ title: "Quiz Completed!", description: `You scored ${score}/${totalQuestions} (${Math.round((score / totalQuestions) * 100)}%)` });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
      }
      onBack();
    }
  };

  const handleHelpToastClick = () => { setShowHelpToast(false); setIsChatbotOpen(true); };

  const handleSaveMCQ = async () => {
    if (!user || !currentMCQ?.id) { toast({ title: "Authentication Required", description: "Please log in to save MCQs.", variant: "destructive" }); return; }
    try {
      if (isCurrentMCQSaved) {
        const { error } = await supabase.from('saved_mcqs').delete().eq('user_id', user.id).eq('mcq_id', currentMCQ.id);
        if (error) throw error;
        setIsCurrentMCQSaved(false);
        toast({ title: "MCQ Unsaved", description: "Removed from your saved list." });
      } else {
        const { error } = await supabase.from('saved_mcqs').insert({ user_id: user.id, mcq_id: currentMCQ.id });
        if (error) throw error;
        setIsCurrentMCQSaved(true);
        toast({ title: "MCQ Saved!", description: "Added to your saved list." });
      }
    } catch (error: any) {
      console.error('Error saving/unsaving MCQ:', error);
      toast({ title: "Error", description: `Failed: ${error.message || 'Unknown error'}`, variant: "destructive" });
    }
  };

  const handleUpgradeClick = () => { setShowUpgradeModal(false); };

  // --- Loading skeleton ---
  if (loading || profileLoading) {
    return (
      <div className="max-w-3xl mx-auto px-3">
        <div className="relative overflow-hidden rounded-[2rem] bg-card/60 backdrop-blur-2xl border border-border/40 shadow-2xl p-2">
          <div className="bg-background/30 backdrop-blur-xl rounded-[1.5rem] p-6 space-y-4">
            <div className="w-3/4 h-6 rounded-md bg-muted animate-pulse mx-auto" />
            <div className="w-5/6 h-4 rounded-md bg-muted animate-pulse mx-auto" />
            <div className="space-y-3 mt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-full h-14 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mcqs || mcqs.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-3">
        <div className="relative overflow-hidden rounded-[2rem] bg-card/60 backdrop-blur-2xl border border-border/40 shadow-2xl p-2">
          <div className="bg-background/30 backdrop-blur-xl rounded-[1.5rem] p-8 text-center">
            <img src="/images/mascots/doctor-reading.png" alt="No questions" className="w-24 h-24 mx-auto mb-4 object-contain opacity-80" />
            <p className="text-muted-foreground mb-4">No questions available for this chapter.</p>
            <Button onClick={onBack} variant="secondary" className="rounded-xl">
              Leave Test
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3">
      {/* Main quiz card - pricing page style */}
      <div className="relative overflow-hidden rounded-[2rem] bg-card/60 backdrop-blur-2xl border border-border/40 shadow-2xl p-2">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, hsl(var(--foreground) / 0.15) 20px, hsl(var(--foreground) / 0.15) 40px)`,
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
        }} />

        {/* Inner glass container */}
        <div className="relative z-10 bg-background/30 backdrop-blur-xl rounded-[1.5rem] border border-border/30 shadow-inner">
          
          {/* Quiz header inside card */}
          <div className="px-4 sm:px-6 py-4 border-b border-border/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Q{currentQuestionIndex + 1}/{totalQuestions}
                </span>
                {timerEnabled && (
                  <div className={`flex items-center space-x-1 text-sm font-mono font-bold px-2 py-1 rounded-lg ${timeLeft <= 10 ? 'bg-destructive/15 text-destructive' : 'bg-muted/50 text-muted-foreground'}`}>
                    <Timer className="w-3.5 h-3.5" />
                    <span>{timeLeft}s</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 text-xs font-semibold text-muted-foreground">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{score}/{currentQuestionIndex}</span>
                </div>
                {userPlanForChatbot === 'free' && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground/70">
                    <span>{dailySubmissionsCount}/50</span>
                  </div>
                )}
                {user && (
                  <Button variant="ghost" size="icon" onClick={handleSaveMCQ} className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted/50" title={isCurrentMCQSaved ? "Unsave" : "Save"}>
                    {isCurrentMCQSaved ? <BookmarkCheck className="w-4 h-4 fill-current" /> : <Bookmark className="w-4 h-4" />}
                  </Button>
                )}
              </div>
            </div>
            <Progress value={progressPercentage} className="w-full h-1.5" />
            {timerEnabled && (
              <Progress value={(timeLeft / timePerQuestion) * 100} className="w-full h-1 mt-1.5" />
            )}
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="px-4 sm:px-6 py-5"
            >
              <h2 className="text-base sm:text-lg font-bold leading-relaxed text-foreground mb-5">
                {currentMCQ?.question}
              </h2>

              {/* Options */}
              <div className="space-y-2.5">
                {currentMCQ?.shuffledOptions.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === currentMCQ.correct_answer;
                  const showResult = showExplanation;

                  let optionClass = "w-full p-3.5 text-left rounded-xl transition-all duration-200 text-sm sm:text-base border ";
                  if (showResult) {
                    if (isCorrect) optionClass += "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
                    else if (isSelected && !isCorrect) optionClass += "bg-destructive/10 border-destructive/30 text-destructive";
                    else optionClass += "bg-muted/30 border-border/30 text-muted-foreground/50";
                  } else {
                    if (isSelected) optionClass += "bg-primary/10 border-primary/30 text-foreground";
                    else optionClass += "bg-muted/20 border-border/30 text-foreground/80 hover:bg-muted/40 hover:border-border/50";
                  }

                  return (
                    <motion.button
                      key={index}
                      className={optionClass}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={showExplanation}
                      whileHover={!showExplanation ? { scale: 1.01 } : {}}
                      whileTap={!showExplanation ? { scale: 0.99 } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex-1 font-medium">{String.fromCharCode(65 + index)}. {option}</span>
                        {showResult && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 ml-2 flex-shrink-0" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-destructive ml-2 flex-shrink-0" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showExplanation && currentMCQ?.explanation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-5 p-4 bg-muted/40 border border-border/30 rounded-xl"
                >
                  <h4 className="font-bold text-foreground/90 mb-2 text-sm uppercase tracking-wider">Explanation</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{currentMCQ.explanation}</p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-5 gap-3">
                {currentQuestionIndex > 0 ? (
                  <Button
                    onClick={() => { setCurrentQuestionIndex(prev => prev - 1); setSelectedAnswer(null); setShowExplanation(false); setTimeLeft(timePerQuestion); setStartTime(Date.now()); }}
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50 text-sm"
                  >
                    Previous
                  </Button>
                ) : <div />}

                <div className="flex space-x-2">
                  {!showExplanation && selectedAnswer && (
                    <Button
                      onClick={() => handleSubmitAnswer()}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-sm px-6"
                    >
                      Submit
                    </Button>
                  )}
                  {showExplanation && (
                    <Button
                      onClick={handleNextQuestion}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold text-sm px-6"
                    >
                      {currentQuestionIndex < totalQuestions - 1 ? 'Next' : 'Finish'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Good luck message */}
              {user && (
                <div className="mt-5 text-center text-muted-foreground/60 text-xs uppercase tracking-widest font-medium">
                  Best of luck, <span className="text-foreground font-bold">{username}</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dr. Sultan's Help Toast */}
      <AnimatePresence>
        {showHelpToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-4 z-50 p-3 bg-background/90 backdrop-blur-lg rounded-xl shadow-lg border border-border flex items-center space-x-2 cursor-pointer max-w-[calc(100vw-32px)] sm:max-w-xs"
            onClick={handleHelpToastClick}
          >
            <Bot className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground flex-grow">{helpToastMessage}</span>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowHelpToast(false); }} className="w-6 h-6 p-0">
              <X className="w-3 h-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot */}
      <AIChatbot currentQuestion={currentMCQ?.question} options={(currentMCQ as any)?.options} userPlan={userPlanForChatbot} />

      {/* Modals */}
      <UpgradeAccountModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgradeClick={handleUpgradeClick} />
      <LeaveTestModal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} onConfirm={onBack} />
    </div>
  );
};
