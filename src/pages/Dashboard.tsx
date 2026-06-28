// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  BookOpen, Zap, Trophy, Target, Users, Brain, Swords, Flame,
  TrendingUp, Award, Briefcase, BellRing, Bookmark, ScrollText,
  Home, User, Settings, ChevronRight, ChevronLeft, LogOut, Lock, CreditCard,
  Megaphone, BarChart3, Sun, Moon, ArrowRight, Crown, Mail, X,
  Receipt, Shield, FileText, RefreshCw, Sparkles, Stethoscope, PieChart, Info, Star, Loader2, Microscope, FlaskConical, WifiOff,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { LeaderboardPreview } from '@/components/dashboard/LeaderboardPreview';
import { StudyAnalytics } from '@/components/dashboard/StudyAnalytics';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useRef } from 'react';
import AnnouncementToastManager from '@/components/ui/AnnouncementToastManager';
import AuthErrorDisplay from '@/components/AuthErrorDisplay';
import Seo from '@/components/Seo';

import VersionGuard from '@/components/VersionControl';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import { AchievementBadges } from '@/components/profile/AchievementBadges';
import { MCQProgressWidget } from '@/components/dashboard/MCQProgressWidget';
import { ProgressTracker } from '@/components/mcq/ProgressTracker';
import { fetchInstitutes, getInstituteByCode } from '@/utils/institutes';
import { useCachedImage } from '@/hooks/useCachedImage';

// Types
type TermOfDay = {
  id: string;
  term: string;
  definition: string;
  created_at: string;
};

type CaseOfDay = {
  id: string;
  headline: string;
  details: string;
  answer: string;
  explanation: string;
  created_at: string;
};

type DashboardAnnouncement = {
  id: string;
  card_heading: string;
  card_subheading: string;
  card_background_image_url?: string | null;
  card_secondary_image_url?: string | null;
  modal_heading: string;
  modal_subheading: string;
  modal_background_image_url?: string | null;
  modal_image_urls?: string[] | null;
  cta_text?: string | null;
  cta_url?: string | null;
};

// Swipe-to-reveal Case of Day card
const CaseOfDayCard = ({ caseOfDay, onClose, isPremium, onNavigateToChat, onNavigateToPricing }: {
  caseOfDay: CaseOfDay;
  onClose: () => void;
  isPremium: boolean;
  onNavigateToChat: (text: string) => void;
  onNavigateToPricing: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const sections = [
    { label: 'Case', icon: '📋', accent: 'bg-blue-500' },
    { label: 'Answer', icon: '💡', accent: 'bg-amber-500' },
    { label: 'Learn', icon: '📚', accent: 'bg-purple-500', isLast: true },
  ];

  const handleLearnMore = () => {
    if (isPremium) {
      const chatText = `I have a question about this case:\n\n${caseOfDay.details}\n\nAnswer: ${caseOfDay.answer}`;
      onNavigateToChat(chatText);
      onClose();
    } else {
      onNavigateToPricing();
    }
  };

  const getContent = (index: number) => {
    if (index === 2) {
      return (
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-200 text-[15px] leading-7 tracking-wide whitespace-pre-wrap">
            {highlightWords(caseOfDay.explanation, 'bg-purple-500')}
          </p>
          <button
            onClick={handleLearnMore}
            className="w-full bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg"
          >
            Learn more about this topic
            <span className="block text-xs font-normal opacity-80">By Dr Ahroid</span>
          </button>
        </div>
      );
    }
    return highlightWords(
      index === 0 ? caseOfDay.details : caseOfDay.answer,
      sections[index].accent
    );
  };

  const highlightWords = (text: string, accent: string) => {
    const accentStyles: Record<string, { text: string; bg: string }> = {
      'bg-blue-500': { text: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-200 dark:bg-blue-800' },
      'bg-amber-500': { text: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-200 dark:bg-amber-800' },
      'bg-purple-500': { text: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-200 dark:bg-purple-800' },
    };
    const style = accentStyles[accent] || accentStyles['bg-blue-500'];

    const parts = text.split(/(\*\*[^*]+\*\*)/);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const word = part.slice(2, -2);
        return (
          <span
            key={i}
            className={`${style.text} ${style.bg} font-extrabold px-1.5 py-0.5 rounded-md underline decoration-2 underline-offset-2`}
          >
            {word}
          </span>
        );
      }
      return part;
    });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 400 : -400,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 400 : -400,
      opacity: 0,
    }),
  };

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 80;
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -threshold || velocity < -800) {
      if (currentIndex < sections.length - 1) {
        setDirection(1);
        setCurrentIndex(prev => prev + 1);
      }
    } else if (offset > threshold || velocity > 800) {
      if (currentIndex > 0) {
        setDirection(-1);
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  const currentSection = sections[currentIndex];

  return (
    <div className="relative overflow-hidden rounded-t-3xl p-6 pb-0">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Stethoscope className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest">Case of the Day</p>
        </div>
      </div>

      {/* Content card */}
      <div ref={containerRef}>
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden relative">
          {/* Card header with section indicator */}
          <div className={`${currentSection.accent} p-4`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm">
                {currentSection.icon}
              </div>
              <div>
                <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wider">Section</p>
                <h3 className="text-white text-lg font-bold">{currentSection.label}</h3>
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                {sections.map((s, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all duration-500 ${i === currentIndex ? 'w-6 bg-white' : i < currentIndex ? 'w-2 bg-white/50' : 'w-2 bg-white/30'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Swipeable content area */}
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            drag={currentIndex < sections.length - 1 ? "x" : false}
            dragConstraints={containerRef}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
            className={`p-6 ${currentIndex === sections.length - 1 ? 'h-auto min-h-[280px]' : 'h-[280px]'} cursor-grab active:cursor-grabbing`}
            style={{ touchAction: 'pan-y' }}
          >
            <div className="h-full overflow-y-auto pr-2 scrollbar-thin">
              <div className="text-gray-700 dark:text-gray-200 text-[15px] leading-7 tracking-wide">
                {getContent(currentIndex)}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation hint */}
        <div className="flex justify-center items-center gap-2 mt-4 pb-6">
          {currentIndex > 0 && (
            <div className="flex items-center gap-1 text-gray-400">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-xs">Previous</span>
            </div>
          )}
          {currentIndex > 0 && currentIndex < sections.length - 1 && (
            <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />
          )}
          {currentIndex < sections.length - 1 && (
            <div className="flex items-center gap-1 text-gray-400">
              <span className="text-xs">Next</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ action, isExternal = false, fixedHeight = false, offlineMode = false }: any) => {
  const isDisabled = action.disabled || (offlineMode && action.link !== '/mcqs');
  const cardClassName = [
    'dashboard-action-card relative overflow-hidden rounded-2xl p-4',
    'bg-gradient-to-br bg-clip-padding',
    action.gradient,
    'shadow-lg shadow-black/5 dark:shadow-black/20',
    'active:scale-[0.97] transition-transform duration-150',
    'flex min-h-[112px] w-full flex-col justify-start',
    isDisabled ? 'grayscale opacity-45' : '',
    fixedHeight ? 'h-[120px]' : '',
  ].filter(Boolean).join(' ');

  const content = (
    <div className={cardClassName}>
      <div className="pointer-events-none absolute -right-3 -bottom-3 opacity-15">
        <action.icon className={`w-20 h-20 ${action.iconColor}`} />
      </div>
      <div className="relative z-10">
        {offlineMode && action.link !== '/mcqs' && (
          <span className="mb-1 inline-block rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/70">
            Offline
          </span>
        )}
        {action.tag && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${action.tagColor || 'bg-white/20 text-white'}`}>
            {action.tag}
          </span>
        )}
        <h3 className="text-[15px] font-bold text-white leading-tight">{action.title}</h3>
        <p className="text-white/60 text-[11px] mt-0.5 font-medium">{action.description}</p>
      </div>
    </div>
  );

  if (isExternal) {
    return <a href={isDisabled ? undefined : action.link} target="_blank" rel="noopener noreferrer" className={`dashboard-action-link ${isDisabled ? 'pointer-events-none' : ''}`}>{content}</a>;
  }
  if (action.onClick) {
    return <button type="button" onClick={isDisabled ? undefined : action.onClick} disabled={isDisabled} className="dashboard-action-link text-left disabled:cursor-not-allowed">{content}</button>;
  }
  return (
    <Link
      to={isDisabled ? '#' : action.link}
      className={`dashboard-action-link ${isDisabled ? 'pointer-events-none' : ''}`}
    >
      {content}
    </Link>
  );
};

const AccuracyDonut = ({ value = 0, solved = 0 }: { value?: number; solved?: number }) => {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-background/95 py-1 pl-1 pr-2 shadow-lg shadow-primary/10 backdrop-blur-xl">
      <div className="relative h-10 w-10 shrink-0">
        <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
          <circle cx="20" cy="20" r={radius} className="fill-none stroke-primary/15" strokeWidth="4" />
          <circle
            cx="20"
            cy="20"
            r={radius}
            className="fill-none stroke-primary transition-[stroke-dashoffset] duration-300 ease-out"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary">
          {safeValue}%
        </span>
      </div>
      <div className="min-w-0 leading-none">
        <p className="text-[10px] font-black uppercase tracking-wide text-foreground">Accuracy</p>
        <p className="text-[9px] font-semibold text-muted-foreground">{solved} solved</p>
      </div>
    </div>
  );
};

const StickyQuickActions = ({ actions, offlineMode = false }: { actions: any[]; offlineMode?: boolean }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[60] flex justify-center px-4"
    >
      <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/95 px-3 py-2 shadow-2xl shadow-black/10 backdrop-blur-2xl dark:shadow-black/40">
        {actions.map((action) => {
          const Icon = action.icon;
          const isDisabled = action.disabled || (offlineMode && action.link !== '/mcqs');
          const button = (
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${action.gradient} text-white shadow-lg shadow-black/10 transition active:scale-95 ${isDisabled ? 'grayscale opacity-40' : ''}`}
              title={isDisabled ? `${action.title} unavailable in offline mode` : action.title}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only">{action.title}</span>
            </span>
          );

          if (action.onClick) {
            return (
              <button key={action.title} type="button" onClick={isDisabled ? undefined : action.onClick} disabled={isDisabled} className="rounded-full disabled:cursor-not-allowed">
                {button}
              </button>
            );
          }

          return (
            <Link key={action.title} to={isDisabled ? '#' : action.link} className={isDisabled ? 'pointer-events-none' : 'rounded-full'}>
              {button}
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
};

const InstituteDetailCard = ({ institute }: { institute: any }) => {
  if (!institute) return null;

  return (
    <div className="relative overflow-hidden rounded-[2rem] h-32 mb-6 group shadow-xl">
      {institute.image_url ? (
        <img
          src={institute.image_url}
          alt={institute.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#2dd4bf] to-[#0ea5e9]" />
      )}
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
      <div className="relative z-10 h-full flex flex-col justify-end p-6">
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="w-4 h-4 text-[#2dd4bf]" />
          <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Your Institute</span>
        </div>
        <h3 className="text-lg font-black text-white tracking-tight leading-tight">{institute.name}</h3>
      </div>
    </div>
  );
};

const DashboardReviewCard = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState<'prompt' | 'feedback'>('prompt');
  const [rating, setRating] = useState(0);

  const handleStarClick = (i: number) => {
    setRating(i);
    setStep('feedback');
  };

  return (
    <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#0f172a] to-[#020617] rounded-[2rem] overflow-hidden mb-6 relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#2dd4bf]/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
      <CardContent className="p-6 relative z-10">
        {step === 'prompt' ? (
          <div className="text-center py-2">
            <h3 className="text-lg font-black text-white mb-2 italic">Enjoying Medmacs?</h3>
            <p className="text-white/50 text-xs mb-4">Tap to rate your experience!</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  onClick={() => handleStarClick(i)}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#2dd4bf]/20 transition-all active:scale-90 flex items-center justify-center border border-white/5 hover:border-[#2dd4bf]/30"
                >
                  <Star className={`w-5 h-5 ${i <= rating ? 'fill-[#2dd4bf] text-[#2dd4bf]' : 'text-white/20'}`} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black text-white mb-2 italic">You're the Best! 🚀</h3>
            <p className="text-white/50 text-xs mb-4 leading-relaxed">Could you spare a moment to review us on Play Store?</p>
            <div className="flex flex-col gap-2">
              <a
                href="https://play.google.com/store/apps/details?id=com.hmacs.medmacs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-[#0ea5e9]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Rate on Play Store <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onComplete}
                className="w-full py-2 text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                I've already reviewed!
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardAnnouncementCard = ({
  announcement,
  onOpen,
}: {
  announcement: DashboardAnnouncement;
  onOpen: () => void;
}) => {
  return (
    <button
      onClick={onOpen}
      className="relative overflow-hidden rounded-[2rem] h-32 mb-6 w-full text-left shadow-xl active:scale-[0.98] transition-all group"
    >
      {announcement.card_background_image_url ? (
        <img
          src={announcement.card_background_image_url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0d9488] to-[#0284c7]" />
      )}
      <div className="absolute inset-0 bg-black/35" />
      {announcement.card_secondary_image_url && (
        <img
          src={announcement.card_secondary_image_url}
          alt=""
          className="absolute right-2 bottom-0 h-[92%] max-w-[42%] object-contain drop-shadow-2xl"
        />
      )}
      <div className="relative z-10 h-full flex flex-col justify-end p-5 pr-[42%]">
        <div className="flex items-center gap-1.5 mb-1">
          <Megaphone className="w-3.5 h-3.5 text-[#2dd4bf]" />
          <span className="text-[10px] font-black text-white/65 uppercase tracking-[0.18em]">Announcement</span>
        </div>
        <h3 className="text-lg font-black text-white tracking-tight leading-tight line-clamp-1">
          {announcement.card_heading}
        </h3>
        <p className="text-white/70 text-[11px] leading-relaxed line-clamp-2 mt-1">
          {announcement.card_subheading}
        </p>
      </div>
    </button>
  );
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('home');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isNavigating, setIsNavigating] = useState(true);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showTermOfDay, setShowTermOfDay] = useState(false);
  const [showCaseOfDay, setShowCaseOfDay] = useState(false);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);
  const [showHeaderScore, setShowHeaderScore] = useState(true);
  const [isAccuracyCompact, setIsAccuracyCompact] = useState(false);
  const [showStickyQuickActions, setShowStickyQuickActions] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const headerHapticReadyRef = useRef(false);
  const [selectedDashboardAnnouncement, setSelectedDashboardAnnouncement] = useState<DashboardAnnouncement | null>(null);
  const [appVersion, setAppVersion] = useState<string>('Loading...');
  const [reviewCompleted, setReviewCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('medmacs_dashboard_review_completed') === 'true';
    }
    return false;
  });
  const [isOfflineMode, setIsOfflineMode] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [profileVerifiedFromServer, setProfileVerifiedFromServer] = useState(false);

  type Profile = {
    avatar_url: string;
    created_at: string;
    full_name: string;
    id: string;
    medical_school: string;
    updated_at: string;
    username: string;
    year_of_study: number;
    plan?: string;
    year?: string;
    email?: string;
    plan_expiry_date?: string;
    role?: string;
  };

  const getProfileCacheKey = () => user?.id ? `medmacs_profile_cache_${user.id}` : null;

  const readCachedProfile = (): Profile | null => {
    if (typeof window === 'undefined') return null;
    const cacheKey = getProfileCacheKey();
    if (!cacheKey) return null;
    try {
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const requiredProfileFieldsMissing = (profileData: Profile | null) => {
    if (!profileData) return true;
    const validYears = ["1st", "2nd", "3rd", "4th", "5th"];
    return (
      profileData.username === null ||
      profileData.username === undefined ||
      String(profileData.username).trim() === '' ||
      (profileData as any).institute === null ||
      (profileData as any).institute === undefined ||
      String((profileData as any).institute).trim() === '' ||
      (profileData as any).year === null ||
      (profileData as any).year === undefined ||
      !validYears.includes((profileData as any).year)
    );
  };

  const { data: profile, isLoading: profileLoading, isError: profileFetchFailed } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) throw error;
      setProfileVerifiedFromServer(true);
      if (data && typeof window !== 'undefined') {
        localStorage.setItem(`medmacs_profile_cache_${user.id}`, JSON.stringify(data));
      }
      return data;
    },
    enabled: !!user?.id,
    initialData: readCachedProfile,
    retry: 1,
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: answers, error: answersError } = await supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', user.id);

      if (answersError) {
        return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, currentStreak: 0, rankPoints: 0, battlesWon: 0, totalBattles: 0, savedQuestions: 0 };
      }

      const totalQuestions = answers?.length || 0;
      const correctAnswers = answers?.filter(a => a.is_correct)?.length || 0;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      let currentStreak = 0;
      const answerDates = answers?.map(a => {
        const date = new Date(a.created_at);
        return date.toLocaleDateString("en-US", { timeZone: "Asia/Karachi" });
      }) || [];
      const uniqueDates = [...new Set(answerDates)];

      if (uniqueDates.length === 0) {
        currentStreak = 0;
      } else {
        const today = new Date();
        const todayPKT = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
        todayPKT.setHours(0, 0, 0, 0);

        const yesterday = new Date(todayPKT);
        yesterday.setDate(yesterday.getDate() - 1);

        const dateObjects = uniqueDates.map(d => {
          const [month, day, year] = d.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }).sort((a, b) => b.getTime() - a.getTime());

        const mostRecentDate = dateObjects[0];
        const isToday = mostRecentDate.getTime() === todayPKT.getTime();
        const isYesterday = mostRecentDate.getTime() === yesterday.getTime();

        if (!isToday && !isYesterday) {
          currentStreak = 0;
        } else {
          currentStreak = 1;
          let currentDate = new Date(mostRecentDate);

          for (let i = 1; i < dateObjects.length; i++) {
            const prevDate = new Date(dateObjects[i]);
            const expectedPrevDate = new Date(currentDate);
            expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);

            if (prevDate.getTime() === expectedPrevDate.getTime()) {
              currentStreak++;
              currentDate = prevDate;
            } else {
              break;
            }
          }
        }
      }

      const { data: battles } = await supabase
        .from('battle_results')
        .select('*')
        .eq('user_id', user.id);

      const { count: savedCount } = await supabase
        .from('saved_mcqs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const battlesWon = battles?.filter(b => b.rank === 1)?.length || 0;
      const rankPoints = correctAnswers * 10 + currentStreak * 5 + accuracy;

      return { totalQuestions, correctAnswers, accuracy, currentStreak, rankPoints, battlesWon, totalBattles: battles?.length || 0, savedQuestions: savedCount || 0 };
    },
    enabled: !!user?.id && !isOfflineMode,
    retry: 1,
    staleTime: 1000 * 60 * 5,
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: whatsNewContent, isLoading: whatsNewLoading } = useQuery({
    queryKey: ['whats-new'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_name', 'whats_new')
        .maybeSingle();

      if (error) {
        console.error("Error fetching What's New:", error);
        return [];
      }

      try {
        return data?.setting_value ? JSON.parse(data.setting_value) : [];
      } catch (e) {
        console.error("Error parsing What's New JSON:", e);
        return [];
      }
    },
  });

  const { data: readAnnouncements } = useQuery({
    queryKey: ['readAnnouncements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_announcements').select('announcement_id').eq('user_id', user.id);
      if (error) return [];
      return data.map(item => item.announcement_id);
    },
    enabled: !!user?.id,
  });

  const userYear = (profile as any)?.year || null;

  // Fetch Term of the Day (year-specific)
  const { data: termOfDay, isLoading: termLoading } = useQuery<TermOfDay>({
    queryKey: ['termOfDay', userYear],
    queryFn: async () => {
      let query = supabase
        .from('term_of_day')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (userYear) query = query.eq('year', userYear);
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch Case of the Day (year-specific)
  const { data: caseOfDay, isLoading: caseLoading } = useQuery<CaseOfDay>({
    queryKey: ['caseOfDay', userYear],
    queryFn: async () => {
      let query = supabase
        .from('case_of_day')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (userYear) query = query.eq('year', userYear);
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
  });

  const { data: instituteData } = useQuery({
    queryKey: ['instituteData', (profile as any)?.institute],
    queryFn: async () => {
      if (!(profile as any)?.institute) return null;
      const institutes = await fetchInstitutes();
      return getInstituteByCode((profile as any).institute, institutes);
    },
    enabled: !!(profile as any)?.institute
  });

  const { data: dashboardAnnouncements = [] } = useQuery<DashboardAnnouncement[]>({
    queryKey: ['dashboardAnnouncements', (profile as any)?.institute],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboard_announcements')
        .select(`
          id,
          card_heading,
          card_subheading,
          card_background_image_url,
          card_secondary_image_url,
          modal_heading,
          modal_subheading,
          modal_background_image_url,
          modal_image_urls,
          cta_text,
          cta_url
        `)
        .eq('is_published', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dashboard announcements:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const dashboardComponents = instituteData?.dashboard_components || { mcqs: true, seqs: false, viva: false };

  const markAsReadMutation = useMutation({
    mutationFn: async (announcementIds: string[]) => {
      if (!user?.id || !announcementIds?.length) return;
      const records = announcementIds.map(id => ({ user_id: user.id, announcement_id: id }));
      await supabase.from('user_announcements').upsert(records, { onConflict: 'user_id, announcement_id' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['readAnnouncements', user?.id] }); },
  });

  useEffect(() => {
    setAppVersion('7.1.0'); // Fixed version for Play Store checks
  }, []);

  useEffect(() => {
    const updateOnlineState = () => setIsOfflineMode(!navigator.onLine);
    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  useEffect(() => {
    setProfileVerifiedFromServer(false);
  }, [user?.id]);

  useEffect(() => {
    setShowHeaderScore(true);
    const timer = window.setTimeout(() => setShowHeaderScore(false), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (activeTab === 'announcements' && user && announcements?.length) {
      markAsReadMutation.mutate(announcements.map(a => a.id));
    }
  }, [activeTab, announcements, user]);

  useEffect(() => {
    const handleScroll = (event?: Event) => {
      const target = event?.target as HTMLElement | Document | null;
      const targetScrollTop =
        target && 'scrollTop' in target
          ? Number(target.scrollTop || 0)
          : 0;
      const scrollTop = Math.max(
        window.scrollY || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0,
        targetScrollTop,
      );
      const nextAccuracyCompact = activeTab === 'home' && scrollTop > 72;
      setIsAccuracyCompact((current) => {
        if (current === nextAccuracyCompact) return current;
        if (headerHapticReadyRef.current && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(6);
        }
        headerHapticReadyRef.current = true;
        return nextAccuracyCompact;
      });

      const quickActionsTop = quickActionsRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      const nextShowStickyQuickActions = activeTab === 'home' && quickActionsTop <= 96;
      setShowStickyQuickActions((current) => current === nextShowStickyQuickActions ? current : nextShowStickyQuickActions);
    };

    handleScroll();
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [activeTab]);

  useEffect(() => {
    if (authLoading || profileLoading) { setIsNavigating(true); return; }
    if (!user) { setIsNavigating(false); return; }

    if (profileFetchFailed && !profile) {
      setIsNavigating(false);
      return;
    }

    if (profile === undefined) {
      setIsNavigating(false);
      return;
    }

    if (!profileVerifiedFromServer) {
      setIsNavigating(false);
      return;
    }

    if (requiredProfileFieldsMissing(profile)) {
      navigate('/setup');
      return;
    }

    setIsNavigating(false);
  }, [authLoading, profileLoading, profileFetchFailed, profileVerifiedFromServer, user, profile, navigate]);

  const flpAction = { title: 'Full-Length Paper', description: 'Timed mixed exams', icon: ScrollText, link: '/flp', gradient: 'from-fuchsia-600 to-rose-600', iconColor: 'text-fuchsia-100' };
  const collaborateAction = { title: 'Collaborate', description: 'Why Medmacs needs you', icon: Briefcase, onClick: () => setShowCollaborateModal(true), gradient: 'from-rose-500 to-pink-600', iconColor: 'text-rose-100' };

  const quickActions = [
    { title: 'Practice MCQs', description: 'Test your knowledge', icon: BookOpen, link: '/mcqs', gradient: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-200' },
    { title: 'Saved MCQs', description: 'Review bookmarks', icon: Bookmark, link: '/saved-mcqs', gradient: 'from-teal-500 to-emerald-600', iconColor: 'text-teal-100' },
    { title: 'Battle Arena', description: 'Compete with friends', icon: Swords, link: '/battle', gradient: 'from-orange-500 to-red-500', iconColor: 'text-orange-100' },
    flpAction,
  ];

  const personalizationActions = [
    { title: 'Mistake Book', description: 'Review wrong MCQs', icon: Target, link: '/mistake-book', gradient: 'from-rose-500 to-red-600', iconColor: 'text-rose-100' },
    { title: 'Titration', description: 'Repair weakest chapter', icon: FlaskConical, link: '/titration', gradient: 'from-violet-500 to-fuchsia-600', iconColor: 'text-violet-100' },
  ];

  const premiumPerks = [
    { title: 'AI Chatbot', description: 'Instant AI tutor', icon: Zap, link: '/ai/chatbot', gradient: 'from-amber-400 to-orange-500', iconColor: 'text-yellow-100' },
    { title: 'AI Test Generator', description: 'Custom tests with AI', icon: Brain, link: '/ai/test-generator', gradient: 'from-cyan-500 to-blue-600', iconColor: 'text-cyan-100' },
    { title: 'Learn with Dr Ahroid', description: 'AI flashcards by chapter', icon: Sparkles, link: '/learn-with-ai', gradient: 'from-violet-500 to-fuchsia-600', iconColor: 'text-violet-100' },
  ];

  const instituteModules = [
    { title: 'Practice SEQs', description: 'Subjective questions', icon: FileText, link: '/seqs', gradient: 'from-orange-500 to-red-600', iconColor: 'text-orange-200', enabled: dashboardComponents.seqs },
    { title: 'Viva & Practicals', description: 'Ace your practicals', icon: Microscope, link: '/practicals', gradient: 'from-fuchsia-600 to-pink-700', iconColor: 'text-fuchsia-100', enabled: dashboardComponents.viva },
  ].filter(m => m.enabled);

  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Medmacs User';
  const currentHour = new Date().getHours();
  const greetingMessage =
    currentHour < 5 ? 'Burning the midnight oil' :
      currentHour < 12 ? 'Good Morning' :
        currentHour < 17 ? 'Good Afternoon' :
          currentHour < 21 ? 'Good Evening' :
            'Good Night';
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
  const dashboardAnnouncement = dashboardAnnouncements[0] || null;
  const cachedAvatarUrl = useCachedImage(profile?.avatar_url);

  const openExternalUrl = async (url?: string | null) => {
    if (!url) return;

    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch (error) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isNavigating || authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
      </div>
    );
  }


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
      </div>
    );
  }


  const unreadCount = (announcements && readAnnouncements)
    ? announcements.filter(a => !readAnnouncements.includes(a.id)).length : 0;

  const tabs = [
    { id: 'announcements', label: 'News', icon: Megaphone, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'leaderboard', label: 'Ranks', icon: Trophy },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'announcements':
        return (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
            <h1 className="text-xl font-bold text-foreground">📢 Announcements</h1>
            <p className="text-xs text-muted-foreground">Latest news & updates</p>
            {announcementsLoading && (
              <div className="flex justify-center py-12">
                <BellRing className="h-6 w-6 animate-bounce text-muted-foreground" />
              </div>
            )}
            {announcements?.length === 0 && !announcementsLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No announcements yet</p>
              </div>
            )}
            {announcements?.map((a) => (
              <Card key={a.id} className="border border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BellRing className="h-3.5 w-3.5 text-primary" />
                    {a.title}
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.content}</p>
                  {a.media_url && a.media_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) && (
                    <img src={a.media_url} alt="Media" className="w-full rounded-xl mt-3 max-h-48 object-cover" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'leaderboard':
        return (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <h1 className="text-xl font-bold text-foreground mb-1">🏆 Leaderboard</h1>
            <p className="text-xs text-muted-foreground mb-5">See where you rank</p>
            <LeaderboardPreview />
          </div>
        );

      case 'analytics':
        if (isOfflineMode) {
          return (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h1 className="text-xl font-bold text-foreground mb-1">📊 Analytics</h1>
              <p className="text-xs text-muted-foreground mb-5">Cloud analytics are unavailable in offline mode</p>
              <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15">
                  <WifiOff className="h-8 w-8 text-amber-600 dark:text-amber-300" />
                </div>
                <h2 className="text-lg font-black text-foreground">Offline Mode</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Analytics, streaks, accuracy, and deep analysis will refresh after your queued MCQ activity syncs.
                </p>
                <Button onClick={() => navigate('/mcqs')} className="mt-5 rounded-2xl font-black">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Practice Downloaded MCQs
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-xl font-bold text-foreground mb-1">📊 Analytics</h1>
            <p className="text-xs text-muted-foreground mb-5">Track your progress</p>
            <ProgressTracker userId={user?.id} />
            <StudyAnalytics />

            {/* Deep Analysis CTA */}
            <button
              onClick={() => navigate('/detailed-analytics')}
              className="w-full mt-6 p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground flex items-center justify-between shadow-lg active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <PieChart className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">Deep Analysis</p>
                  <p className="text-[11px] text-primary-foreground/70">Subject & topic-wise breakdown</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );

      case 'profile':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent border border-border/40 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                {cachedAvatarUrl ? (
                  <img src={cachedAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-foreground font-bold text-lg">{displayName.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{displayName}</h2>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <Badge className="mt-1.5 text-[10px] bg-primary/15 text-primary border-0 font-semibold">{userPlanDisplayName}</Badge>
              </div>
            </div>

            {/* Achievements Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
                <h2 className="text-base font-bold text-foreground">Achievements</h2>
              </div>
              <AchievementBadges userId={user?.id} />
            </div>

            <Card className="border border-border/40 shadow-sm bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">Dark Mode</p>
                      <p className="text-[11px] text-muted-foreground">Toggle app theme</p>
                    </div>
                  </div>
                  <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
                </div>
              </CardContent>
            </Card>

            {/* Main settings */}
            <Card className="border border-border/40 shadow-sm overflow-hidden bg-card/80">
              <CardContent className="p-0 divide-y divide-border/30">
                {[
                  { label: 'Edit Profile', icon: User, link: '/profile' },
                  { label: 'Change Password', icon: Lock, link: '/profile/password' },
                  { label: 'Subscription', icon: CreditCard, link: '/pricing' },
                  { label: 'Redeem Code', icon: Award, link: '/redeem' },
                  { label: 'Purchase History', icon: Receipt, link: '/purchase-history' },
                  { label: 'About Us', icon: Users, link: '/teams' },
                  { label: 'Contact Us', icon: Mail, link: '/contact-us' },
                ].map((item, i) => (
                  <Link key={i} to={item.link} className="flex items-center justify-between p-4 hover:bg-accent/50 active:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
                {/* What's New button */}
                <button onClick={() => setShowWhatsNew(true)} className="flex items-center justify-between p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">What's New</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>

            {/* Legal links - lighter style */}
            <Card className="border border-border/20 shadow-none bg-muted/30">
              <CardContent className="p-0 divide-y divide-border/20">
                {[
                  { label: 'Privacy Policy', icon: Shield, link: '/privacypolicy' },
                  { label: 'Terms & Conditions', icon: FileText, link: '/terms' },
                  { label: 'Refund Policy', icon: RefreshCw, link: '/terms' },
                ].map((item, i) => (
                  <Link key={i} to={item.link} className="flex items-center justify-between p-3.5 hover:bg-accent/30 active:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>

            <div className="text-center pt-4 pb-2">
              <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
              <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
            </div>
          </div>
        );

      case 'home':
      default:
        return (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {/* Greeting - no avatar here */}
            <div className="mb-5">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">
                {greetingMessage}, <span className="text-shimmer">{displayName}</span> ✨
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Ready for your next study move?</p>
            </div>

            {isOfflineMode ? (
              <div className="mb-6 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 shadow-md shadow-amber-500/5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15">
                    <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-foreground">Offline study mode</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                      Cloud streak and accuracy pause here. Downloaded MCQs stay available.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`relative transition-all duration-300 ${isAccuracyCompact ? 'mb-2 min-h-0' : 'mb-6 min-h-[100px]'}`}>
                <motion.div
                  animate={{
                    opacity: userStatsLoading || isAccuracyCompact ? 0 : 1,
                    y: userStatsLoading || isAccuracyCompact ? -8 : 0,
                    height: isAccuracyCompact ? 0 : 'auto',
                    marginBottom: isAccuracyCompact ? 0 : undefined,
                  }}
                  transition={{ duration: 0.25 }}
                  className={`overflow-hidden rounded-2xl bg-gradient-to-r from-primary/12 to-accent shadow-md shadow-primary/5 glow-breathe transition-all duration-300 ${isAccuracyCompact ? 'border-0 p-0' : 'border border-primary/20 p-4'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500" /> {userStats?.currentStreak || 0} day streak
                    </span>
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 text-[10px] px-2 font-bold shadow-sm">
                      Keep it up!
                    </Badge>
                  </div>
                  <Progress value={userStats?.accuracy || 0} className="h-2.5 mb-2" />
                  <div className="flex justify-between text-[11px] font-semibold">
                    <span className="text-primary">{userStats?.accuracy || 0}% accuracy</span>
                    <span className="text-muted-foreground">{userStats?.totalQuestions || 0} solved</span>
                  </div>
                </motion.div>

                {userStatsLoading && !isAccuracyCompact && (
                  <div className="absolute inset-0 bg-muted/50 rounded-2xl p-4 animate-pulse pointer-events-none">
                    <div className="h-4 bg-muted rounded w-1/3 mb-3" />
                    <div className="h-2.5 bg-muted rounded w-full mb-2" />
                    <div className="flex justify-between"><div className="h-3 bg-muted rounded w-1/4" /><div className="h-3 bg-muted rounded w-1/4" /></div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions - elevated cards */}
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Zap className="text-amber-500 fill-amber-500 w-3.5 h-3.5" /> Quick Actions
            </h2>
            <div ref={quickActionsRef} className="grid grid-cols-2 gap-3 mb-6">
              {quickActions.map((action, i) => <ActionCard key={i} action={action} fixedHeight offlineMode={isOfflineMode} />)}
            </div>

            {/* Plan Status & Term of Day - side by side */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Plan Pie Chart */}
              <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 flex flex-col items-center justify-center">
                {isOfflineMode ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15">
                      <WifiOff className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                    </div>
                    <p className="text-xs font-black uppercase text-foreground">Offline Mode</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">MCQs only</p>
                  </div>
                ) : rawUserPlan === 'free' ? (
                  <>
                    <div className="relative w-20 h-20 mb-2">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${Math.min(((profile?.daily_mcq_submissions || 0) / 50) * 100, 100)}, 100`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-black text-foreground">{Math.min(profile?.daily_mcq_submissions || 0, 50)}/50</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center">Daily Limit</p>
                    <p className="text-[9px] text-muted-foreground text-center mt-0.5">Free Plan</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${rawUserPlan === 'iconic' ? 'bg-gradient-to-br from-rose-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-violet-600'}`}>
                      {rawUserPlan === 'iconic' ? <Crown className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-white" />}
                    </div>
                    <p className="text-xs font-black text-foreground uppercase">{rawUserPlan === 'iconic' ? 'Iconic' : 'Premium'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Unlimited access</p>
                  </div>
                )}
              </div>

              <div className="relative min-h-[120px]">
                <motion.button
                  animate={{ opacity: termLoading ? 0 : 1, y: termLoading ? 4 : 0 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => setShowTermOfDay(true)}
                  className="rounded-2xl border border-border/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 backdrop-blur-sm p-4 text-left active:scale-[0.97] transition-all min-h-[120px] w-full"
                  disabled={termLoading || !termOfDay}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Term of the Day</span>
                  </div>
                  <h4 className="text-sm font-black text-foreground mb-1">{termOfDay?.term || 'Term of the Day'}</h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{termOfDay?.definition || 'Loading latest term...'}</p>
                </motion.button>

                {termLoading && (
                  <div className="absolute inset-0 rounded-2xl border border-border/40 bg-muted/30 p-4 animate-pulse pointer-events-none">
                    <div className="h-3 bg-muted rounded w-2/3 mb-3" />
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                )}
              </div>
            </div>

            <div className="relative min-h-[100px] mb-6">
              <motion.button
                animate={{ opacity: caseLoading ? 0 : 1, y: caseLoading ? 4 : 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setShowCaseOfDay(true)}
                className="w-full rounded-2xl border border-border/40 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 backdrop-blur-sm p-4 text-left active:scale-[0.97] transition-all"
                disabled={caseLoading || !caseOfDay}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Case of the Day</span>
                </div>
                <h4 className="text-sm font-black text-foreground mb-1">{caseOfDay?.headline || 'Case of the Day'}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{caseOfDay?.details || 'Loading latest case...'}</p>
              </motion.button>

              {caseLoading && (
                <div className="absolute inset-0 w-full rounded-2xl border border-border/40 bg-muted/30 p-4 animate-pulse pointer-events-none">
                  <div className="h-3 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              )}
            </div>

            {!isOfflineMode && <MCQProgressWidget />}

            {/* Institute Modules */}
            {instituteModules.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-4 h-4 text-primary animate-pulse-slow" />
                  <h2 className="text-sm font-bold text-foreground">Study Modules</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {instituteModules.map((action, i) => <ActionCard key={i} action={action} offlineMode={isOfflineMode} />)}
                </div>
              </div>
            )}

            {/* Review or Institute Card */}
            {dashboardAnnouncement ? (
              <DashboardAnnouncementCard
                announcement={dashboardAnnouncement}
                onOpen={() => setSelectedDashboardAnnouncement(dashboardAnnouncement)}
              />
            ) : (
              reviewCompleted ? (
                <InstituteDetailCard institute={instituteData} />
              ) : (
                <DashboardReviewCard onComplete={() => {
                  setReviewCompleted(true);
                  localStorage.setItem('medmacs_dashboard_review_completed', 'true');
                }} />
              )
            )}

            {/* Personalization */}
            <div className="flex items-center gap-2 mb-3 mt-6">
              <Target className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-bold text-foreground">Personalization</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {personalizationActions.map((action, i) => <ActionCard key={i} action={action} offlineMode={isOfflineMode} />)}
            </div>

            {/* Premium Perks with animated crown */}
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500 animate-bounce-gentle" />
              <h2 className="text-sm font-bold text-foreground">Premium Perks</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-8">
              {premiumPerks.map((action, i) => <ActionCard key={i} action={action} offlineMode={isOfflineMode} />)}
            </div>

            {/* Explore */}
            <div className="mb-6 pt-4 border-t border-border/30">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-violet-500" /> Explore
              </h2>
              <div className="mb-3">
                <ActionCard action={collaborateAction} offlineMode={isOfflineMode} />
              </div>
              <a href="https://medistics.app" target="_blank" rel="noopener noreferrer">
                <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/10 active:scale-[0.97] transition-all">
                  <div className="relative z-10 flex items-center gap-3">
                    <img src="lovable-uploads/WhatsApp Image 2025-07-20 at 15.46.21_0d2711fb rem bg.png" alt="Medmacs" className="w-8 h-8" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Medistics App</h3>
                      <p className="text-white/60 text-[11px] font-medium">The Best AI for MDCAT</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
                  </div>
                </div>
              </a>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 pb-16">
              <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
              <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="dashboard-modern-font min-h-screen w-full bg-background bg-mesh pb-28 overflow-x-hidden relative">
      {/* Floating gradient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <Seo title="Dashboard" description="Your personalized Medmacs App dashboard." canonical="https://medmacs.app/dashboard" />
      <VersionGuard />

      {/* Minimal top bar with avatar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/30 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-5 h-14">
          <div className="flex min-w-0 items-center gap-2.5">
            <AnimatePresence mode="wait" initial={false}>
              {activeTab === 'home' && isAccuracyCompact && !userStatsLoading && !isOfflineMode ? (
                <motion.div
                  key="compact-identity"
                  initial={{ opacity: 0, x: -8, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="flex min-w-0 items-center gap-2"
                >
                  <span className="max-w-[34vw] truncate text-sm font-black text-foreground tracking-tight">
                    {displayName.split(' ')[0]}
                  </span>
                  <AccuracyDonut value={userStats?.accuracy || 0} solved={userStats?.totalQuestions || 0} />
                </motion.div>
              ) : (
                <motion.div
                  key="brand-identity"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2.5"
                >
                  <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-6 h-6" />
                  <span className="text-sm font-extrabold text-foreground tracking-tight">Medmacs</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] font-bold bg-primary/10 text-primary border-0 px-2.5">
              {showHeaderScore ? `${userStats?.rankPoints || 0} pts` : userPlanDisplayName}
            </Badge>
            <button onClick={() => setActiveTab('profile')} className="shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden ring-1 ring-primary/20">
                {cachedAvatarUrl ? (
                  <img src={cachedAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-foreground font-bold text-[10px]">{displayName.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-5 mt-[var(--header-height)]">
        {renderTabContent()}
      </div>

      <AnimatePresence>
        {showStickyQuickActions && (
          <StickyQuickActions actions={quickActions} offlineMode={isOfflineMode} />
        )}
      </AnimatePresence>

      {/* What's New Dialog */}
      <Dialog open={showWhatsNew} onOpenChange={setShowWhatsNew}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">What's New</DialogTitle>
            <DialogDescription>Current Version: {appVersion}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {whatsNewLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Fetching updates...</p>
              </div>
            ) : whatsNewContent && whatsNewContent.length > 0 ? (
              whatsNewContent.map((r, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                  <Badge className="bg-primary/15 text-primary border-0 text-xs font-bold shrink-0">{r.version}</Badge>
                  <div>
                    <p className="text-sm font-bold text-foreground">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.desc || r.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent updates found.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Term of Day Dialog - vibrant */}
      <Dialog open={showTermOfDay} onOpenChange={setShowTermOfDay}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0">
          <DialogHeader>
            <DialogTitle className="sr-only">Term of the Day</DialogTitle>
            <DialogDescription className="sr-only">{termOfDay?.term}</DialogDescription>
          </DialogHeader>
          {termOfDay && (
            <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
                maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
              }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Term of the Day</p>
                    <h3 className="text-3xl font-black text-white">{termOfDay.term}</h3>
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{termOfDay.definition}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedDashboardAnnouncement}
        onOpenChange={(open) => {
          if (!open) setSelectedDashboardAnnouncement(null);
        }}
      >
        <DialogContent className="sm:max-w-[430px] p-0 overflow-hidden border-0 rounded-[2rem] [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {selectedDashboardAnnouncement?.modal_heading || 'Dashboard announcement'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {selectedDashboardAnnouncement?.modal_subheading}
            </DialogDescription>
          </DialogHeader>

          {selectedDashboardAnnouncement && (
            <div className="relative max-h-[82vh] overflow-hidden bg-[#06111f] text-white">
              {selectedDashboardAnnouncement.modal_background_image_url ? (
                <img
                  src={selectedDashboardAnnouncement.modal_background_image_url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#0f766e] to-[#075985]" />
              )}
              <div className="absolute inset-0 bg-black/55" />

              <div className="relative z-10 flex max-h-[82vh] flex-col">
                <div className="flex items-start justify-between gap-4 p-5 pb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2dd4bf] mb-2">
                      Medmacs Update
                    </p>
                    <h2 className="text-2xl font-black leading-tight tracking-tight">
                      {selectedDashboardAnnouncement.modal_heading}
                    </h2>
                  </div>
                  <button
                    onClick={() => setSelectedDashboardAnnouncement(null)}
                    className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0 active:scale-95 transition-all"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="overflow-y-auto px-5 pb-5">
                  <p className="text-sm leading-6 text-white/78 mb-5">
                    {selectedDashboardAnnouncement.modal_subheading}
                  </p>

                  {!!selectedDashboardAnnouncement.modal_image_urls?.length && (
                    <div className="mb-5 -mx-5 overflow-x-auto px-5">
                      <div className="flex gap-3 pb-1">
                        {selectedDashboardAnnouncement.modal_image_urls.map((imageUrl, index) => (
                          <img
                            key={`${imageUrl}-${index}`}
                            src={imageUrl}
                            alt=""
                            className="h-40 w-64 shrink-0 rounded-2xl object-cover border border-white/10 shadow-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDashboardAnnouncement.cta_text && selectedDashboardAnnouncement.cta_url && (
                    <button
                      onClick={() => openExternalUrl(selectedDashboardAnnouncement.cta_url)}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#0ea5e9]/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      {selectedDashboardAnnouncement.cta_text}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCollaborateModal} onOpenChange={setShowCollaborateModal}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border border-white/20 rounded-[2rem] bg-white/10 dark:bg-slate-950/50 backdrop-blur-2xl shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Why Medmacs</DialogTitle>
            <DialogDescription className="sr-only">
              Learn why students collaborate with Medmacs and visit the collaboration page.
            </DialogDescription>
          </DialogHeader>

          <div className="relative overflow-hidden text-white">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-500/45 via-slate-950/80 to-cyan-500/35" />
            <div className="absolute inset-0 bg-white/[0.06]" />
            <button
              onClick={() => setShowCollaborateModal(false)}
              className="absolute right-4 top-4 z-20 w-9 h-9 rounded-full bg-white/12 border border-white/15 flex items-center justify-center active:scale-95 transition-all"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="relative z-10 px-6 pt-7 pb-6">
              <div className="flex items-end justify-between gap-3 mb-5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200 mb-2">
                    Collaborate
                  </p>
                  <h2 className="text-3xl font-black leading-none tracking-tight">
                    Why Medmacs?
                  </h2>
                </div>
                <img
                  src="/mascots/Mascot3.png"
                  alt="Medmacs mascot"
                  className="w-28 h-28 object-contain drop-shadow-2xl shrink-0"
                />
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-4 mb-5 shadow-xl">
                <p className="text-sm leading-6 text-white/82">
                  Medmacs is built around students who want better study tools, sharper medical learning, and a community that actually moves fast. Collaborators help shape campaigns, campus presence, content ideas, and the next student-first features inside the app.
                </p>
              </div>

              <button
                onClick={() => openExternalUrl('https://medmacs.app/collaborate')}
                className="w-full py-3.5 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-black/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Visit Collaborate
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Case of Day Dialog - swipe reveal */}
      <Dialog open={showCaseOfDay} onOpenChange={setShowCaseOfDay}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-0 [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="sr-only">Case of the Day</DialogTitle>
            <DialogDescription className="sr-only">{caseOfDay?.case_name}</DialogDescription>
          </DialogHeader>
          {caseOfDay && (
            <CaseOfDayCard
              caseOfDay={caseOfDay}
              onClose={() => setShowCaseOfDay(false)}
              isPremium={rawUserPlan === 'premium'}
              onNavigateToChat={(text) => navigate('/ai/chatbot', { state: { prefilledText: text } })}
              onNavigateToPricing={() => navigate('/pricing')}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Premium bottom tab bar — active tab expands with label */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-3 mb-2 bg-card/95 backdrop-blur-2xl rounded-2xl border border-border/40 shadow-xl shadow-black/8 dark:shadow-black/30">
          <div className="flex items-center justify-around h-16 px-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex items-center justify-center transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
                  style={{
                    minWidth: isActive ? '110px' : '48px',
                  }}
                >
                  <div className={`relative flex items-center gap-2 transition-all duration-[400ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isActive
                    ? 'bg-primary rounded-2xl px-4 py-2.5 shadow-lg shadow-primary/25'
                    : 'py-2'
                    }`}>
                    <div className="relative">
                      <tab.icon className={`transition-all duration-300 ${isActive
                        ? 'w-[18px] h-[18px] text-primary-foreground'
                        : 'w-[18px] h-[18px] text-muted-foreground'
                        }`} />
                      {tab.badge && !isActive && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        className="text-[11px] font-bold text-primary-foreground whitespace-nowrap overflow-hidden"
                      >
                        {tab.label}
                      </motion.span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

    </div>
  );
};

export default Dashboard;
