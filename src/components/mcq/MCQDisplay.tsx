// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock, CheckCircle, XCircle, Timer, Bot, MessageSquare, X, Bookmark,
  BookmarkCheck, Crown, LogOut, AlertTriangle, MoreVertical, Flag, BotOff,
  Moon, Sun, Zap, Sparkles, BookOpen, ChevronLeft, Loader2, Star, Award,
  TrendingUp, Brain, Target, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { fetchMCQsByChapter, MCQ } from '@/utils/mcqData';
import { supabase } from '@/integrations/supabase/client';
import { AIChatbot } from './AIChatbot';
import { useQuery } from '@tanstack/react-query';
import { playCorrectSound, playIncorrectSound } from '@/utils/soundEffects';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface MCQDisplayProps {
  subject: string;
  chapter: string;
  onBack: () => void;
  timerEnabled?: boolean;
  timePerQuestion?: number;
  initialIndex?: number;
  isAiGenerated?: boolean;
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
const SAVED_SESSIONS_LIST_KEY = 'mcq_saved_sessions';

export interface SavedMCQSession {
  subjectId: string;
  chapterId: string;
  lastIndex: number;
  timestamp: string;
}

const updateSavedSessionsList = async (userId: string | undefined, subjectId: string, chapterId: string, lastIndex: number) => {
  if (typeof window === 'undefined') return;
  try {
    let sessions: SavedMCQSession[] = [];
    if (userId) {
      const { data: profile } = await supabase.from('profiles').select('in_progress_mcqs').eq('id', userId).single();
      if (profile?.in_progress_mcqs) sessions = profile.in_progress_mcqs as unknown as SavedMCQSession[];
    }
    if (sessions.length === 0) {
      const localData = localStorage.getItem(SAVED_SESSIONS_LIST_KEY);
      sessions = localData ? JSON.parse(localData) : [];
    }
    sessions = sessions.filter(s => s.chapterId !== chapterId);
    sessions.unshift({ subjectId, chapterId, lastIndex, timestamp: new Date().toISOString() });
    if (sessions.length > 5) sessions = sessions.slice(0, 5);
    localStorage.setItem(SAVED_SESSIONS_LIST_KEY, JSON.stringify(sessions));
    if (userId) await supabase.from('profiles').update({ in_progress_mcqs: sessions }).eq('id', userId);
  } catch (e) { console.error("Failed to update saved sessions array", e); }
};

const removeSavedSessionFromList = async (userId: string | undefined, chapterId: string) => {
  if (typeof window === 'undefined') return;
  try {
    let sessions: SavedMCQSession[] = [];
    if (userId) {
      const { data: profile } = await supabase.from('profiles').select('in_progress_mcqs').eq('id', userId).single();
      if (profile?.in_progress_mcqs) sessions = profile.in_progress_mcqs as unknown as SavedMCQSession[];
    }
    if (sessions.length === 0) {
      const localData = localStorage.getItem(SAVED_SESSIONS_LIST_KEY);
      sessions = localData ? JSON.parse(localData) : [];
    }
    sessions = sessions.filter(s => s.chapterId !== chapterId);
    localStorage.setItem(SAVED_SESSIONS_LIST_KEY, JSON.stringify(sessions));
    if (userId) await supabase.from('profiles').update({ in_progress_mcqs: sessions }).eq('id', userId);
  } catch (e) { console.error("Failed to remove saved session from array", e); }
};

// ─── Custom Modal primitives ───────────────────────────────────────────────────
// We bypass shadcn's Dialog wrapper and use Radix primitives directly with
// explicit z-[200]/z-[201] so they always render above the z-[100] quiz container.
// The overlay uses a fully opaque dark background so the card beneath doesn't bleed through.

const ModalOverlay = () => (
  <DialogPrimitive.Overlay
    className="fixed inset-0 bg-black/75 z-[200]
      data-[state=open]:animate-in data-[state=closed]:animate-out
      data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
  />
);

const ModalContent = ({ children, className = '', ...props }) => (
  <DialogPrimitive.Portal>
    <ModalOverlay />
    <DialogPrimitive.Content
      className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[calc(100%-2rem)] max-w-[400px] focus:outline-none
        data-[state=open]:animate-in data-[state=closed]:animate-out
        data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
        data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95
        data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]
        data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]
        ${className}`}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
);

// ─── Modals ────────────────────────────────────────────────────────────────────

const MCQSettingsModal = ({
  isOpen, onClose, onExit,
  quickSubmit, toggleQuickSubmit,
  soundEnabled, toggleSound,
  aiPopupsDisabled, toggleAiPopups,
  onReport, isPremium, theme, setTheme
}) => (
  <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
    <ModalContent className="sm:max-w-[400px] mx-4">
      {/* Solid card — no bg-background (CSS var can be transparent) */}
      <div className="bg-white dark:bg-zinc-900 border-2 border-primary/20 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 pb-0">
          <DialogPrimitive.Title className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black italic uppercase tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Quiz Settings
            </span>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-zinc-500 dark:text-zinc-400 pl-10">
            Customize your quiz experience
          </DialogPrimitive.Description>
        </div>

        <div className="p-6 pt-4 space-y-3">
          {/* Quick Submit */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Quick Submit</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-black">Skip Submit Button</p>
              </div>
            </div>
            <Switch checked={quickSubmit} onCheckedChange={toggleQuickSubmit} className="data-[state=checked]:bg-orange-500 shrink-0" />
          </div>

          {/* AI Popups */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">AI Popups</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-black">{aiPopupsDisabled ? 'OFF' : 'ON'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isPremium && <Crown className="w-4 h-4 text-yellow-500 animate-pulse" />}
              <Switch checked={!aiPopupsDisabled} disabled={!isPremium} onCheckedChange={toggleAiPopups} className="data-[state=checked]:bg-blue-500" />
            </div>
          </div>

          {/* Sound FX */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0 text-lg leading-none">
                {soundEnabled ? '🔊' : '🔇'}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Sound FX</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-black">{soundEnabled ? 'ENABLED' : 'DISABLED'}</p>
              </div>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={toggleSound} className="data-[state=checked]:bg-violet-500 shrink-0" />
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-500/10 border border-zinc-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-500 to-zinc-600 flex items-center justify-center shadow-lg shrink-0">
                {theme === 'dark' ? <Moon className="w-5 h-5 text-white" /> : <Sun className="w-5 h-5 text-white" />}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Dark Mode</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-black">{theme === 'dark' ? 'ON' : 'OFF'}</p>
              </div>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} className="data-[state=checked]:bg-zinc-800" />
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <Button onClick={onReport} variant="outline" className="w-full rounded-2xl h-12 border-2 border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-bold uppercase text-xs tracking-widest">
              <Flag className="w-4 h-4 mr-2" /> Report Question
            </Button>
            <Button onClick={onExit} className="w-full rounded-2xl h-12 font-black uppercase text-xs tracking-widest bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white">
              <LogOut className="w-4 h-4 mr-2" /> Leave Session
            </Button>
          </div>
        </div>
      </div>
    </ModalContent>
  </DialogPrimitive.Root>
);

const UpgradeAccountModal = ({ isOpen, onClose, onUpgradeClick }) => (
  <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
    <ModalContent className="sm:max-w-[425px] mx-4">
      <div className="bg-white dark:bg-zinc-900 border-2 border-yellow-500/30 rounded-2xl p-6 shadow-2xl">
        <DialogPrimitive.Title className="sr-only">Upgrade Your Account</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Upgrade to premium for unlimited MCQ practice</DialogPrimitive.Description>
        <div className="flex flex-col items-center text-center">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }} className="mb-4">
            <Crown className="w-16 h-16 text-yellow-500" />
          </motion.div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent mb-2">
            Upgrade Your Account
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
            You've reached the daily limit of 50 free MCQ submissions. Upgrade to a premium plan for unlimited practice!
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:justify-center">
            <Button onClick={onClose} variant="outline" className="w-full sm:w-auto rounded-xl">Maybe Later</Button>
            <Button onClick={onUpgradeClick} className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg">
              Upgrade Now
            </Button>
          </div>
        </div>
      </div>
    </ModalContent>
  </DialogPrimitive.Root>
);

const LeaveTestModal = ({ isOpen, onClose, onConfirm }) => (
  <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
    <ModalContent className="sm:max-w-[400px] mx-4">
      <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-red-900 rounded-2xl p-6 shadow-2xl">
        <DialogPrimitive.Title className="sr-only">Leave Session</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Confirm leaving the quiz session</DialogPrimitive.Description>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Leave Session?</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">Your progress will be saved so you can continue later.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
            <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl h-12">Cancel</Button>
            <Button onClick={onConfirm} className="flex-1 rounded-xl h-12 font-bold bg-red-600 hover:bg-red-700 text-white">Leave Test</Button>
          </div>
        </div>
      </div>
    </ModalContent>
  </DialogPrimitive.Root>
);

const ReportMCQModal = ({ isOpen, onClose, onSubmit, isSubmitting }) => {
  const [reason, setReason] = useState('');
  const [category, setCategory] = useState('');

  const handleClose = () => { setReason(''); setCategory(''); onClose(); };

  const categories = [
    'Incorrect answer marked as correct',
    'Typo or grammatical error',
    'Incomplete or unclear question',
    'Wrong explanation provided',
    'Duplicate question',
    'Other'
  ];

  const handleSubmit = () => {
    if (!category) return;
    onSubmit({ category, reason });
    setReason('');
    setCategory('');
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <ModalContent className="sm:max-w-[450px] mx-4">
        <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-red-900 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
          <DialogPrimitive.Title className="sr-only">Report Question</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Report an issue with this MCQ question</DialogPrimitive.Description>

          <div className="flex flex-col items-center text-center mb-5">
            <div className="mb-3 w-14 h-14 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <Flag className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Report Question</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">Help us improve by reporting issues with this question.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">What's wrong?</p>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-left text-sm px-3 py-2.5 rounded-xl border-2 transition-all ${category === cat
                        ? 'bg-red-50 dark:bg-red-950 border-red-500 text-zinc-900 dark:text-zinc-100 font-medium'
                        : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Additional details (optional)</p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide more context about the issue..."
                className="rounded-xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 resize-none text-sm"
                rows={3}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
            <Button onClick={handleClose} variant="outline" className="flex-1 rounded-xl">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!category || isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </ModalContent>
    </DialogPrimitive.Root>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

export const MCQDisplay = ({
  subject,
  chapter,
  onBack,
  timerEnabled = false,
  timePerQuestion = 30,
  initialIndex = 0,
  isAiGenerated = false
}: MCQDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mcqs, setMcqs] = useState<ShuffledMCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [score, setScore] = useState(0);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const helpToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isCurrentMCQSaved, setIsCurrentMCQSaved] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [hasAttemptedAny, setHasAttemptedAny] = useState(false);
  const [quickSubmit, setQuickSubmit] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('quickSubmitEnabled') !== 'false';
    return true;
  });
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | null>(null);
  const [aiPopupsDisabled, setAiPopupsDisabled] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aiPopupsDisabled') === 'true';
    return false;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('mcqSoundDisabled') !== 'true';
    return true;
  });
  const [dailySubmissionsCount, setDailySubmissionsCount] = useState(0);
  const [lastSubmissionResetDate, setLastSubmissionResetDate] = useState<string | null>(null);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profileForChatbot', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('plan, daily_mcq_submissions, last_submission_reset_date').eq('id', user.id).maybeSingle();
      if (error) { console.error('Error fetching profile for chatbot:', error); return null; }
      return data;
    },
    enabled: !!user?.id
  });

  const userPlanForChatbot = profile?.plan?.toLowerCase() || 'free';
  const isPremium = userPlanForChatbot === 'premium' || userPlanForChatbot === 'iconic';

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

  const currentMCQ = mcqs[currentQuestionIndex];
  const totalQuestions = mcqs.length;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  const handleTimeUp = () => {
    if (!showExplanation && !selectedAnswer) handleSubmitAnswer(true);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    setSelectedAnswer(answer);
    if (quickSubmit) setTimeout(() => handleSubmitAnswer(false, answer), 150);
  };

  const handleSubmitAnswer = async (timeUp = false, providedAnswer?: string) => {
    if (!currentMCQ || !user) return;
    setHasAttemptedAny(true);

    if (userPlanForChatbot === 'free') {
      const isNewDay = isNewDayPKT(lastSubmissionResetDate);
      let currentSubmissions = dailySubmissionsCount;
      let currentResetDate = lastSubmissionResetDate;
      if (isNewDay) { currentSubmissions = 0; currentResetDate = new Date().toISOString(); }
      if (currentSubmissions >= 50) { setShowUpgradeModal(true); return; }
      await supabase.from('profiles').update({ daily_mcq_submissions: currentSubmissions + 1, last_submission_reset_date: currentResetDate }).eq('id', user.id);
      setDailySubmissionsCount(currentSubmissions + 1);
      setLastSubmissionResetDate(currentResetDate);
    }
    const answer = timeUp ? '' : (providedAnswer || selectedAnswer);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const isCorrect = answer === currentMCQ.correct_answer;

    setFeedbackType(isCorrect ? 'correct' : 'incorrect');
    setTimeout(() => setFeedbackType(null), 1000);

    if (soundEnabled) {
      if (isCorrect && !timeUp) playCorrectSound();
      else playIncorrectSound();
    }
    if (isCorrect && !timeUp) setScore(prev => prev + 1);
    try {
      await supabase.from('user_answers').insert({ user_id: user.id, mcq_id: currentMCQ.id, selected_answer: answer || 'No answer (time up)', is_correct: isCorrect, time_taken: timeTaken });
    } catch (error) { console.error('Error saving answer:', error); }
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now());
    } else {
      toast({ title: "🎉 Quiz Completed!", description: `You scored ${score}/${totalQuestions}`, className: "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0" });
      if (typeof window !== 'undefined') {
        localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
        localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
        removeSavedSessionFromList(user?.id, chapter);
      }
      onBack();
    }
  };

  const handleSaveMCQ = async () => {
    if (!user || !currentMCQ?.id) return;
    try {
      if (isCurrentMCQSaved) {
        await supabase.from('saved_mcqs').delete().eq('user_id', user.id).eq('mcq_id', currentMCQ.id);
        setIsCurrentMCQSaved(false);
        toast({ title: "📚 MCQ Unsaved", description: "Removed from your bookmarks" });
      } else {
        await supabase.from('saved_mcqs').insert({ user_id: user.id, mcq_id: currentMCQ.id });
        setIsCurrentMCQSaved(true);
        toast({ title: "⭐ MCQ Saved!", description: "Added to your bookmarks" });
      }
    } catch (error) { }
  };

  const handleReportSubmit = async ({ category, reason }: { category: string; reason: string }) => {
    if (!user || !currentMCQ?.id) return;
    setIsReportSubmitting(true);
    try {
      await supabase.from('reported_questions').insert({ user_id: user.id, mcq_id: currentMCQ.id, reason: `${category}${reason ? ': ' + reason : ''}`, status: 'pending' });
      toast({ title: "✅ Report Submitted", description: "Thank you for helping us improve!" });
      setShowReportModal(false);
    } finally { setIsReportSubmitting(false); }
  };

  const handleUpgradeClick = () => setShowUpgradeModal(false);

  useEffect(() => {
    if (profile && !profileLoading) {
      setDailySubmissionsCount(profile.daily_mcq_submissions || 0);
      setLastSubmissionResetDate(profile.last_submission_reset_date);
    }
  }, [profile, profileLoading]);

  useEffect(() => {
    let isMounted = true;
    const setupBackButtonListener = async () => {
      if (typeof window !== 'undefined') {
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
            const { App } = await import('@capacitor/app');
            const backListener = await App.addListener('backButton', () => {
              if (showExplanation) { handleNextQuestion(); return; }
              setShowLeaveModal(true);
            });
            return () => { if (isMounted) backListener.remove(); };
          }
        } catch (error) { console.error('Failed to load Capacitor plugins:', error); }
      }
      return () => { };
    };
    const cleanupPromise = setupBackButtonListener();
    return () => { isMounted = false; cleanupPromise.then(cleanup => cleanup && cleanup()); };
  }, [showExplanation]);

  useEffect(() => {
    if (!timerEnabled || showExplanation || loading || mcqs.length === 0) return;
    if (timeLeft <= 0) { handleTimeUp(); return; }
    const interval = setInterval(() => {
      setTimeLeft(prev => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnabled, showExplanation, loading, mcqs.length, timeLeft]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (initialIndex > 0) { setCurrentQuestionIndex(initialIndex); return; }
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
  }, [subject, chapter, initialIndex]);

  useEffect(() => {
    const loadMCQs = async () => {
      setLoading(true);
      const data = await fetchMCQsByChapter(chapter);
      const shuffledMCQs = data.map(mcq => {
        const shuffledOptions = shuffleArray(mcq.options);
        return { ...mcq, shuffledOptions, originalCorrectIndex: shuffledOptions.indexOf(mcq.correct_answer) };
      });
      setMcqs(shuffledMCQs);
      setLoading(false);
    };
    loadMCQs();
  }, [chapter]);

  useEffect(() => {
    if (!loading && mcqs.length > 0 && typeof window !== 'undefined' && hasAttemptedAny) {
      localStorage.setItem(LAST_ATTEMPTED_MCQ_KEY, currentQuestionIndex.toString());
      localStorage.setItem(LAST_ATTEMPTED_SUBJECT_KEY, subject);
      localStorage.setItem(LAST_ATTEMPTED_CHAPTER_KEY, chapter);
      updateSavedSessionsList(user?.id, subject, chapter, currentQuestionIndex);
    }
  }, [currentQuestionIndex, subject, chapter, loading, mcqs.length, user?.id, hasAttemptedAny]);

  useEffect(() => {
    const checkSavedStatus = async () => {
      if (!user || !mcqs[currentQuestionIndex]?.id) { setIsCurrentMCQSaved(false); return; }
      try {
        const { data } = await supabase.from('saved_mcqs').select('id').eq('user_id', user.id).eq('mcq_id', mcqs[currentQuestionIndex].id).single();
        setIsCurrentMCQSaved(!!data);
      } catch (error) { setIsCurrentMCQSaved(false); }
    };
    if (!loading && mcqs.length > 0) checkSavedStatus();
  }, [mcqs, currentQuestionIndex, user, loading]);

  if (loading || profileLoading) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col px-6 pt-[max(1rem,env(safe-area-inset-top))] overscroll-none">
        {/* Header Skeleton */}
        <div className="flex justify-between items-center mb-8">
          <div className="space-y-2">
            <div className="h-3 w-20 bg-muted rounded-full animate-pulse" />
            <div className="h-6 w-12 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded-2xl bg-muted animate-pulse" />
            <div className="w-10 h-10 rounded-2xl bg-muted animate-pulse" />
          </div>
        </div>
        {/* Progress Bar Skeleton */}
        <div className="h-2 w-full bg-muted rounded-full mb-8 animate-pulse" />
        {/* Question Card Skeleton */}
        <div className="h-48 w-full bg-muted/40 rounded-3xl mb-8 animate-pulse" />
        {/* Options Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 w-full bg-muted/30 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!mcqs || mcqs.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-primary/10 flex flex-col items-center justify-center p-8 text-center overscroll-none">
        <div className="absolute top-[20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.8 }} transition={{ type: "spring" }} src="/images/mascots/doctor-reading.png" alt="No questions" className="w-32 h-32 mb-6 object-contain" />
        <h2 className="text-2xl font-black italic uppercase bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-4">No Questions Found</h2>
        <p className="text-muted-foreground mb-8 max-w-xs uppercase text-xs tracking-[0.2em] font-bold">We are still adding content for this chapter. Stay tuned!</p>
        <Button onClick={onBack} variant="secondary" className="rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all">Leave Page</Button>
      </div>
    );
  }

  return (
    // IMPORTANT: overflow-hidden removed — it was creating a stacking context trapping modal portals
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-background via-background to-primary/5 flex flex-col overscroll-none touch-none select-none">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-l from-purple-500/20 to-pink-500/20 rounded-full blur-[150px] animate-pulse delay-1000" />
        <div className="absolute top-[50%] left-[50%] w-[80%] h-[80%] bg-gradient-to-tr from-yellow-500/10 to-orange-500/10 rounded-full blur-[200px] animate-pulse delay-2000" />
      </div>

      {/* Header */}
      <header className="relative z-50 flex items-center justify-between px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-4 bg-gradient-to-b from-background/80 to-transparent backdrop-blur-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }} className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
              <Brain className="w-3 h-3 text-white" />
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/80">Practice Phase</span>
            {timerEnabled && (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest transition-all ${timeLeft <= 5 ? 'bg-destructive/20 text-destructive animate-pulse shadow-lg shadow-destructive/20' : 'bg-primary/20 text-primary'}`}>
                <Timer className="w-3 h-3" />
                {timeLeft}s
              </motion.div>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Q{currentQuestionIndex + 1}</h1>
            <span className="text-sm font-bold text-muted-foreground">/ {totalQuestions}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAiGenerated && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">AI Generated</span>
            </motion.div>
          )}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" onClick={handleSaveMCQ} className="w-10 h-10 rounded-2xl bg-muted/40 backdrop-blur-md hover:bg-muted/60 text-muted-foreground transition-all">
              {isCurrentMCQSaved ? <BookmarkCheck className="w-5 h-5 fill-primary text-primary" /> : <Bookmark className="w-5 h-5" />}
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)} className="w-10 h-10 rounded-2xl bg-muted/40 backdrop-blur-md hover:bg-muted/60 text-muted-foreground">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="relative px-6 z-50 mt-2">
        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden shadow-inner">
          <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.3 }} className="h-full bg-gradient-to-r from-primary via-blue-500 to-primary rounded-full" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 flex flex-col px-6 py-6 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 100 }}
            className="flex flex-col flex-1"
          >
            {/* Question Card */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-muted/20 to-muted/5 backdrop-blur-sm border border-primary/20 shadow-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-primary">Question</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-foreground leading-[1.3] tracking-tight">{currentMCQ?.question}</h2>
            </motion.div>

            {/* Options */}
            <div className="space-y-3">
              {currentMCQ?.shuffledOptions.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentMCQ.correct_answer;
                let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
                if (showExplanation) {
                  if (isSelected && isCorrect) state = 'correct';
                  else if (isSelected && !isCorrect) state = 'incorrect';
                  else if (isCorrect) state = 'correct';
                } else if (isSelected) state = 'selected';

                let animation: any = {};
                if (feedbackType) {
                  if (isCorrect) animation = { scale: [1, 1.05, 1], transition: { duration: 0.4 } };
                  else if (isSelected && !isCorrect) animation = { x: [-6, 6, -6, 6, 0], transition: { duration: 0.4 } };
                }

                const getGradient = () => {
                  if (state === 'correct') return 'from-emerald-500/20 to-emerald-500/10 border-emerald-500/50 shadow-emerald-500/20';
                  if (state === 'incorrect') return 'from-destructive/20 to-destructive/10 border-destructive/50 shadow-destructive/20';
                  if (state === 'selected') return 'from-blue-500/20 to-blue-500/10 border-blue-500/50 shadow-blue-500/20';
                  return 'from-muted/10 to-muted/5 border-border/30 hover:from-primary/10 hover:to-primary/5';
                };

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showExplanation}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, ...animation }}
                    transition={{ delay: 0.2 + (index * 0.05) }}
                    whileHover={!showExplanation ? { scale: 1.01, x: 5 } : {}}
                    whileTap={!showExplanation ? { scale: 0.99 } : {}}
                    className={`group relative w-full p-5 rounded-2xl text-left border-2 transition-all duration-300 bg-gradient-to-r ${getGradient()} backdrop-blur-sm shadow-lg`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 flex gap-4 items-start">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black transition-all shrink-0 mt-0.5 shadow-lg ${state === 'default' ? 'bg-muted/30 text-muted-foreground' :
                            state === 'correct' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white' :
                              state === 'incorrect' ? 'bg-gradient-to-br from-destructive to-red-600 text-white' :
                                'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                          }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className={`text-base font-bold leading-snug transition-colors ${state === 'default' ? 'text-foreground/80' :
                            state === 'correct' ? 'text-emerald-700 dark:text-emerald-300' :
                              state === 'incorrect' ? 'text-destructive' :
                                'text-blue-600 dark:text-blue-400'
                          }`}>{option}</span>
                      </div>
                      <div className="shrink-0">
                        {showExplanation && isCorrect && (
                          <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}>
                            <CheckCircle className="w-6 h-6 text-emerald-500 drop-shadow-lg" />
                          </motion.div>
                        )}
                        {showExplanation && isSelected && !isCorrect && (
                          <motion.div initial={{ scale: 0, rotate: 20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}>
                            <XCircle className="w-6 h-6 text-destructive drop-shadow-lg" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring" }}
                  className="mt-8 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-blue-500/10 border-2 border-primary/30 backdrop-blur-md shadow-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                      <BookOpen className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-primary">Explanation</h4>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed font-medium">{currentMCQ?.explanation || "No explanation provided for this question."}</p>
                  {currentMCQ?.correct_answer && (
                    <div className="mt-4 pt-3 border-t border-primary/20">
                      <p className="text-xs font-bold text-primary/80">✓ Correct Answer: <span className="text-foreground">{currentMCQ.correct_answer}</span></p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="relative z-50 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-background via-background/80 to-transparent">
        <div className="flex items-center justify-between gap-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              variant="ghost"
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(prev => prev - 1);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                  setTimeLeft(timePerQuestion);
                  setStartTime(Date.now());
                }
              }}
              disabled={currentQuestionIndex === 0}
              className="flex-1 max-w-[120px] rounded-2xl h-14 bg-gradient-to-r from-muted/40 to-muted/20 backdrop-blur-sm text-foreground font-bold hover:shadow-lg transition-all disabled:opacity-20"
            >
              <ChevronLeft className="w-4 h-4 mr-2 inline" />
              Previous
            </Button>
          </motion.div>

          {showExplanation ? (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
              <Button onClick={handleNextQuestion} className="w-full rounded-2xl h-14 bg-gradient-to-r from-foreground to-foreground/80 text-background font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:shadow-xl transition-all">
                {currentQuestionIndex === totalQuestions - 1 ? (<><Award className="w-4 h-4 mr-2" />Finish Quiz</>) : (<>Next Question<TrendingUp className="w-4 h-4 ml-2" /></>)}
              </Button>
            </motion.div>
          ) : (
            !quickSubmit && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <Button onClick={() => handleSubmitAnswer()} disabled={!selectedAnswer} className="w-full rounded-2xl h-14 bg-gradient-to-r from-primary to-blue-600 text-primary-foreground font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-primary/30 hover:shadow-xl transition-all disabled:opacity-50">
                  <Shield className="w-4 h-4 mr-2" />
                  Check Answer
                </Button>
              </motion.div>
            )
          )}
        </div>
      </footer>

      {/* Modals */}
      <MCQSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onExit={() => { setShowSettingsModal(false); setShowLeaveModal(true); }}
        quickSubmit={quickSubmit}
        toggleQuickSubmit={() => {
          const newVal = !quickSubmit;
          setQuickSubmit(newVal);
          localStorage.setItem('quickSubmitEnabled', String(newVal));
          toast({ title: newVal ? "⚡ Quick Submit Enabled" : "🐢 Quick Submit Disabled" });
        }}
        soundEnabled={soundEnabled}
        toggleSound={() => {
          const newVal = !soundEnabled;
          setSoundEnabled(newVal);
          localStorage.setItem('mcqSoundDisabled', String(!newVal));
          toast({ title: newVal ? "🔊 Sound Effects ON" : "🔇 Sound Effects OFF" });
        }}
        aiPopupsDisabled={aiPopupsDisabled}
        toggleAiPopups={() => {
          const newVal = !aiPopupsDisabled;
          setAiPopupsDisabled(newVal);
          localStorage.setItem('aiPopupsDisabled', String(newVal));
          toast({ title: newVal ? "🤖 AI Popups Disabled" : "🤖 AI Popups Enabled" });
        }}
        onReport={() => { setShowSettingsModal(false); setShowReportModal(true); }}
        isPremium={isPremium}
        theme={theme}
        setTheme={setTheme}
      />
      <LeaveTestModal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} onConfirm={() => { setShowLeaveModal(false); onBack(); }} />
      <ReportMCQModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onSubmit={handleReportSubmit} isSubmitting={isReportSubmitting} />
      <UpgradeAccountModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgradeClick={handleUpgradeClick} />

      {currentMCQ && (
        <AIChatbot
          isOpen={isChatbotOpen}
          onClose={() => setIsChatbotOpen(false)}
          questionContext={currentMCQ.question}
          explanationContext={currentMCQ.explanation || ''}
          currentAnswer={selectedAnswer}
          correctAnswer={currentMCQ.correct_answer}
          userPlan={userPlanForChatbot}
          isHidden={showExplanation || !quickSubmit} // Hide when navigation (next/prev) or submit buttons are visible
          onOpen={() => setIsChatbotOpen(true)}
        />
      )}
    </div>
  );
};