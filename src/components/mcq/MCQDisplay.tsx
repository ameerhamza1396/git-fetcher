// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock, CheckCircle, XCircle, Timer, Bot, MessageSquare, X, Bookmark,
  BookmarkCheck, Crown, LogOut, AlertTriangle, MoreVertical, Flag, BotOff,
  Moon, Sun, Zap, Sparkles, BookOpen, ChevronLeft, Loader2, Star, Award,
  TrendingUp, Brain, Target, Shield, ShieldAlert, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useReferenceSearch } from '@/hooks/useReferenceSearch';
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
        data-[state=open]:duration-200
        ${className}`}
      style={{ margin: '0 auto' }}
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
  onReport, isPremium, theme, setTheme, onReset
}) => (
  <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
    <ModalContent className="sm:max-w-[400px]">
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
            <Button onClick={onReset} variant="outline" className="w-full rounded-2xl h-12 border-2 border-orange-200 dark:border-orange-900/30 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 font-bold uppercase text-xs tracking-widest">
              <Trash2 className="w-4 h-4 mr-2" /> Reset Session
            </Button>
            <Button onClick={onReport} variant="outline" className="w-full rounded-2xl h-12 border-2 border-red-300 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 font-bold uppercase text-xs tracking-widest">
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

const UpgradeAccountModal = ({ isOpen, onClose, onUpgradeClick, message }) => (
  <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
    <ModalContent className="sm:max-w-[425px]">
      <div className="bg-white dark:bg-zinc-900 border-2 border-yellow-500/30 rounded-2xl p-6 shadow-2xl">
        <DialogPrimitive.Title className="sr-only">Upgrade Your Account</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">Upgrade to premium for unlimited access</DialogPrimitive.Description>
        <div className="flex flex-col items-center text-center">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }} className="mb-4">
            <Crown className="w-16 h-16 text-yellow-500" />
          </motion.div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent mb-2">
            Upgrade Your Account
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">
            {message}
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
    <ModalContent className="sm:max-w-[400px]">
      <div className="bg-white dark:bg-zinc-900 border-2 border-red-200 dark:border-red-900 rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex flex-col items-center text-center p-6">
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
      <ModalContent className="sm:max-w-[450px]">
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
  const contentRef = useRef<HTMLDivElement>(null);
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
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, { selectedAnswer: string }>>({});
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
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("Upgrade to premium for unlimited access!");
  const { search, loading: isSearchingReference, error: referenceError, data: referenceData, setData: setReferenceData } = useReferenceSearch();
  const referenceResults = referenceData?.results || [];

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
      if (currentSubmissions >= 50) { setUpgradeModalMessage("You've reached the daily limit of 50 free MCQ submissions. Upgrade to a premium plan for unlimited practice!"); setShowUpgradeModal(true); return; }
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
    setAnsweredQuestions(prev => ({ ...prev, [currentMCQ.id]: { selectedAnswer: answer || 'No answer (time up)' } }));
    try {
      await supabase.from('user_answers').insert({ user_id: user.id, mcq_id: currentMCQ.id, selected_answer: answer || 'No answer (time up)', is_correct: isCorrect, time_taken: timeTaken });
    } catch (error) { console.error('Error saving answer:', error); }
    setShowExplanation(true);
  };

  const handleResetSession = async () => {
    if (!user) return;
    try {
      // Clear states
      setCurrentQuestionIndex(0);
      setAnsweredQuestions({});
      setScore(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(timePerQuestion);
      setStartTime(Date.now());

      // Clear persistence
      localStorage.removeItem(LAST_ATTEMPTED_MCQ_KEY);
      localStorage.removeItem(LAST_ATTEMPTED_SUBJECT_KEY);
      localStorage.removeItem(LAST_ATTEMPTED_CHAPTER_KEY);
      await removeSavedSessionFromList(user.id, chapter);

      toast({ title: "Session Reset", description: "You're back at the first question." });
      setShowSettingsModal(false);
    } catch (error) {
      toast({ title: "Error", description: "Failed to reset session", variant: "destructive" });
    }
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

  const handleSearchReference = () => {
    if (!currentMCQ) return;
    if (userPlanForChatbot === 'free') {
      setShowUpgradeBanner(true);
      setTimeout(() => setShowUpgradeBanner(false), 5000);
      return;
    }
    search(currentMCQ.question, 3);
  };

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
    const qId = currentMCQ?.id;
    if (qId && answeredQuestions[qId]) {
      setSelectedAnswer(answeredQuestions[qId].selectedAnswer);
      setShowExplanation(true);
    } else {
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  }, [currentQuestionIndex, mcqs, answeredQuestions]);

  useEffect(() => {
    // Only fetch logic here, initialIndex handled within loadMCQs
  }, [subject, chapter, initialIndex]);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    const loadMCQs = async () => {
      setLoading(true);
      const data = await fetchMCQsByChapter(chapter);

      // Load previous answers for this chapter
      let firstUnattemptedIndex = 0;
      if (user?.id) {
        const { data: previousAnswers } = await supabase
          .from('user_answers')
          .select('mcq_id, selected_answer')
          .eq('user_id', user.id)
          .in('mcq_id', data.map(m => m.id));

        if (previousAnswers) {
          const answerMap = {};
          previousAnswers.forEach(ans => {
            answerMap[ans.mcq_id] = { selectedAnswer: ans.selected_answer };
          });
          setAnsweredQuestions(answerMap);

          // Find the first index that hasn't been answered
          const foundIndex = data.findIndex(m => !answerMap[m.id]);
          if (foundIndex !== -1) firstUnattemptedIndex = foundIndex;
          else firstUnattemptedIndex = data.length - 1; // All answered, go to last
        }
      }

      const shuffledMCQs = data.map(mcq => {
        const shuffledOptions = shuffleArray(mcq.options);
        return { ...mcq, shuffledOptions, originalCorrectIndex: shuffledOptions.indexOf(mcq.correct_answer) };
      });
      setMcqs(shuffledMCQs);

      // NEW: Scroll to nearest unattempted
      if (initialIndex > 0) {
        setCurrentQuestionIndex(initialIndex);
      } else {
        setCurrentQuestionIndex(firstUnattemptedIndex);
      }

      setLoading(false);
    };
    loadMCQs();
  }, [chapter, user?.id]);

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

  useEffect(() => {
    setReferenceData(null);
  }, [currentQuestionIndex, setReferenceData]);

  if (loading || profileLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col">
        <div className="h-14 bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="flex-1 p-4 space-y-4">
          <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!mcqs || mcqs.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <BookOpen className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No Questions Found</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">Content for this chapter is being added. Check back soon!</p>
        <Button onClick={onBack} variant="outline" className="rounded-lg">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs.App" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-semibold text-primary">Medmacs.App</span>
          {timerEnabled && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${timeLeft <= 5 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-primary/10 text-primary'}`}>
              {timeLeft}s
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAiGenerated && (
            <div className="flex items-center gap-1 mr-2 px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">AI</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleSaveMCQ} className="w-9 h-9 rounded-lg">
            {isCurrentMCQSaved ? <BookmarkCheck className="w-4 h-4 fill-primary text-primary" /> : <Bookmark className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettingsModal(true)} className="w-9 h-9 rounded-lg">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative px-4 sm:px-6 z-50 flex items-center gap-3 py-3 border-b border-slate-200 dark:border-slate-800 bg-background">
        <span className="text-sm font-bold text-foreground shrink-0">Q{currentQuestionIndex + 1}/{totalQuestions}</span>
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="flex-1 relative z-10 flex flex-col overflow-y-auto">
        <div key={currentQuestionIndex} className="flex flex-col flex-1">
            {/* Question Section */}
            <div className="px-4 sm:px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <p className="text-xs font-semibold text-primary mb-2">Question {currentQuestionIndex + 1}</p>
              <h2 className="text-base sm:text-lg font-semibold text-foreground leading-relaxed">{currentMCQ?.question}</h2>
            </div>

            {/* Options */}
            <div className="flex-1 px-4 sm:px-6 py-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-3">Select your answer:</p>
              {currentMCQ?.shuffledOptions.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentMCQ.correct_answer;
                let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
                if (showExplanation) {
                  if (isSelected && isCorrect) state = 'correct';
                  else if (isSelected && !isCorrect) state = 'incorrect';
                  else if (isCorrect) state = 'correct';
                } else if (isSelected) state = 'selected';

                const getThemeClasses = () => {
                  if (state === 'correct') return 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
                  if (state === 'incorrect') return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300';
                  if (state === 'selected') return 'bg-primary/5 border-primary/30 text-primary dark:text-primary';
                  return 'bg-background border-slate-200 dark:border-slate-700 text-foreground hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800/50';
                };

                return (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showExplanation}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`w-full p-3 sm:p-4 rounded-xl text-left border transition-all flex items-center gap-3 ${getThemeClasses()}`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${state === 'default' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' :
                      state === 'correct' ? 'bg-emerald-500 text-white' :
                        state === 'incorrect' ? 'bg-red-500 text-white' :
                          'bg-primary text-white'
                      }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="flex-1 text-sm sm:text-base font-medium leading-snug">{option}</span>
                    {showExplanation && (isCorrect || isSelected) && (
                      isCorrect ? <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            {showExplanation && (
              <div className="px-4 sm:px-6 py-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Explanation</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{currentMCQ?.explanation || "No explanation provided."}</p>

                {/* Reference Button */}
                <div className="mt-4">
                  {!isSearchingReference && referenceResults.length === 0 && (
                    <Button
                      onClick={handleSearchReference}
                      variant="outline"
                      className="w-full h-10 rounded-lg text-sm font-medium"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Find Book References
                    </Button>
                  )}

                  {isSearchingReference && (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  )}

                  {referenceResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-primary">References</span>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                        {referenceResults.map((ref, idx) => (
                          <div
                            key={idx}
                            className="min-w-[260px] max-w-[260px] p-3 rounded-lg bg-background border border-slate-200 dark:border-slate-700 shrink-0"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
                                {ref.book}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground ml-auto">p. {ref.page}</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                              "{ref.content}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isSearchingReference && referenceError && (
                    <p className="text-xs text-destructive text-center mt-2">No references found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-50 px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-background">
          <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex(prevIndex => prevIndex - 1);
                setTimeLeft(timePerQuestion);
                setStartTime(Date.now());
              }
            }}
            disabled={currentQuestionIndex === 0}
            className="w-28 sm:w-32 h-11 rounded-lg font-medium disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {showExplanation ? (
            <Button
              onClick={handleNextQuestion}
              className="flex-1 h-11 rounded-lg font-semibold bg-primary hover:bg-primary/90"
            >
              {currentQuestionIndex === totalQuestions - 1 ? (
                <>Finish<Award className="w-4 h-4 ml-2" /></>
              ) : (
                <>Next<TrendingUp className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          ) : (
            !quickSubmit && (
              <Button
                onClick={() => handleSubmitAnswer()}
                disabled={!selectedAnswer}
                className="flex-1 h-11 rounded-lg font-semibold bg-primary hover:bg-primary/90 disabled:opacity-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Check Answer
              </Button>
            )
          )}
        </div>
      </footer>

      {/* Modals */}
      <MCQSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onExit={() => { setShowSettingsModal(false); setShowLeaveModal(true); }}
        onReset={handleResetSession}
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
      <UpgradeAccountModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgradeClick={handleUpgradeClick} message={upgradeModalMessage} />

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

      {/* Upgrade Reminder Banner */}
      <AnimatePresence>
        {showUpgradeBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-6 right-6 z-[200]"
          >
            <div className="p-4 rounded-[2.5rem] bg-gradient-to-r from-orange-500 to-amber-500 shadow-2xl shadow-orange-500/30 flex items-center gap-4 border border-white/20">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-0.5">Feature Locked</p>
                <p className="text-sm font-bold text-white tracking-tight leading-tight">Upgrade to Premium to access book references!</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setShowUpgradeBanner(false); setUpgradeModalMessage("Book references are a premium feature. Upgrade to access our complete medical library!"); setShowUpgradeModal(true); }}
                className="rounded-full h-10 px-6 font-black uppercase text-[10px] tracking-widest"
              >
                Upgrade
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};