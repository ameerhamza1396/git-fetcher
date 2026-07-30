import { forwardRef, lazy, Suspense, useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Clock, CheckCircle, XCircle, Timer, Bot, MessageSquare, X, Bookmark,
  BookmarkCheck, Crown, LogOut, AlertTriangle, MoreVertical, Flag, BotOff,
  Moon, Sun, Zap, Sparkles, BookOpen, ChevronLeft, Loader2, Star, Award,
  TrendingUp, Brain, Target, Shield, ShieldAlert, Trash2, Menu, Lock, RotateCcw, WifiOff,
  ThumbsUp, ThumbsDown, MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useReferenceSearch } from '@/hooks/useReferenceSearch';
import { aiApiJson } from '@/utils/aiApi';
import { isAiPolicyNotice } from '@/utils/aiPolicyNotice';
import { fetchChapterById, fetchSubjectById, Chapter, Subject } from '@/utils/mcqData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { playCorrectSound, playIncorrectSound } from '@/utils/soundEffects';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from 'next-themes';
import { ChapterDownloadButton } from '@/components/mcq/ChapterDownloadButton';
import { useOfflineChapterStatus } from '@/hooks/useOfflineChapterStatus';
import {
  getQueuedMCQAnswerIds,
  queueMCQAnswerForSync,
  subscribeOfflineAnswerChanges,
} from '@/utils/offlineAnswerSync';

import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { MCQTimer } from '@/features/mcq/components/MCQTimer';
import { MCQAnswerOption } from '@/features/mcq/components/MCQAnswerOption';
import {
  clearPreparedMCQQuiz,
  ChapterLockedError,
  prepareMCQQuiz,
  type PreparedMCQ,
} from '@/features/mcq/quizBootstrap';
import { MCQQuestionMapDrawer } from '@/features/mcq/components/MCQQuestionMapDrawer';
import MCQLoadingSkeleton from '@/features/mcq/components/MCQLoadingSkeleton';
import {
  getPakistanDateKey,
  cacheMCQPlan,
  mergeLocalMCQAttemptCount,
  readCachedMCQPlan,
  reserveLocalMCQAttempt,
  setLocalMCQAttemptCount,
} from '@/utils/mcqAttemptQuota';

const LazyAIChatbot = lazy(() =>
  import('./AIChatbot').then((module) => ({ default: module.AIChatbot })),
);

interface MCQDisplayProps {
  subject: string;
  chapter: string;
  onBack: () => void;
  timerEnabled?: boolean;
  timePerQuestion?: number;
  initialIndex?: number;
  isAiGenerated?: boolean;
  mistakeMode?: boolean;
  mistakeMcqIds?: string[];
  initialSubject?: Subject | null;
  initialChapter?: Chapter | null;
}

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

let savedSessionSyncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingSavedSessionSync: { userId: string; sessions: SavedMCQSession[] } | null = null;

const flushSavedSessions = async () => {
  if (savedSessionSyncTimer) {
    clearTimeout(savedSessionSyncTimer);
    savedSessionSyncTimer = null;
  }
  const pending = pendingSavedSessionSync;
  pendingSavedSessionSync = null;
  if (!pending) return;
  const { error } = await supabase
    .from('profiles')
    .update({ in_progress_mcqs: pending.sessions })
    .eq('id', pending.userId);
  if (error) console.warn('Unable to sync saved MCQ sessions:', error);
};

const updateSavedSessionsList = (userId: string | undefined, subjectId: string, chapterId: string, lastIndex: number) => {
  if (typeof window === 'undefined') return;
  try {
    const localData = localStorage.getItem(SAVED_SESSIONS_LIST_KEY);
    let sessions: SavedMCQSession[] = localData ? JSON.parse(localData) : [];
    sessions = sessions.filter(s => s.chapterId !== chapterId);
    sessions.unshift({ subjectId, chapterId, lastIndex, timestamp: new Date().toISOString() });
    if (sessions.length > 5) sessions = sessions.slice(0, 5);
    localStorage.setItem(SAVED_SESSIONS_LIST_KEY, JSON.stringify(sessions));
    if (userId) {
      pendingSavedSessionSync = { userId, sessions };
      if (savedSessionSyncTimer) clearTimeout(savedSessionSyncTimer);
      savedSessionSyncTimer = setTimeout(() => {
        void flushSavedSessions();
      }, 2500);
    }
  } catch (e) { console.error("Failed to update saved sessions array", e); }
};

const removeSavedSessionFromList = async (userId: string | undefined, chapterId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const localData = localStorage.getItem(SAVED_SESSIONS_LIST_KEY);
    let sessions: SavedMCQSession[] = localData ? JSON.parse(localData) : [];
    sessions = sessions.filter(s => s.chapterId !== chapterId);
    localStorage.setItem(SAVED_SESSIONS_LIST_KEY, JSON.stringify(sessions));
    if (userId) {
      pendingSavedSessionSync = { userId, sessions };
      await flushSavedSessions();
    }
  } catch (e) { console.error("Failed to remove saved session from array", e); }
};

// ─── Custom Modal primitives ───────────────────────────────────────────────────
// We bypass shadcn's Dialog wrapper and use Radix primitives directly with
// explicit z-[200]/z-[201] so they always render above the z-[100] quiz container.
// The overlay uses a fully opaque dark background so the card beneath doesn't bleed through.

const ModalOverlay = forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className = '', ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={`fixed inset-0 bg-black/75 z-[200]
      data-[state=open]:animate-in data-[state=closed]:animate-out
      data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
    {...props}
  />
));
ModalOverlay.displayName = 'ModalOverlay';

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

const MenuModalContent = ({ children }) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:duration-150 data-[state=open]:duration-150" />
    <DialogPrimitive.Content
      className="fixed right-3 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[201] max-h-[calc(100dvh-env(safe-area-inset-top)-4.5rem)] w-[calc(100%-1.5rem)] max-w-[400px] origin-top-right overflow-y-auto outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:duration-150 data-[state=open]:duration-180"
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
  onReport, isPremium, theme, setTheme, onReset, downloadSubject, downloadChapter
}) => {
  const { status: offlineStatus } = useOfflineChapterStatus(downloadChapter?.id);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <MenuModalContent>
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
          {downloadSubject && downloadChapter && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{downloadChapter.name}</p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-widest font-black">
                  {offlineStatus === 'downloaded'
                    ? 'This chapter is available for offline use'
                    : 'Save this chapter offline'}
                </p>
              </div>
              <ChapterDownloadButton subject={downloadSubject} chapter={downloadChapter} compact />
            </div>
          )}

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
              <Switch checked={!aiPopupsDisabled} onCheckedChange={toggleAiPopups} className="data-[state=checked]:bg-blue-500" />
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
      </MenuModalContent>
    </DialogPrimitive.Root>
  );
};

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

const formatSimilarity = (score?: number) => {
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  const percent = score <= 1 ? score * 100 : score;
  return `${Math.round(percent)}%`;
};

const REFERENCE_VERIFICATION_COPY = {
  verified: {
    label: 'Question verified',
    tone: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
  },
  incorrect: {
    label: 'Question appears incorrect',
    tone: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30',
  },
  no_references: {
    label: 'No references found',
    tone: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
  },
  unconfirmed: {
    label: 'Could not confirm authenticity',
    tone: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-zinc-950',
  },
};

const isInternalVerification = (sourceBasis = '') =>
  ['internal', 'book', 'books', 'rag'].includes(String(sourceBasis).toLowerCase());

const isExternalVerification = (sourceBasis = '') =>
  ['external', 'llm_knowledge'].includes(String(sourceBasis).toLowerCase());

const EXTERNAL_VERIFIED_PREFIX = 'No internal reference found, however question appears to be correct.';

const isGenericReferenceBook = (book = '') =>
  /^(reference source|referece source|reference)$/i.test(String(book).trim());

const getVerificationDisplay = (verification) => {
  if (verification?.verdict === 'incorrect' || verification?.markedAnswerWrong) {
    return {
      icon: XCircle,
      label: 'Question proven incorrect',
      tone: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30',
      chip: 'bg-red-500/10 text-red-700 dark:text-red-300',
    };
  }

  if (verification?.verdict === 'verified') {
    const internal = isInternalVerification(verification?.sourceBasis);
    const external = isExternalVerification(verification?.sourceBasis);
    return {
      icon: CheckCircle,
      label: internal ? 'Reference found' : external ? 'Question verified' : 'Question verified',
      tone: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
      chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    };
  }

  return {
    icon: XCircle,
    label: 'Question unverified',
    tone: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
    chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  };
};

const VerificationStatusIcon = ({ icon: Icon, className }) => (
  <Icon aria-hidden="true" className={`shrink-0 ${className}`} />
);

const ReferenceModal = ({
  isOpen,
  onClose,
  references,
  isLoading,
  error,
  selectedIndex,
  setSelectedIndex,
  confirmedIndexes,
  verification,
  summary,
  isSummarizing,
  onSummarize,
  onLearnMore,
  onSummaryUpgrade,
  summaryCount,
  summaryLimitReached,
  isConfirming,
  onConfirm,
  isPremium,
  canUseAiSummary,
  offlineMessage
}) => {
  const hasConfirmed = Array.isArray(confirmedIndexes);
  const hasSummary = Boolean(summary?.summary);
  const policyError = error && isAiPolicyNotice(error);
  const visibleReferences = Array.isArray(references)
    ? hasConfirmed
      ? confirmedIndexes.map(index => references[index]).filter(Boolean)
      : references
    : [];

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onClose}>
      <ModalContent className="max-w-[720px]">
        <div className="bg-white dark:bg-zinc-900 border-2 border-primary/20 rounded-3xl shadow-2xl max-h-[86vh] overflow-hidden flex flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <DialogPrimitive.Title className="flex items-center gap-2 text-lg font-black text-zinc-900 dark:text-zinc-100">
                <CheckCircle className="h-5 w-5 text-primary" />
                Question Verification
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-xs text-muted-foreground">
                Dr Ahroid verifies the question first. Summary is optional.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 shrink-0 rounded-full p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <motion.div layout className="flex-1 overflow-y-auto px-5 py-4">
            {offlineMessage ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
                  <WifiOff className="h-6 w-6" />
                </div>
                <p className="text-sm font-black uppercase tracking-wider">This feature is not available offline</p>
                <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">{offlineMessage}</p>
              </div>
            ) : null}

            <AnimatePresence mode="wait" initial={false}>
            {isConfirming ? (
              <motion.div
                key="verification-skeleton"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mb-4 min-h-[156px] rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-zinc-950"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-11/12" />
                  <Skeleton className="h-3 w-8/12" />
                </div>
                <div className="mt-4 flex gap-2 overflow-hidden">
                  <Skeleton className="h-6 w-32 shrink-0 rounded-full" />
                  <Skeleton className="h-6 w-28 shrink-0 rounded-full" />
                  <Skeleton className="h-6 w-36 shrink-0 rounded-full" />
                </div>
              </motion.div>
            ) : verification ? (() => {
              const display = getVerificationDisplay(verification);
              return (
                <motion.div
                  key="verification-result"
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className={`mb-4 min-h-[156px] rounded-2xl border p-4 text-sm ${display.border}`}
                >
                  <div className="flex items-center gap-3">
                    <VerificationStatusIcon icon={display.icon} className={`h-7 w-7 ${display.tone}`} />
                    <div>
                      <div className={`font-black ${display.tone}`}>{display.label}</div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Dr Ahroid · {verification.cached ? 'cached · ' : ''}{verification.sourceBasis || 'none'}
                      </div>
                    </div>
                  </div>
                  {verification.summary && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{verification.summary}</p>
                  )}
                  {isInternalVerification(verification.sourceBasis) && verification.verdict !== 'no_references' && Array.isArray(verification.citations) && verification.citations.length > 0 && (
                    <div className="mt-3 flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                      {verification.citations.map((citation, index) => (
                        <span
                          key={`${citation.book || citation.title}-${citation.page || index}-${index}`}
                          className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {citation.book || citation.title || 'Reference'}{citation.page ? ` p. ${citation.page}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                  {verification.autoReported && (
                    <p className="mt-2 text-xs font-bold text-red-600 dark:text-red-300">Auto-reported because Dr Ahroid found the marked answer likely wrong.</p>
                  )}
                </motion.div>
              );
            })() : null}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
            {isSummarizing ? (
              <motion.div
                key="summary-skeleton"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mb-4 min-h-[132px] rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-zinc-950"
              >
                <Skeleton className="h-4 w-24" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-10/12" />
                  <Skeleton className="h-3 w-7/12" />
                </div>
              </motion.div>
            ) : summary ? (
              <motion.div
                key="summary-result"
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="mb-4 min-h-[132px] rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm"
              >
                <div className="font-black text-primary">AI Summary</div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{summary.summary}</p>
                {Array.isArray(summary.citations) && summary.citations.length > 0 && (
                  <div className="mt-3 flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                    {summary.citations.map((citation, index) => (
                      <span
                        key={`${citation.book || citation.title || 'Citation'}-${citation.page || index}-${index}`}
                        className="shrink-0 whitespace-nowrap rounded-full border border-primary/20 bg-background/70 px-2 py-1 text-[10px] font-bold text-primary"
                      >
                        {citation.book || citation.title || 'Reference'}{citation.page ? ` p. ${citation.page}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={onLearnMore} className="mt-3 h-8 rounded-xl text-xs font-bold">
                  <MessageCircle className="mr-2 h-3.5 w-3.5" /> Learn more with Dr Ahroid
                </Button>
              </motion.div>
            ) : null}
            </AnimatePresence>

            {!offlineMessage && !isConfirming && !isSummarizing && !summary && error && (
              <div className={policyError
                ? "mx-auto max-w-sm py-6 text-center text-sm text-muted-foreground"
                : "rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
              }>
                <p>{policyError ? error : 'AI references are unavailable right now.'}</p>
                {policyError && (
                  <a href="/pricing" className="mt-2 inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline">
                    View upgrade options
                  </a>
                )}
              </div>
            )}

            {!offlineMessage && !isConfirming && isLoading && !verification && !isSummarizing && !summary && !error && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-zinc-950">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-3 h-3 w-full" />
                <Skeleton className="mt-2 h-3 w-8/12" />
              </div>
            )}

            {!offlineMessage && !isConfirming && !isLoading && !summary && visibleReferences.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Book References
                  </h3>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                    {visibleReferences.length}
                  </span>
                </div>

                {visibleReferences.map((reference, index) => {
                  const shouldShowText = reference.show_extracted_text === true || reference.showExtractedText === true;
                  const contextScore = typeof reference.score === 'number'
                    ? Math.max(0, Math.min(100, Math.round(reference.score <= 1 ? reference.score * 100 : reference.score)))
                    : null;

                  return (
                    <div
                      key={`${reference.book || 'Reference'}-${reference.page || index}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-zinc-950/80"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                            {reference.book || 'Reference'}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {reference.page ? `Page ${reference.page}` : 'Page not listed'}
                          </p>
                        </div>
                        <div className="min-w-[150px]">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              AI Confidence
                            </span>
                            <span className="text-[10px] font-black text-primary">
                              {contextScore === null ? 'N/A' : `${contextScore}%`}
                            </span>
                          </div>
                          <Progress value={contextScore ?? 0} className="h-2" />
                        </div>
                      </div>

                      {shouldShowText && reference.content && (
                        <div className="mt-3 rounded-xl border border-primary/10 bg-primary/5 p-3">
                          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-primary">
                            Extracted Text
                          </p>
                          <p className="whitespace-pre-wrap text-xs font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                            {reference.content}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            )}
          </motion.div>

          <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="mb-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-[11px] font-medium leading-relaxed text-muted-foreground dark:border-slate-800 dark:bg-slate-900/40">
              <p>
                <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">DCMA Disclaimer: </span>
                References are provided for educational verification and study support. If you believe any referenced
                material infringes your rights, review our{' '}
                <a href="/dcma" className="font-bold text-slate-600 underline underline-offset-4 hover:text-primary dark:text-slate-300">
                  DCMA Page
                </a>{' '}
                or contact{' '}
                <a href="mailto:legal@medmacs.app" className="font-bold text-slate-600 underline underline-offset-4 hover:text-primary dark:text-slate-300">
                  legal@medmacs.app
                </a>.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={onSummarize}
                disabled={Boolean(offlineMessage) || isSummarizing || isLoading}
                className="rounded-xl disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 dark:disabled:border-slate-800 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
              >
                {isSummarizing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...</>
                ) : hasSummary ? (
                  <><RotateCcw className="mr-2 h-4 w-4" /> Reload Summary</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> AI Summary</>
                )}
              </Button>
              <Button
                onClick={onConfirm}
                disabled={Boolean(offlineMessage) || isConfirming || isLoading || hasConfirmed}
                className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isConfirming ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...</>
                ) : hasConfirmed ? (
                  <><CheckCircle className="mr-2 h-4 w-4" /> Confirmed by Dr Ahroid</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Confirm with Dr Ahroid</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </ModalContent>
    </DialogPrimitive.Root>
  );
};

export const MCQDisplay = ({
  subject,
  chapter,
  onBack,
  timerEnabled = false,
  timePerQuestion = 30,
  initialIndex = 0,
  isAiGenerated = false,
  mistakeMode = false,
  mistakeMcqIds = [],
  initialSubject,
  initialChapter,
}: MCQDisplayProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mcqs, setMcqs] = useState<PreparedMCQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterLockMessage, setChapterLockMessage] = useState<string | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const [preparationAttempt, setPreparationAttempt] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [score, setScore] = useState(0);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [usedAiHelpByQuestion, setUsedAiHelpByQuestion] = useState<Record<string, boolean>>({});
  const helpToastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownOfflineSyncToastRef = useRef(false);
  const [savedMcqIds, setSavedMcqIds] = useState<Set<string>>(new Set());
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hasOpenedSettingsMenu, setHasOpenedSettingsMenu] = useState(false);
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [hasAttemptedAny, setHasAttemptedAny] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const isSubmittingAnswerRef = useRef(false);
  const hasUserInteractedRef = useRef(false);
  const answerSelectImplementationRef = useRef<(answer: string) => void>(() => undefined);
  const stableAnswerSelectRef = useRef((answer: string) => {
    answerSelectImplementationRef.current(answer);
  });
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  });
  const [quickSubmit, setQuickSubmit] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('quickSubmitEnabled') !== 'false';
    return true;
  });
  const [feedbackType, setFeedbackType] = useState<'correct' | 'incorrect' | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, { selectedAnswer: string }>>({});
  const [queuedAnswerIds, setQueuedAnswerIds] = useState<Set<string>>(new Set());
  const [aiPopupsDisabled, setAiPopupsDisabled] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('aiPopupsDisabled') === 'true';
    return false;
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('mcqSoundDisabled') !== 'true';
    return true;
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [dailySubmissionsCount, setDailySubmissionsCount] = useState(0);
  const [cachedUserPlan, setCachedUserPlan] = useState<string | null>(null);
  const [lastSubmissionResetDate, setLastSubmissionResetDate] = useState<string | null>(null);
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("Upgrade to premium for unlimited access!");
  const [isReferenceModalOpen, setIsReferenceModalOpen] = useState(false);
  const [offlineReferenceMessage, setOfflineReferenceMessage] = useState('');
  const [selectedReferenceIndex, setSelectedReferenceIndex] = useState<number | null>(null);
  const [confirmedReferenceIndexes, setConfirmedReferenceIndexes] = useState<number[] | null>(null);
  const [referenceVerification, setReferenceVerification] = useState<any>(null);
  const [referenceSummary, setReferenceSummary] = useState<any>(null);
  const [optionExplanations, setOptionExplanations] = useState<Record<string, { verdict: string; explanation: string }>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [savingQuestionFeedback, setSavingQuestionFeedback] = useState(false);
  const [chatPrefillPrompt, setChatPrefillPrompt] = useState('');
  const [referenceActionError, setReferenceActionError] = useState('');
  const [isSummarizingReferences, setIsSummarizingReferences] = useState(false);
  const [isExplainingOptions, setIsExplainingOptions] = useState(false);
  const [summaryGenerationCounts, setSummaryGenerationCounts] = useState<Record<string, number>>({});
  const [explainGenerationCounts, setExplainGenerationCounts] = useState<Record<string, number>>({});
  const [isConfirmingReferences, setIsConfirmingReferences] = useState(false);
  const [downloadSubject, setDownloadSubject] = useState<Subject | null>(initialSubject ?? null);
  const [downloadChapter, setDownloadChapter] = useState<Chapter | null>(initialChapter ?? null);
  const { search, loading: isSearchingReference, error: referenceError, data: referenceData, setData: setReferenceData } = useReferenceSearch();
  const referenceResults = referenceData?.results || [];

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profileForChatbot', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('plan, daily_mcq_submissions, last_submission_reset_date, full_name').eq('id', user.id).maybeSingle();
      if (error) { console.error('Error fetching profile for chatbot:', error); return null; }
      return data;
    },
    enabled: !!user?.id
  });

  const userPlanForChatbot = profile?.plan?.toLowerCase() || cachedUserPlan || 'free';
  const isPremium = true;
  const canUseAiSummary = true;
  const isSubjectFreeUnlimited = downloadSubject?.free_unlimited_access === true;

  const currentMCQ = mcqs[currentQuestionIndex];
  const isCurrentMCQSaved = currentMCQ ? savedMcqIds.has(currentMCQ.id) : false;
  const totalQuestions = mcqs.length;
  const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;
  const effectiveQuickSubmit = quickSubmit;
  const mistakeMcqIdsKey = mistakeMcqIds.join('|');

  const normalizeCitations = (citations: any) =>
    Array.isArray(citations)
      ? citations
          .map((citation: any) => ({
            book: String(
              citation?.book ||
              citation?.title ||
              citation?.source ||
              citation?.source_name ||
              citation?.metadata?.book ||
              citation?.metadata?.title ||
              citation?.metadata?.source ||
              'Reference'
            ),
            page: Number(
              citation?.page ||
              citation?.page_number ||
              citation?.pageNumber ||
              citation?.metadata?.page ||
              citation?.metadata?.page_number ||
              0
            ),
            score: typeof citation?.score === 'number' ? citation.score : undefined,
          }))
          .filter(citation => citation.book && !isGenericReferenceBook(citation.book))
      : [];

  const readCachedVerification = async () => {
    if (!currentMCQ?.id) return null;

    const { data, error } = await (supabase.from('question_reference_verifications') as any)
      .select('verdict, source_basis, summary, citations, correct_answer_suggestion, marked_answer_wrong, auto_reported')
      .eq('mcq_id', currentMCQ.id)
      .maybeSingle();

    if (error) {
      console.warn('Reference verification cache read failed:', error);
      return null;
    }

    if (!data) return null;
    const cachedSourceBasis = data.source_basis || 'none';
    const cachedVerdict = data.verdict || 'unconfirmed';
    const citations = isInternalVerification(cachedSourceBasis) && cachedVerdict !== 'no_references'
      ? normalizeCitations(data.citations)
      : [];
    const staleVerifiedBookCache =
      data.verdict === 'verified' &&
      isInternalVerification(cachedSourceBasis) &&
      citations.length === 0;

    if (staleVerifiedBookCache) return null;

    const cachedSummary = String(data.summary || '').trim();

    return {
      verdict: cachedVerdict,
      sourceBasis: cachedSourceBasis,
      summary: cachedVerdict === 'verified' && isExternalVerification(cachedSourceBasis)
        ? cachedSummary.startsWith(EXTERNAL_VERIFIED_PREFIX)
          ? cachedSummary
          : `${EXTERNAL_VERIFIED_PREFIX}${cachedSummary ? ` ${cachedSummary}` : ''}`
        : cachedSummary,
      citations,
      correctAnswerSuggestion: data.correct_answer_suggestion || '',
      markedAnswerWrong: data.marked_answer_wrong === true,
      autoReported: data.auto_reported === true,
      cached: true,
    };
  };

  const cacheVerification = async (verification: any) => {
    if (!user || !currentMCQ?.id) return;

    const { error } = await (supabase.from('question_reference_verifications') as any)
      .upsert({
        mcq_id: currentMCQ.id,
        verdict: verification.verdict,
        source_basis: verification.sourceBasis,
        summary: verification.summary || '',
        citations: normalizeCitations(verification.citations),
        correct_answer_suggestion: verification.correctAnswerSuggestion || '',
        marked_answer_wrong: verification.markedAnswerWrong === true,
        auto_reported: verification.autoReported === true,
        verified_by: user.id,
      }, { onConflict: 'mcq_id' });

    if (error) {
      console.warn('Reference verification cache write failed:', error);
    }
  };

  const saveQuestionFeedback = async (feedback: 'up' | 'down') => {
    if (!user || !currentMCQ?.id || savingQuestionFeedback) return;
    setSavingQuestionFeedback(true);
    setQuestionFeedback(prev => ({ ...prev, [currentMCQ.id]: feedback }));
    try {
      const { error } = await (supabase.from('question_feedbacks') as any).upsert({
        user_id: user.id,
        mcq_id: currentMCQ.id,
        feedback,
      }, { onConflict: 'user_id,mcq_id' });
      if (error) throw error;
      toast({ title: 'Feedback saved', description: 'Thanks for helping improve this question.' });
    } catch (error) {
      console.error('Question feedback save failed:', error);
      toast({ title: 'Feedback not saved', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setSavingQuestionFeedback(false);
    }
  };

  const handleTimeUp = () => {
    if (!showExplanation && !selectedAnswer && !isSubmittingAnswerRef.current) handleSubmitAnswer(true);
  };

  const handleAnswerSelect = (answer: string) => {
    if (showExplanation) return;
    hasUserInteractedRef.current = true;
    setSelectedAnswer(answer);
    if (effectiveQuickSubmit) setTimeout(() => handleSubmitAnswer(false, answer), 150);
  };
  answerSelectImplementationRef.current = handleAnswerSelect;

  const handleSubmitAnswer = async (timeUp = false, providedAnswer?: string) => {
    if (!currentMCQ || !user || showExplanation || isSubmittingAnswerRef.current) return;
    isSubmittingAnswerRef.current = true;
    setIsSubmittingAnswer(true);

    try {
      setHasAttemptedAny(true);

      let subjectIsFreeUnlimited = isSubjectFreeUnlimited;
      if (userPlanForChatbot === 'free' && !downloadSubject) {
        const subjectData = await fetchSubjectById(subject);
        setDownloadSubject(subjectData);
        subjectIsFreeUnlimited = subjectData?.free_unlimited_access === true;
      }

      let reservedSubmissionCount = dailySubmissionsCount;
      if (userPlanForChatbot === 'free' && !subjectIsFreeUnlimited) {
        const reservation = reserveLocalMCQAttempt(
          user.id,
          dailySubmissionsCount,
          lastSubmissionResetDate,
        );
        if (!reservation.allowed) {
          setUpgradeModalMessage(
            isOnline
              ? "You've reached the daily limit of 50 free MCQ submissions. Upgrade to a premium plan for unlimited practice!"
              : "Offline mode: you've reached today's limit of 50 free MCQ submissions. Reconnect or upgrade for unlimited practice."
          );
          setShowUpgradeModal(true);
          return;
        }
        reservedSubmissionCount = reservation.count;
        setDailySubmissionsCount(reservation.count);
        setLastSubmissionResetDate(new Date().toISOString());
      }
      const answer = timeUp ? '' : (providedAnswer || selectedAnswer);
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      const isCorrect = answer === currentMCQ.correct_answer;
      const usedAiHelp = !!usedAiHelpByQuestion[currentMCQ.id];

      setFeedbackType(isCorrect ? 'correct' : 'incorrect');
      setTimeout(() => setFeedbackType(null), 1000);

      if (soundEnabled) {
        if (isCorrect && !timeUp) playCorrectSound();
        else playIncorrectSound();
      }
      if (isCorrect && !timeUp) setScore(prev => prev + 1);
      setAnsweredQuestions(prev => ({ ...prev, [currentMCQ.id]: { selectedAnswer: answer || 'No answer (time up)' } }));
      const answerRow = {
        user_id: user.id,
        mcq_id: currentMCQ.id,
        selected_answer: answer || 'No answer (time up)',
        is_correct: isCorrect,
        time_taken: timeTaken,
        used_ai_help: usedAiHelp,
        correction_mode: mistakeMode,
        client_attempt_id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${user.id}:${currentMCQ.id}:${Date.now()}`,
      };
      clearPreparedMCQQuiz({
        chapterId: chapter,
        userId: user.id,
        mistakeMode,
        mistakeMcqIds,
      });

      setShowExplanation(true);

      const answeredMcqId = currentMCQ.id;
      void (async () => {
        try {
          const countsTowardDailyLimit =
            userPlanForChatbot === 'free' && !subjectIsFreeUnlimited;
          const { data: saveResult, error: atomicSaveError } = await supabase.rpc(
            'save_mcq_answer',
            {
              p_answer: answerRow,
              p_subject_id: subject,
              p_counts_toward_daily_limit: countsTowardDailyLimit,
            },
          );

          if (!atomicSaveError) {
            const result = saveResult as {
              quota?: { allowed?: boolean; count?: number };
            } | null;
            if (typeof result?.quota?.count === 'number') {
              const mergedCount = mergeLocalMCQAttemptCount(
                user.id,
                result.quota.count,
                new Date().toISOString(),
              );
              setDailySubmissionsCount(mergedCount);
            }
            if (result?.quota?.allowed === false) {
              setLocalMCQAttemptCount(user.id, 50);
              setDailySubmissionsCount(50);
            }
          } else {
            const { error: batchError } = await supabase.rpc('upsert_mcq_answers', {
              p_answers: [answerRow],
            });
            if (batchError) {
              const { error: insertError } = await supabase.from('user_answers').insert(answerRow);
              if (insertError) throw insertError;
            }
          }
          if (atomicSaveError && countsTowardDailyLimit) {
            await supabase.rpc('reconcile_mcq_submission_count', {
              p_attempt_date: getPakistanDateKey(),
              p_count: reservedSubmissionCount,
            });
          }
          const achievementModule = await import('@/components/profile/AchievementBadges');
          achievementModule.notifyAchievementProgress('mcq_answer');
        } catch (error) {
          console.error('Error saving answer, queued for offline sync:', error);
          try {
            await queueMCQAnswerForSync(answerRow);
            setQueuedAnswerIds((previous) => new Set(previous).add(answeredMcqId));
            if (!hasShownOfflineSyncToastRef.current) {
              hasShownOfflineSyncToastRef.current = true;
              toast({
                title: 'Answers saved offline',
                description: 'Your MCQ attempts will sync automatically when the connection returns.',
              });
            }
          } catch (queueError) {
            console.error('Error queueing offline answer:', queueError);
            toast({
              title: 'Answer not synced',
              description: 'This answer could not be saved for sync on this device.',
              variant: 'destructive',
            });
          }
        }
      })();
    } finally {
      isSubmittingAnswerRef.current = false;
      setIsSubmittingAnswer(false);
    }
  };

  const handleResetSession = async () => {
    if (!user) return;
    try {
      // Clear states
      setCurrentQuestionIndex(0);
      setAnsweredQuestions({});
      setUsedAiHelpByQuestion({});
      setScore(0);
      setSelectedAnswer(null);
      setShowExplanation(false);
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
    hasUserInteractedRef.current = true;
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
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
        setSavedMcqIds((previous) => {
          const next = new Set(previous);
          next.delete(currentMCQ.id);
          return next;
        });
        toast({ title: "📚 MCQ Unsaved", description: "Removed from your bookmarks" });
      } else {
        await supabase.from('saved_mcqs').insert({ user_id: user.id, mcq_id: currentMCQ.id });
        const achievementModule = await import('@/components/profile/AchievementBadges');
        achievementModule.notifyAchievementProgress('saved_mcq');
        setSavedMcqIds((previous) => new Set(previous).add(currentMCQ.id));
        toast({ title: "⭐ MCQ Saved!", description: "Added to your bookmarks" });
      }
    } catch {
      toast({
        title: "Could not update bookmark",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
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

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setStartTime(Date.now());
    setIsDrawerOpen(false);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const isQuestionAnswered = (mcqId: string) => answeredQuestions[mcqId] !== undefined;

  const showOfflineFeatureToast = (feature = 'This feature') => {
    toast({
      title: `${feature} is not available offline`,
      description: 'Connect to the internet and try again.',
      variant: 'destructive',
    });
  };

  const handleSearchReference = async () => {
    if (!currentMCQ) return;
    if (!isOnline) {
      setSelectedReferenceIndex(null);
      setConfirmedReferenceIndexes(null);
      setReferenceVerification(null);
      setReferenceSummary(null);
      setOptionExplanations({});
      setReferenceActionError('');
      setReferenceData(null);
      setOfflineReferenceMessage('Connect to the internet and try again.');
      setIsReferenceModalOpen(true);
      return;
    }
    setSelectedReferenceIndex(null);
    setConfirmedReferenceIndexes(null);
    setReferenceVerification(null);
    setReferenceSummary(null);
    setOptionExplanations({});
    setReferenceActionError('');
    setOfflineReferenceMessage('');
    setIsReferenceModalOpen(true);
    const [cached] = await Promise.all([
      readCachedVerification(),
      search(currentMCQ.question, 5),
    ]);
    if (cached) setReferenceVerification(cached);
  };

  const getFallbackConfirmedReferenceIndexes = (references = referenceResults) => {
    const words = `${currentMCQ?.question || ''} ${currentMCQ?.correct_answer || ''} ${currentMCQ?.explanation || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    const uniqueWords = Array.from(new Set(words));

    return references
      .map((ref, index) => {
        const content = `${ref.content || ''}`.toLowerCase();
        const matches = uniqueWords.filter(word => content.includes(word)).length;
        return { index, matches, score: ref.score || 0 };
      })
      .filter(item => item.matches >= 2 || item.score >= 0.72)
      .sort((a, b) => b.matches - a.matches || b.score - a.score)
      .slice(0, 3)
      .map(item => item.index);
  };

  const autoReportQuestion = async (reason: string) => {
    if (!user || !currentMCQ) return false;

    const { error } = await supabase.from('reported_questions').insert({
      user_id: user.id,
      mcq_id: currentMCQ.id,
      reason,
      status: 'pending'
    });

    if (error) {
      console.error('Auto-report failed:', error);
      return false;
    }

    return true;
  };

  const handleConfirmReferences = async (localReferences = referenceResults) => {
    if (!currentMCQ || isConfirmingReferences) return;
    if (!isOnline) {
      showOfflineFeatureToast('AI reference verification');
      return;
    }

    setIsConfirmingReferences(true);
    setReferenceActionError('');
    try {
      const cachedVerification = await readCachedVerification();
      if (cachedVerification) {
        setReferenceVerification(cachedVerification);
        setConfirmedReferenceIndexes([]);
        toast({ title: "Verification loaded", description: "Using saved Dr Ahroid verification for this question." });
        return;
      }

      const parsed = await aiApiJson<any>('reference-verify', {
        question: currentMCQ.question,
        correctAnswer: currentMCQ.correct_answer,
        options: currentMCQ.shuffledOptions || currentMCQ.options || [],
        explanation: currentMCQ.explanation || '',
      });
      const explicitNoInternalReferences =
        parsed?.verdict === 'no_references' ||
        ['none', 'external', 'llm_knowledge'].includes(String(parsed?.sourceBasis || '').toLowerCase());
      const matchingIndexes = Array.isArray(parsed?.matchingIndexes)
        ? parsed.matchingIndexes.filter(index => Number.isInteger(index) && index >= 0 && index < localReferences.length)
        : [];
      const finalIndexes = explicitNoInternalReferences
        ? []
        : (matchingIndexes.length > 0 ? matchingIndexes : getFallbackConfirmedReferenceIndexes(localReferences));
      const allowedVerdicts = ['verified', 'incorrect', 'no_references', 'unconfirmed'];
      const verdict = allowedVerdicts.includes(parsed?.verdict)
        ? parsed.verdict
        : (finalIndexes.length > 0 ? 'verified' : 'unconfirmed');
      const sourceBasis = explicitNoInternalReferences ? (parsed?.sourceBasis || 'none') : (parsed?.sourceBasis || 'internal');
      const apiCitations = normalizeCitations(parsed?.citations);
      const localCitations = normalizeCitations(finalIndexes.map(index => localReferences[index]).filter(Boolean));
      const citations = isInternalVerification(sourceBasis) && verdict !== 'no_references'
        ? (apiCitations.length > 0 ? apiCitations : localCitations)
        : [];
      const shouldAutoReport = verdict === 'incorrect' || parsed?.markedAnswerWrong === true;
      let autoReported = false;
      const normalizedSummary = String(parsed?.summary || '').trim();
      const summary = verdict === 'verified' && isExternalVerification(sourceBasis)
        ? normalizedSummary.startsWith(EXTERNAL_VERIFIED_PREFIX)
          ? normalizedSummary
          : `${EXTERNAL_VERIFIED_PREFIX}${normalizedSummary ? ` ${normalizedSummary}` : ''}`
        : normalizedSummary;

      setConfirmedReferenceIndexes(finalIndexes);
      if (shouldAutoReport) {
        autoReported = await autoReportQuestion(
          `Auto-report by Dr Ahroid: marked answer likely incorrect. Suggested answer: ${parsed?.correctAnswerSuggestion || 'Not provided'}. Basis: ${parsed?.sourceBasis || 'unspecified'}. Summary: ${parsed?.summary || 'No summary.'}`
        );
        if (autoReported) {
          toast({ title: "Question auto-reported", description: "Dr Ahroid found the marked answer may be wrong." });
        }
      }
      const verification = {
        verdict,
        sourceBasis,
        summary,
        citations,
        correctAnswerSuggestion: parsed?.correctAnswerSuggestion || '',
        markedAnswerWrong: parsed?.markedAnswerWrong === true,
        autoReported,
      };
      setReferenceVerification(verification);
      await cacheVerification(verification);
    } catch (error) {
      if (isAiPolicyNotice(error?.message || '')) {
        setReferenceActionError(error.message);
        return;
      }
      const fallbackIndexes = getFallbackConfirmedReferenceIndexes(localReferences);
      const fallbackVerification = {
        verdict: fallbackIndexes.length > 0 ? 'verified' : 'unconfirmed',
        sourceBasis: 'internal',
        summary: fallbackIndexes.length > 0
          ? 'Dr Ahroid found local references that appear to support this question.'
          : 'Dr Ahroid could not confirm this question from available local references.',
        citations: normalizeCitations(fallbackIndexes.map(index => localReferences[index]).filter(Boolean)),
        autoReported: false,
      };
      setConfirmedReferenceIndexes(fallbackIndexes);
      setReferenceVerification(fallbackVerification);
      toast({ title: "Dr Ahroid used local confirmation", description: "AI service was unavailable, so references were checked locally." });
    } finally {
      setIsConfirmingReferences(false);
    }
  };

  const handleSummarizeReferences = async () => {
    if (!currentMCQ || isSummarizingReferences) return;
    if (!isOnline) {
      showOfflineFeatureToast('AI summary');
      return;
    }
    const summaryCount = summaryGenerationCounts[currentMCQ.id] || 0;
    if (summaryCount >= 3) return;

    setIsSummarizingReferences(true);
    setReferenceActionError('');
    try {
      const data = await aiApiJson<any>('reference-summary', {
        question: currentMCQ.question,
        top_k: 5,
      });

      if (data.status === 'no_references' || !data.summary) {
        setReferenceSummary({
          summary: 'No suitable references were found for a focused summary.',
          citations: [],
        });
        setSummaryGenerationCounts(prev => ({ ...prev, [currentMCQ.id]: (prev[currentMCQ.id] || 0) + 1 }));
        return;
      }

      setReferenceSummary({
        summary: data.summary || '',
        citations: normalizeCitations(data.citations),
      });
      setSummaryGenerationCounts(prev => ({ ...prev, [currentMCQ.id]: (prev[currentMCQ.id] || 0) + 1 }));
    } catch (error) {
      console.error('Reference summary failed:', error);
      if (isAiPolicyNotice(error?.message || '')) {
        setReferenceActionError(error.message);
        return;
      }
      toast({ title: "AI summary unavailable", description: "Dr Ahroid could not summarize these references right now." });
    } finally {
      setIsSummarizingReferences(false);
    }
  };

  const handleSummaryUpgradePrompt = () => handleSummarizeReferences();

  const handleSummaryLearnMore = () => {
    if (!currentMCQ || !referenceSummary?.summary) return;
    const citationText = Array.isArray(referenceSummary.citations) && referenceSummary.citations.length > 0
      ? referenceSummary.citations
        .map(citation => `${citation.book || citation.title || 'Reference'}${citation.page ? ` p. ${citation.page}` : ''}`)
        .join(', ')
      : 'No listed citations';
    setChatPrefillPrompt(`Help me learn more about this MCQ using the AI summary and references.\n\nQuestion: ${currentMCQ.question}\nCorrect answer: ${currentMCQ.correct_answer}\nExplanation: ${currentMCQ.explanation || 'No explanation provided.'}\nAI Summary: ${referenceSummary.summary}\nCitations: ${citationText}\n\nExplain the concept in a high-yield way and add any exam-relevant points.`);
    setIsReferenceModalOpen(false);
    setIsChatbotOpen(true);
  };

  const handleExplainOptions = async () => {
    if (!currentMCQ || isExplainingOptions || !showExplanation) return;
    if (!isOnline) {
      showOfflineFeatureToast('AI option explanations');
      return;
    }
    const explainCount = explainGenerationCounts[currentMCQ.id] || 0;
    if (explainCount >= 3) {
      toast({ title: "AI explain limit reached", description: "Try again on another question." });
      return;
    }

    setIsExplainingOptions(true);
    setReferenceActionError('');
    try {
      const data = await aiApiJson<any>('reference-explain', {
        question: currentMCQ.question,
        top_k: 3,
        options: currentMCQ.shuffledOptions || currentMCQ.options || [],
        correctAnswer: currentMCQ.correct_answer,
        explanation: currentMCQ.explanation || '',
      });
      const optionList = currentMCQ.shuffledOptions || currentMCQ.options || [];
      const nextExplanations = Array.isArray(data.optionExplanations)
        ? data.optionExplanations.reduce((acc, item, fallbackIndex) => {
          const optionIndex = Number.isInteger(item?.optionIndex) ? item.optionIndex : fallbackIndex;
          const optionKey = optionList[optionIndex] || item?.option;
          if (optionKey && item?.explanation) {
            acc[optionKey] = {
              verdict: item.verdict === 'correct' ? 'correct' : 'wrong',
              explanation: String(item.explanation),
            };
          }
          return acc;
        }, {})
        : {};

      if (!Object.keys(nextExplanations).length) {
        toast({ title: "AI explain unavailable", description: "Dr Ahroid could not explain these options right now." });
        return;
      }

      setOptionExplanations(nextExplanations);
      setExplainGenerationCounts(prev => ({ ...prev, [currentMCQ.id]: (prev[currentMCQ.id] || 0) + 1 }));
    } catch (error) {
      console.error('Option explanations failed:', error);
      toast({
        title: "AI explain unavailable",
        description: isAiPolicyNotice(error?.message || '') ? error.message : "Dr Ahroid could not explain these options right now.",
      });
    } finally {
      setIsExplainingOptions(false);
    }
  };

  useEffect(() => {
    setOptionExplanations({});
    setIsExplainingOptions(false);
  }, [currentQuestionIndex]);

  useEffect(() => {
    if (profile && !profileLoading && user?.id) {
      const normalizedPlan = profile.plan?.toLowerCase() || 'free';
      cacheMCQPlan(user.id, normalizedPlan);
      setCachedUserPlan(normalizedPlan);
      setDailySubmissionsCount(mergeLocalMCQAttemptCount(
        user.id,
        profile.daily_mcq_submissions || 0,
        profile.last_submission_reset_date,
      ));
      setLastSubmissionResetDate(profile.last_submission_reset_date);
    }
  }, [profile, profileLoading, user?.id]);

  useEffect(() => {
    setCachedUserPlan(readCachedMCQPlan(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') {
        void flushSavedSessions();
      }
    };
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', flushWhenHidden);
      void flushSavedSessions();
    };
  }, []);

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
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0 });
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    let cancelled = false;

    const loadMCQs = async () => {
      setLoading(true);
      setChapterLockMessage(null);
      setPreparationError(null);
      if (!user?.id) return;

      const preparedQuiz = await prepareMCQQuiz({
        chapterId: chapter,
        userId: user.id,
        mistakeMode,
        mistakeMcqIds: mistakeMcqIdsKey ? mistakeMcqIdsKey.split('|') : [],
      });
      if (cancelled) return;

      const savedSubject = localStorage.getItem(LAST_ATTEMPTED_SUBJECT_KEY);
      const savedChapter = localStorage.getItem(LAST_ATTEMPTED_CHAPTER_KEY);
      const savedIndex = Number(localStorage.getItem(LAST_ATTEMPTED_MCQ_KEY) || 0);
      const preferredIndex = initialIndex > 0
        ? initialIndex
        : savedSubject === subject && savedChapter === chapter
          ? savedIndex
          : preparedQuiz.firstUnansweredIndex;
      const clampedPreferredIndex = Math.min(
        Math.max(preferredIndex, 0),
        Math.max(preparedQuiz.questions.length - 1, 0),
      );
      const nextUnansweredIndex = preparedQuiz.questions.findIndex(
        (question, index) => index >= clampedPreferredIndex && !preparedQuiz.answers[question.id],
      );
      const resolvedInitialIndex = nextUnansweredIndex >= 0
        ? nextUnansweredIndex
        : preparedQuiz.firstUnansweredIndex;
      const initialQuestion = preparedQuiz.questions[resolvedInitialIndex];
      const initialAnswer = initialQuestion
        ? preparedQuiz.answers[initialQuestion.id]?.selectedAnswer
        : undefined;

      setAnsweredQuestions(preparedQuiz.answers);
      setCurrentQuestionIndex(resolvedInitialIndex);
      setSelectedAnswer(initialAnswer ?? null);
      setShowExplanation(Boolean(initialAnswer));
      setMcqs(preparedQuiz.questions);
      setStartTime(Date.now());
      setLoading(false);

      if (preparedQuiz.invalidQuestions.length > 0) {
        toast({
          title: preparedQuiz.invalidQuestions.length === 1
            ? 'Problematic question skipped'
            : `${preparedQuiz.invalidQuestions.length} problematic questions skipped`,
          description: 'The question was skipped without affecting your score.',
        });

        if (user?.id && typeof navigator !== 'undefined' && navigator.onLine) {
          const invalidIds = preparedQuiz.invalidQuestions.map(mcq => mcq.id).filter(Boolean);
          if (invalidIds.length > 0) {
            void (async () => {
              const { data: existingReports } = await supabase
                .from('reported_questions')
                .select('mcq_id')
                .eq('user_id', user.id)
                .in('mcq_id', invalidIds);
              const alreadyReported = new Set((existingReports || []).map((report) => report.mcq_id));
              const newReports = preparedQuiz.invalidQuestions
                .filter((mcq) => mcq.id && !alreadyReported.has(mcq.id))
                .map((mcq) => ({
                  user_id: user.id,
                  mcq_id: mcq.id,
                  reason: 'Auto-report: no valid correct answer could be identified among the available options.',
                  status: 'pending',
                }));

              if (newReports.length > 0) {
                const { error: reportError } = await supabase
                  .from('reported_questions')
                  .insert(newReports);
                if (reportError) console.error('Unable to auto-report invalid MCQs:', reportError);
              }
            })();
          }
        }
      }
    };
    void loadMCQs().catch(error => {
      if (!cancelled) {
        if (error instanceof ChapterLockedError) {
          setChapterLockMessage(error.message);
        } else {
          setPreparationError(
            error instanceof Error
              ? error.message
              : 'The quiz could not be prepared. Please try again.',
          );
        }
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chapter, user?.id, mistakeMode, mistakeMcqIdsKey, initialIndex, subject, toast, preparationAttempt]);

  useEffect(() => {
    if (initialSubject?.id === subject && initialChapter?.id === chapter) {
      setDownloadSubject(initialSubject);
      setDownloadChapter(initialChapter);
      return;
    }

    let cancelled = false;

    const loadDownloadContext = async () => {
      const [subjectData, chapterData] = await Promise.all([
        fetchSubjectById(subject),
        fetchChapterById(chapter, subject),
      ]);

      if (!cancelled) {
        setDownloadSubject(subjectData);
        setDownloadChapter(chapterData);
      }
    };

    loadDownloadContext();
    return () => {
      cancelled = true;
    };
  }, [subject, chapter, initialSubject, initialChapter]);

  useEffect(() => {
    if (!loading && mcqs.length > 0 && typeof window !== 'undefined' && hasAttemptedAny) {
      localStorage.setItem(LAST_ATTEMPTED_MCQ_KEY, currentQuestionIndex.toString());
      localStorage.setItem(LAST_ATTEMPTED_SUBJECT_KEY, subject);
      localStorage.setItem(LAST_ATTEMPTED_CHAPTER_KEY, chapter);
      updateSavedSessionsList(user?.id, subject, chapter, currentQuestionIndex);
    }
  }, [currentQuestionIndex, subject, chapter, loading, mcqs.length, user?.id, hasAttemptedAny]);

  useEffect(() => {
    if (!user?.id || mcqs.length === 0) {
      setSavedMcqIds(new Set());
      return;
    }
    let cancelled = false;
    void supabase
      .from('saved_mcqs')
      .select('mcq_id')
      .eq('user_id', user.id)
      .in('mcq_id', mcqs.map((mcq) => mcq.id))
      .then(({ data }) => {
        if (!cancelled) {
          setSavedMcqIds(new Set((data || []).map((row) => row.mcq_id)));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mcqs, user?.id]);

  useEffect(() => {
    setReferenceData(null);
    setIsReferenceModalOpen(false);
    setSelectedReferenceIndex(null);
    setConfirmedReferenceIndexes(null);
    setOfflineReferenceMessage('');
  }, [currentQuestionIndex, setReferenceData]);

  useEffect(() => {
    if (!user?.id || mcqs.length === 0) {
      setQueuedAnswerIds(new Set());
      return;
    }

    let cancelled = false;
    const refreshQueuedAnswers = async () => {
      const ids = await getQueuedMCQAnswerIds(user.id, mcqs.map(mcq => mcq.id));
      if (!cancelled) setQueuedAnswerIds(new Set(ids));
    };

    refreshQueuedAnswers();
    const unsubscribe = subscribeOfflineAnswerChanges(refreshQueuedAnswers);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id, mcqs]);

  const QuestionMapGrid = () => (
    <>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {mcqs.map((mcq, index) => (
          <button key={mcq.id}
            className={`relative h-10 w-full rounded-xl text-sm font-bold transition-[background-color,border-color,color,box-shadow] duration-150 ${
              currentQuestionIndex === index
                ? 'bg-gradient-to-br from-primary to-blue-600 text-white border-transparent shadow-lg shadow-primary/30'
                : isQuestionAnswered(mcq.id)
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-muted text-muted-foreground border border-transparent'
            }`}
            onClick={() => goToQuestion(index)}>
            {queuedAnswerIds.has(mcq.id) && (
              <Clock className="absolute right-1 top-1 h-2.5 w-2.5 text-amber-500" />
            )}
            {index + 1}
          </button>
        ))}
      </div>
      <div className="mt-4 text-xs text-muted-foreground space-y-1.5">
        <p className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-gradient-to-br from-primary to-blue-600 mr-2" />Current</p>
        <p className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-emerald-500 mr-2" />Answered</p>
        <p className="flex items-center"><span className="inline-block w-3 h-3 rounded-full bg-muted mr-2" />Unanswered</p>
      </div>
    </>
  );

  if (loading) {
    return <MCQLoadingSkeleton />;
  }

  if (chapterLockMessage) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6 text-center">
        <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-card p-7 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="mt-5 text-xl font-black text-foreground">Chapter unavailable</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {chapterLockMessage}
          </p>
          <Button onClick={onBack} className="mt-6 w-full rounded-xl">
            Choose another chapter
          </Button>
        </div>
      </div>
    );
  }

  if (preparationError) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6 text-center">
        <div className="w-full max-w-md rounded-3xl border bg-card p-7 shadow-xl">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="mt-5 text-xl font-black text-foreground">Quiz could not load</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {preparationError}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button onClick={onBack} variant="outline" className="rounded-xl">
              Go back
            </Button>
            <Button
              onClick={() => {
                if (user?.id) {
                  clearPreparedMCQQuiz({
                    chapterId: chapter,
                    userId: user.id,
                    mistakeMode,
                    mistakeMcqIds,
                  });
                }
                setPreparationAttempt(attempt => attempt + 1);
              }}
              className="rounded-xl"
            >
              Try again
            </Button>
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

  const verifiedAgainstBooks = isInternalVerification(referenceVerification?.sourceBasis) && Array.isArray(referenceVerification?.citations)
    ? Array.from(new Set(
      referenceVerification.citations
        .map(citation => String(citation?.book || citation?.title || '').trim())
        .filter(book => book && !isGenericReferenceBook(book))
    ))
    : [];
  const currentQuestionFeedback = currentMCQ ? questionFeedback[currentMCQ.id] : undefined;
  const fullName = String(
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.fullName ||
    'Future Doctor',
  ).trim();

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background text-foreground dark:from-primary/15 dark:via-background dark:to-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-gradient-to-b from-background/95 via-background/90 to-background/75 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDrawerOpen(true)}
            className="h-9 w-9 shrink-0 rounded-xl"
            aria-label="Open question map"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs.App" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 leading-none">
            <p className="whitespace-nowrap font-['Syne'] text-[13px] font-extrabold tracking-[-0.035em]">
              <span className="text-primary">Medmacs</span><span className="text-foreground">.app</span>
            </p>
            <p className="mt-1 whitespace-nowrap text-[8px] font-bold leading-none tracking-[0.02em] text-muted-foreground">
              By HMACS Studios
            </p>
          </div>
          {timerEnabled && (
            <MCQTimer
              key={`${currentMCQ?.id || currentQuestionIndex}-${timePerQuestion}`}
              seconds={timePerQuestion}
              paused={showExplanation || loading}
              onTimeUp={handleTimeUp}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          {isAiGenerated && (
            <div className="flex items-center gap-1 mr-2 px-2 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">AI</span>
            </div>
          )}
          {mistakeMode && (
            <div className="flex items-center gap-1 mr-2 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Shield className="w-3.5 h-3.5 text-amber-700 dark:text-amber-300" />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Correction</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={handleSaveMCQ} className="w-9 h-9 rounded-lg" aria-label={isCurrentMCQSaved ? 'Remove bookmark' : 'Bookmark question'}>
            {isCurrentMCQSaved ? <BookmarkCheck className="w-4 h-4 fill-primary text-primary" /> : <Bookmark className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setHasOpenedSettingsMenu(true);
              setShowSettingsModal(true);
            }}
            className="w-9 h-9 rounded-lg"
            aria-label="Open quiz menu"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-50 border-b border-border/30 bg-background/75 px-4 py-3 backdrop-blur-lg sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <span className="shrink-0 text-sm font-black tracking-tight text-foreground">Q{currentQuestionIndex + 1}/{totalQuestions}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-primary/10 ring-1 ring-primary/10">
            <div className="h-full rounded-full bg-gradient-to-r from-primary to-blue-500 transition-[width] duration-200 ease-out" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div ref={contentRef} className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-y-auto overscroll-contain">
        <div key={currentMCQ?.id} className="flex flex-1 flex-col">
            {/* Question Section */}
            <section className="mx-3 mt-3 rounded-2xl border border-border/50 bg-card/80 px-4 py-5 shadow-sm backdrop-blur-sm sm:mx-6 sm:px-6 sm:py-6">
              <p className="mb-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-primary">{mistakeMode ? 'Mistake correction' : 'Question'} {currentQuestionIndex + 1}</p>
              <h1 className="text-[1.08rem] font-bold leading-[1.65] tracking-[-0.01em] text-foreground sm:text-xl sm:leading-[1.6]">{currentMCQ?.question}</h1>
            </section>

            {/* Options */}
            <div className="flex-1 space-y-2.5 px-3 py-4 sm:px-6">
              <p className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Select your answer</p>
              {currentMCQ?.shuffledOptions.map((option, index) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentMCQ.correct_answer;
                let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
                if (showExplanation) {
                  if (isSelected && isCorrect) state = 'correct';
                  else if (isSelected && !isCorrect) state = 'incorrect';
                  else if (isCorrect) state = 'correct';
                } else if (isSelected) state = 'selected';

                const optionAiExplanation = optionExplanations[option];

                return (
                  <MCQAnswerOption
                    key={option}
                    option={option}
                    index={index}
                    state={state}
                    disabled={showExplanation}
                    explanation={optionAiExplanation}
                    isExplaining={isExplainingOptions}
                    onSelect={stableAnswerSelectRef.current}
                  />
                );
              })}
            </div>

            {/* Bottom encouragement becomes the explanation after answering. */}
            <AnimatePresence mode="wait" initial={false}>
            {!showExplanation ? (
              <motion.section
                key="encouragement"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="mx-3 mb-4 rounded-2xl border border-primary/15 bg-primary/[0.055] px-4 py-4 text-center sm:mx-6"
              >
                <p className="font-['Syne'] text-sm font-extrabold tracking-tight text-foreground">
                  Best of luck, <span className="text-primary">{fullName}</span>
                </p>
                <p className="mt-1 text-[11px] font-medium text-muted-foreground">Read carefully. Trust your preparation.</p>
              </motion.section>
            ) : (
              <motion.section
                key="explanation"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="mx-3 mb-4 rounded-2xl border border-primary/15 bg-card/85 px-4 py-5 shadow-sm sm:mx-6 sm:px-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-sm font-black uppercase tracking-[0.08em] text-primary">Explanation</span>
                </div>
                <p className="text-[0.95rem] font-medium leading-7 text-foreground/85 sm:text-base">{currentMCQ?.explanation || "No explanation provided."}</p>
                {verifiedAgainstBooks.length > 0 && (
                  <div className="mt-3 flex max-w-full flex-nowrap gap-2 overflow-x-auto pb-1">
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                      Verified against: {verifiedAgainstBooks.join(', ')}
                    </span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-background/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <span className="text-xs font-bold text-muted-foreground">Was this question helpful?</span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={currentQuestionFeedback === 'up' ? 'default' : 'outline'}
                      size="sm"
                      disabled={savingQuestionFeedback}
                      onClick={() => saveQuestionFeedback('up')}
                      className="h-8 rounded-xl px-3"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant={currentQuestionFeedback === 'down' ? 'destructive' : 'outline'}
                      size="sm"
                      disabled={savingQuestionFeedback}
                      onClick={() => saveQuestionFeedback('down')}
                      className="h-8 rounded-xl px-3"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Reference Button */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={handleSearchReference}
                    variant="outline"
                    className="w-full h-10 rounded-lg text-sm font-medium"
                    disabled={isConfirmingReferences}
                  >
                    {isConfirmingReferences ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    {isConfirmingReferences ? 'Verifying Question' : 'Find Reference'}
                  </Button>
                  <Button
                    onClick={handleExplainOptions}
                    variant="outline"
                    className="w-full h-10 rounded-lg text-sm font-medium"
                    disabled={isExplainingOptions || (currentMCQ ? (explainGenerationCounts[currentMCQ.id] || 0) >= 3 : false)}
                  >
                    {isExplainingOptions ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    {isExplainingOptions ? 'Explaining...' : 'Options Explain'}
                  </Button>
                </div>
              </motion.section>
            )}
            </AnimatePresence>
          </div>
        </div>

      <footer className="relative z-50 border-t border-border/40 bg-gradient-to-t from-background via-background/95 to-background/80 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (currentQuestionIndex > 0) {
                hasUserInteractedRef.current = true;
                setCurrentQuestionIndex(prevIndex => prevIndex - 1);
                setStartTime(Date.now());
              }
            }}
            disabled={currentQuestionIndex === 0}
            className="h-12 w-28 rounded-xl font-bold disabled:opacity-50 sm:w-32"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </Button>

          {showExplanation ? (
            <Button
              onClick={handleNextQuestion}
              className="h-12 flex-1 rounded-xl bg-primary font-black shadow-md shadow-primary/15 hover:bg-primary/90"
            >
              {currentQuestionIndex === totalQuestions - 1 ? (
                <>Finish<Award className="w-4 h-4 ml-2" /></>
              ) : (
                <>Next<TrendingUp className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          ) : (
            !effectiveQuickSubmit && (
              <Button
                onClick={() => handleSubmitAnswer()}
                disabled={!selectedAnswer || isSubmittingAnswer}
                className="h-12 flex-1 rounded-xl bg-primary font-black shadow-md shadow-primary/15 hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmittingAnswer ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {isSubmittingAnswer ? 'Checking...' : 'Check Answer'}
              </Button>
            )
          )}
        </div>
      </footer>

      {/* Modals */}
      {hasOpenedSettingsMenu && <MCQSettingsModal
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
        downloadSubject={downloadSubject}
        downloadChapter={downloadChapter}
      />}
      {showLeaveModal && <LeaveTestModal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} onConfirm={() => { setShowLeaveModal(false); onBack(); }} />}
      {showReportModal && <ReportMCQModal isOpen={showReportModal} onClose={() => setShowReportModal(false)} onSubmit={handleReportSubmit} isSubmitting={isReportSubmitting} />}
      {showUpgradeModal && <UpgradeAccountModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgradeClick={handleUpgradeClick} message={upgradeModalMessage} />}
      {isReferenceModalOpen && <ReferenceModal
        isOpen={isReferenceModalOpen}
        onClose={() => setIsReferenceModalOpen(false)}
        references={referenceResults}
        isLoading={isSearchingReference}
        error={referenceActionError || referenceError}
        selectedIndex={selectedReferenceIndex}
        setSelectedIndex={setSelectedReferenceIndex}
        confirmedIndexes={confirmedReferenceIndexes}
        verification={referenceVerification}
        summary={referenceSummary}
        isSummarizing={isSummarizingReferences}
        onSummarize={handleSummarizeReferences}
        onLearnMore={handleSummaryLearnMore}
        onSummaryUpgrade={handleSummaryUpgradePrompt}
        summaryCount={currentMCQ ? (summaryGenerationCounts[currentMCQ.id] || 0) : 0}
        summaryLimitReached={currentMCQ ? (summaryGenerationCounts[currentMCQ.id] || 0) >= 3 : false}
        isConfirming={isConfirmingReferences}
        onConfirm={handleConfirmReferences}
        isPremium={isPremium}
        canUseAiSummary={canUseAiSummary}
        offlineMessage={offlineReferenceMessage}
      />}
      <MCQQuestionMapDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <QuestionMapGrid />
      </MCQQuestionMapDrawer>

      {currentMCQ && (
        <Suspense fallback={null}>
          <LazyAIChatbot
            isOpen={isChatbotOpen}
            onClose={() => setIsChatbotOpen(false)}
            questionContext={currentMCQ.question}
            explanationContext={currentMCQ.explanation || ''}
            currentAnswer={selectedAnswer}
            correctAnswer={currentMCQ.correct_answer}
            userPlan={userPlanForChatbot}
            isHidden={showExplanation || !effectiveQuickSubmit}
            isOnline={isOnline}
            onOpen={() => setIsChatbotOpen(true)}
            onQuestionHelp={() => setUsedAiHelpByQuestion(prev => ({ ...prev, [currentMCQ.id]: true }))}
            prefillPrompt={chatPrefillPrompt}
          />
        </Suspense>
      )}

    </div>
  );
};
