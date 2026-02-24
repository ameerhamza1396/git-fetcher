// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Clock, CheckCircle, XCircle, Timer, Bot, MessageSquare, X, Bookmark, BookmarkCheck, Crown } from 'lucide-react'; // Added Crown icon for premium
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { fetchMCQsByChapter, MCQ } from '@/utils/mcqData';
import { supabase } from '@/integrations/supabase/client';
import { AIChatbot } from './AIChatbot';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'; // Import Dialog components

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

// Fisher-Yates shuffle algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// --- Constants for Local Storage Keys ---
const LAST_ATTEMPTED_MCQ_KEY = 'lastAttemptedMCQIndex';
const LAST_ATTEMPTED_SUBJECT_KEY = 'lastAttemptedMCQSubject';
const LAST_ATTEMPTED_CHAPTER_KEY = 'lastAttemptedMCQChapter';

// --- Upgrade Account Modal Component ---
interface UpgradeAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeClick: () => void;
}

const UpgradeAccountModal: React.FC<UpgradeAccountModalProps> = ({ isOpen, onClose, onUpgradeClick }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-purple-200 dark:border-purple-800">
        <DialogHeader className="text-center">
          <Crown className="w-12 h-12 mx-auto text-yellow-500 dark:text-yellow-400 mb-3" />
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Upgrade Your Account</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
            You've reached the daily limit of 50 free MCQ submissions. Upgrade to a premium plan for unlimited practice and more features!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full sm:w-auto border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
          >
            Maybe Later
          </Button>
          <Button
            onClick={onUpgradeClick}
            className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
          >
            Upgrade Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


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

  // States for AIChatbot visibility
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // States for Dr. Sultan's help toast
  const [showHelpToast, setShowHelpToast] = useState(false);
  const [helpToastMessage, setHelpToastMessage] = useState('');
  const helpToastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for saved MCQ status
  const [isCurrentMCQSaved, setIsCurrentMCQSaved] = useState(false);

  // States for daily submission limit
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
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

  // Derive username for the good luck message
  const username = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Fetch user profile data to get the plan and new submission fields
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['profileForChatbot', user?.id], // Unique query key
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, daily_mcq_submissions, last_submission_reset_date') // Fetch new fields
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile for chatbot:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id // Only run query if user ID exists
  });

  // Determine the user's plan for the chatbot
  const userPlanForChatbot = profile?.plan?.toLowerCase() || 'free';

  // Effect to set initial daily submission states from profile
  useEffect(() => {
    if (profile && !profileLoading) {
      setDailySubmissionsCount(profile.daily_mcq_submissions || 0);
      setLastSubmissionResetDate(profile.last_submission_reset_date);
    }
  }, [profile, profileLoading]);

  // Function to check if it's a new day (12 AM PKT)
  const isNewDayPKT = (lastResetDateStr: string | null): boolean => {
    if (!lastResetDateStr) {
      return true; // If no reset date, assume it's a new day
    }

    const now = new Date();
    // Convert current time to PKT
    const nowPKT = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" })); // Changed to Asia/Karachi

    // Get today's 12 AM PKT
    const today12AMPKT = new Date(nowPKT);
    today12AMPKT.setHours(0, 0, 0, 0);

    const lastResetDateTime = new Date(lastResetDateStr);
    // Convert last reset date to PKT for comparison
    const lastResetDateTimePKT = new Date(lastResetDateTime.toLocaleString("en-US", { timeZone: "Asia/Karachi" })); // Changed to Asia/Karachi

    return lastResetDateTimePKT < today12AMPKT;
  };

  // --- Effect to load last attempted question from local storage ---
  useEffect(() => {
    if (typeof window !== 'undefined') { // Ensure localStorage is available
      const lastSubject = localStorage.getItem(LAST_ATTEMPTED_SUBJECT_KEY);
      const lastChapter = localStorage.getItem(LAST_ATTEMPTED_CHAPTER_KEY);
      const lastIndex = localStorage.getItem(LAST_ATTEMPTED_MCQ_KEY);

      if (lastSubject === subject && lastChapter === chapter && lastIndex !== null) {
        const parsedIndex = parseInt(lastIndex, 10);
        // Only set if the parsed index is a valid number
        if (!isNaN(parsedIndex) && parsedIndex >= 0) {
          setCurrentQuestionIndex(parsedIndex);
          // console.log(`Resuming from question index: ${parsedIndex}`); // For debugging
        }
      } else {
        // If subject/chapter doesn't match or no saved index, clear previous if any and start fresh
        localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
        setCurrentQuestionIndex(0); // Start from the beginning for a new subject/chapter
        // console.log("Starting a new quiz or saved state not found/matched."); // For debugging
      }
    }
  }, [subject, chapter]); // Rerun if subject or chapter changes

  // Effect to load MCQs and shuffle options
  useEffect(() => {
    const loadMCQs = async () => {
      setLoading(true);
      const data = await fetchMCQsByChapter(chapter);

      // Shuffle options for each MCQ
      const shuffledMCQs = data.map(mcq => {
        const correctAnswerIndex = mcq.options.indexOf(mcq.correct_answer);
        const shuffledOptions = shuffleArray(mcq.options);
        const newCorrectIndex = shuffledOptions.indexOf(mcq.correct_answer);

        return {
          ...mcq,
          shuffledOptions,
          originalCorrectIndex: newCorrectIndex
        };
      });

      setMcqs(shuffledMCQs);
      setLoading(false);
    };

    loadMCQs();
  }, [chapter]); // This useEffect loads MCQs based on chapter.

  // --- Effect to save current question index to local storage ---
  useEffect(() => {
    if (!loading && mcqs.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(LAST_ATTEMPTED_MCQ_KEY, currentQuestionIndex.toString());
      localStorage.setItem(LAST_ATTEMPTED_SUBJECT_KEY, subject);
      localStorage.setItem(LAST_ATTEMPTED_CHAPTER_KEY, chapter);
    }
  }, [currentQuestionIndex, subject, chapter, loading, mcqs.length]);


  // Effect to check if the current MCQ is saved
  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!user || !mcqs[currentQuestionIndex]?.id) { // Use mcqs[currentQuestionIndex]?.id for safety
        setIsCurrentMCQSaved(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('saved_mcqs')
          .select('id')
          .eq('user_id', user.id)
          .eq('mcq_id', mcqs[currentQuestionIndex].id) // Use mcqs[currentQuestionIndex].id
          .single();

        setIsCurrentMCQSaved(!!data); // Set to true if data exists, false otherwise
        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found (expected for unsaved)
          console.error('Error checking saved status:', error);
        }
      } catch (error) {
        console.error('Error checking saved status:', error);
        setIsCurrentMCQSaved(false);
      }
    };

    // Only run if mcqs has loaded and current question is available
    if (!loading && mcqs.length > 0) {
      checkSavedStatus();
    }
  }, [mcqs, currentQuestionIndex, user, loading]); // Depend on mcqs, currentQuestionIndex, user, and loading

  // Timer for Dr. Sultan's help toast
  useEffect(() => {
    // Clear any existing timer when question changes or component unmounts
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current);
    }
    setShowHelpToast(false); // Hide toast for new question

    // Set a new timer if no answer selected yet and chatbot is not open
    // and user is authenticated (chatbot is a premium feature)
    if (user && userPlanForChatbot === 'premium' && !selectedAnswer && !isChatbotOpen) {
      helpToastTimerRef.current = setTimeout(() => {
        if (!selectedAnswer && !isChatbotOpen) { // Double check if still no answer and chatbot is closed
          setHelpToastMessage(helpMessages[Math.floor(Math.random() * helpMessages.length)]);
          setShowHelpToast(true);
        }
      }, 10000); // 10 seconds
    }

    // Cleanup function for the effect
    return () => {
      if (helpToastTimerRef.current) {
        clearTimeout(helpToastTimerRef.current);
      }
    };
  }, [currentQuestionIndex, selectedAnswer, isChatbotOpen, user, userPlanForChatbot]); // Depend on selectedAnswer and isChatbotOpen

  // Define currentMCQ after loading and empty checks
  // This ensures currentMCQ is only accessed when mcqs has data
  const currentMCQ = mcqs[currentQuestionIndex];
  const totalQuestions = mcqs.length;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleTimeUp = () => {
    if (!showExplanation) {
      handleSubmitAnswer(true);
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answer);
    setShowHelpToast(false); // Hide help toast if user selects an answer
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current); // Clear timer if user acts
    }
  };

  const handleSubmitAnswer = async (timeUp = false) => {
    if (!currentMCQ || !user) return;

    // --- NEW: Daily submission limit check for free users ---
    if (userPlanForChatbot === 'free') {
      const isNewDay = isNewDayPKT(lastSubmissionResetDate); // Changed to PKT function

      let currentSubmissions = dailySubmissionsCount;
      let currentResetDate = lastSubmissionResetDate;

      if (isNewDay) {
        currentSubmissions = 0; // Reset for new day
        currentResetDate = new Date().toISOString(); // Set new reset date (UTC)
      }

      if (currentSubmissions >= 50) {
        setShowUpgradeModal(true);
        return; // Prevent submission
      }

      // Increment submission count and update reset date in Supabase
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          daily_mcq_submissions: currentSubmissions + 1,
          last_submission_reset_date: currentResetDate
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating daily submissions:', updateError);
        toast({
          title: "Error",
          description: "Failed to update daily submission count. Please try again.",
          variant: "destructive",
        });
        return; // Prevent submission if update fails
      }
      setDailySubmissionsCount(currentSubmissions + 1); // Update local state
      setLastSubmissionResetDate(currentResetDate); // Update local state
    }
    // --- END NEW: Daily submission limit check ---


    const answer = timeUp ? '' : selectedAnswer;
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = answer === currentMCQ.correct_answer;

    if (isCorrect && !timeUp) {
      setScore(prev => prev + 1);
    }

    // Save answer to database
    try {
      await supabase.from('user_answers').insert({
        user_id: user.id,
        mcq_id: currentMCQ.id,
        selected_answer: answer || 'No answer',
        is_correct: isCorrect,
        time_taken: timeTaken
      });
    } catch (error) {
      console.error('Error saving answer:', error);
    }

    setShowExplanation(true);
    setShowHelpToast(false); // Hide help toast after submitting answer
    if (helpToastTimerRef.current) {
      clearTimeout(helpToastTimerRef.current); // Clear timer
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now()); // Reset start time for next question
      // Timer for help toast will be reset by useEffect due to currentQuestionIndex change
    } else {
      // Quiz completed
      toast({
        title: "Quiz Completed!",
        description: `You scored ${score}/${totalQuestions} (${Math.round((score / totalQuestions) * 100)}%)`,
      });

      // --- Clear local storage upon quiz completion ---
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
        // console.log("Quiz completed. Local storage cleared."); // For debugging
      }

      onBack();
    }
  };

  // Function to handle clicking the help toast
  const handleHelpToastClick = () => {
    setShowHelpToast(false); // Dismiss the toast
    setIsChatbotOpen(true); // Open the chatbot
    // The AIChatbot component itself will handle showing the welcome/help message
  };

  // Function to handle saving/unsaving an MCQ
  const handleSaveMCQ = async () => {
    if (!user || !currentMCQ?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save MCQs.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isCurrentMCQSaved) {
        // Unsave MCQ
        const { error } = await supabase
          .from('saved_mcqs')
          .delete()
          .eq('user_id', user.id)
          .eq('mcq_id', currentMCQ.id);

        if (error) throw error;
        setIsCurrentMCQSaved(false);
        toast({
          title: "MCQ Unsaved",
          description: (
            <div className="flex items-center">
              <Bookmark className="w-4 h-4 mr-2" />
              <span>This question has been removed from your saved list.</span>
            </div>
          ),
        });
      } else {
        // Save MCQ
        const { error } = await supabase
          .from('saved_mcqs')
          .insert({
            user_id: user.id,
            mcq_id: currentMCQ.id,
          });

        if (error) throw error;
        setIsCurrentMCQSaved(true);
        toast({
          title: "MCQ Saved!",
          description: (
            <div className="flex items-center">
              <BookmarkCheck className="w-4 h-4 mr-2" />
              <span>This question has been added to your saved list.</span>
            </div>
          ),
        });
      }
    } catch (error: any) {
      console.error('Error saving/unsaving MCQ:', error);
      toast({
        title: "Error",
        description: `Failed to save/unsave MCQ: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleUpgradeClick = () => {
    setShowUpgradeModal(false);
    console.log("Navigating to upgrade page..."); // Placeholder
  };

  // ----- REPLACED LOADING STATE: Facebook-style skeleton (only this block changed) -----
  if (loading || profileLoading) { // Added profileLoading to the loading state
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <CardContent className="p-6">
          {/* Skeleton container */}
          <div className="space-y-4">
            {/* Question title skeleton */}
            <div className="mx-auto w-3/4 h-6 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />

            {/* Short description skeleton */}
            <div className="mx-auto w-5/6 h-4 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />

            {/* Options skeletons (Facebook-like) */}
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-full h-12 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
              ))}
            </div>

            {/* Action buttons skeleton */}
            <div className="mt-4 flex justify-between items-center">
              <div className="w-28 h-8 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />
              <div className="w-28 h-8 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />
            </div>

            {/* Small footer skeleton */}
            <div className="mt-4 flex justify-center">
              <div className="w-40 h-4 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  // ----- END LOADING STATE -----

  if (!mcqs || mcqs.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
        <CardContent className="text-center py-6 sm:py-8">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">No questions available for this chapter.</p>
          <Button onClick={onBack} className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base">
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
            Back to Chapters
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <Button
        variant="outline"
        onClick={onBack}
        className="mb-4 sm:mb-6 flex items-center space-x-2 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm sm:text-base"
      >
        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Back to Chapters</span>
      </Button>

      {/* Progress Header */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
        <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-2 sm:space-y-0">
            <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </CardTitle>
            <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              {timerEnabled && (
                <div className={`flex items-center space-x-1 ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
                  <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{timeLeft}s</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Score: {score}/{currentQuestionIndex}</span>
              </div>
              {/* Display daily submissions count for free users */}
              {userPlanForChatbot === 'free' && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{dailySubmissionsCount}/50 Daily</span>
                </div>
              )}
            </div>
          </div>
          <Progress value={progressPercentage} className="w-full" />
          {timerEnabled && (
            <Progress
              value={(timeLeft / timePerQuestion) * 100}
              className="w-full h-2 mt-2"
              style={{
                background: timeLeft <= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(147, 51, 234, 0.2)'
              }}
            />
          )}
        </CardHeader>
      </Card>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestionIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
            <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-white flex-1">
                  {currentMCQ?.question}
                </CardTitle>

                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveMCQ}
                    className="ml-2 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                    title={isCurrentMCQSaved ? "Unsave Question" : "Save Question"}
                  >
                    {isCurrentMCQSaved ? (
                      <BookmarkCheck className="w-5 h-5 fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400" />
                    ) : (
                      <Bookmark className="w-5 h-5" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>


            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="space-y-2 sm:space-y-3">
                {currentMCQ?.shuffledOptions.map((option, index) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === currentMCQ.correct_answer;
                  const showResult = showExplanation;

                  let buttonClass = "w-full p-3 sm:p-4 text-left border-2 rounded-lg transition-all duration-200 text-sm sm:text-base ";

                  if (showResult) {
                    if (isCorrect) {
                      buttonClass += "bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400";
                    } else if (isSelected && !isCorrect) {
                      buttonClass += "bg-red-50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400";
                    } else {
                      buttonClass += "bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400";
                    }
                  } else {
                    if (isSelected) {
                      buttonClass += "bg-purple-50 dark:bg-purple-900/50 border-purple-500 text-purple-700 dark:text-purple-300";
                    } else {
                      buttonClass += "bg-white dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30";
                    }
                  }

                  return (
                    <motion.button
                      key={index}
                      className={buttonClass}
                      onClick={() => handleAnswerSelect(option)}
                      disabled={showExplanation}
                      whileHover={!showExplanation ? { scale: 1.01 } : {}}
                      whileTap={!showExplanation ? { scale: 0.99 } : {}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 dark:text-white flex-1">{String.fromCharCode(65 + index)}. {option}</span>
                        {showResult && isCorrect && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 ml-2" />}
                        {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 ml-2" />}
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
                  className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 text-sm sm:text-base">Explanation:</h4>
                  <p className="text-blue-800 dark:text-blue-300 text-sm sm:text-base">{currentMCQ.explanation}</p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mt-4 sm:mt-6 space-y-2 sm:space-y-0 sm:space-x-3">
                {/* Previous Button - Hidden on first question */}
                {currentQuestionIndex > 0 && (
                  <Button
                    onClick={() => {
                      setCurrentQuestionIndex(prev => prev - 1);
                      setSelectedAnswer(null);
                      setShowExplanation(false);
                      setTimeLeft(timePerQuestion);
                      setStartTime(Date.now());
                    }}
                    variant="outline"
                    className="w-full sm:w-auto border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm sm:text-base"
                  >
                    Previous Question
                  </Button>
                )}

                <div className="flex w-full sm:w-auto justify-end space-x-2 sm:space-x-3">
                  {!showExplanation && selectedAnswer && (
                    <Button
                      onClick={() => handleSubmitAnswer()}
                      className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base px-4 sm:px-6"
                    >
                      Submit Answer
                    </Button>
                  )}

                  {showExplanation && (
                    <Button
                      onClick={handleNextQuestion}
                      className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-sm sm:text-base px-4 sm:px-6"
                    >
                      {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Best of luck message */}
              {user && ( // Only show if a user is logged in
                <div className="mt-6 text-center text-gray-700 dark:text-gray-300 text-base sm:text-lg">
                  Best of luck,{' '}
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text font-bold">
                    {username}
                  </span>
                  !
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Dr. Sultan's Help Toast */}
      <AnimatePresence>
        {showHelpToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 right-6 z-50 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-purple-200 dark:border-purple-700 flex items-center space-x-2 cursor-pointer max-w-[calc(100vw-48px)] sm:max-w-xs"
            onClick={handleHelpToastClick}
          >
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="text-sm text-gray-800 dark:text-gray-200 flex-grow">{helpToastMessage}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setShowHelpToast(false); }}
              className="w-6 h-6 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-3 h-3" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot */}
      <AIChatbot
        currentQuestion={currentMCQ?.question}
        options={(currentMCQ as any)?.options} 
        userPlan={userPlanForChatbot}
      />

      {/* Upgrade Account Modal */}
      <UpgradeAccountModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgradeClick={handleUpgradeClick}
      />
    </div>
  );
};
