// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Award, BookOpenCheck, CheckCircle2, Flame, HelpCircle, Library, MessageSquare, ScrollText, ShieldCheck, Swords, Target, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export type AchievementStats = {
  lifetimeMcqs: number;
  correctMcqs: number;
  flpCompletions: number;
  aiChatSessions: number;
  points: number;
  accuracy: number;
  aiQuestionHelpCount: number;
  fastCorrectCount: number;
  savedMcqs: number;
  battleWins: number;
  currentStreak: number;
  correctedMcqs: number;
  flashcardsGenerated: number;
};

type BadgeDefinition = {
  id: string;
  name: string;
  details: string;
  icon: any;
  color: string;
  isEarned: (stats: AchievementStats) => boolean;
};

const questionMilestones = [50, 100, 500, 1000, 5000, 10000, 25000];
const aiChatMilestones = [5, 10, 50, 100, 200, 500];
const accuracyMilestones = [95, 90, 85, 80, 75];
const flpMilestones = [1, 5, 10, 20];
const streakMilestones = [3, 7, 30, 60, 90, 120, 150];
const correctedMcqMilestones = [5, 20, 50, 100, 250, 500];
const flashcardMilestones = [20, 50, 100, 500, 1000, 5000];

const calculateCurrentStreak = (answers: any[]) => {
  const answerDates = answers.map((answer) => {
    const date = new Date(answer.created_at);
    return date.toLocaleDateString('en-US', { timeZone: 'Asia/Karachi' });
  });
  const uniqueDates = [...new Set(answerDates)];

  if (uniqueDates.length === 0) return 0;

  const today = new Date();
  const todayPKT = new Date(today.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
  todayPKT.setHours(0, 0, 0, 0);

  const yesterday = new Date(todayPKT);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateObjects = uniqueDates.map((dateString) => {
    const [month, day, year] = dateString.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }).sort((a, b) => b.getTime() - a.getTime());

  const mostRecentDate = dateObjects[0];
  const isToday = mostRecentDate.getTime() === todayPKT.getTime();
  const isYesterday = mostRecentDate.getTime() === yesterday.getTime();

  if (!isToday && !isYesterday) return 0;

  let streak = 1;
  let currentDate = new Date(mostRecentDate);

  for (let i = 1; i < dateObjects.length; i++) {
    const previousDate = new Date(dateObjects[i]);
    const expectedPreviousDate = new Date(currentDate);
    expectedPreviousDate.setDate(expectedPreviousDate.getDate() - 1);

    if (previousDate.getTime() === expectedPreviousDate.getTime()) {
      streak++;
      currentDate = previousDate;
    } else {
      break;
    }
  }

  return streak;
};

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...questionMilestones.map((count) => ({
    id: `mcqs_${count}`,
    name: `${count.toLocaleString()} MCQs`,
    details: `Attempt ${count.toLocaleString()} lifetime MCQs.`,
    icon: Target,
    color: 'from-blue-500 to-cyan-500',
    isEarned: (stats) => stats.lifetimeMcqs >= count,
  })),
  ...aiChatMilestones.map((count) => ({
    id: `ai_chats_${count}`,
    name: `${count} AI Chats`,
    details: `Start ${count} Dr Ahroid AI chat sessions.`,
    icon: MessageSquare,
    color: 'from-violet-500 to-fuchsia-500',
    isEarned: (stats) => stats.aiChatSessions >= count,
  })),
  ...accuracyMilestones.map((accuracy) => ({
    id: `accuracy_${accuracy}`,
    name: `${accuracy}% Accuracy`,
    details: `Maintain at least ${accuracy}% accuracy after 200 MCQs.`,
    icon: ShieldCheck,
    color: 'from-emerald-500 to-teal-500',
    isEarned: (stats) => stats.lifetimeMcqs >= 200 && stats.accuracy >= accuracy,
  })),
  ...flpMilestones.map((count) => ({
    id: `flp_completed_${count}`,
    name: count === 1 ? 'Complete an FLP' : `${count} FLPs Complete`,
    details: count === 1 ? 'Complete your first Full-Length Paper.' : `Complete ${count} Full-Length Papers.`,
    icon: ScrollText,
    color: 'from-fuchsia-500 to-rose-500',
    isEarned: (stats) => stats.flpCompletions >= count,
  })),
  ...streakMilestones.map((days) => ({
    id: `streak_${days}`,
    name: `${days} Day Streak`,
    details: `Maintain a ${days} day study streak.`,
    icon: Flame,
    color: 'from-orange-500 to-red-500',
    isEarned: (stats) => stats.currentStreak >= days,
  })),
  ...correctedMcqMilestones.map((count) => ({
    id: `corrected_mcqs_${count}`,
    name: `${count} MCQs Corrected`,
    details: `Correct ${count} MCQs in correction mode.`,
    icon: BookOpenCheck,
    color: 'from-rose-500 to-orange-500',
    isEarned: (stats) => stats.correctedMcqs >= count,
  })),
  ...flashcardMilestones.map((count) => ({
    id: `flashcards_generated_${count}`,
    name: `${count.toLocaleString()} Flashcards`,
    details: `Generate ${count.toLocaleString()} AI learning flashcards.`,
    icon: Library,
    color: 'from-cyan-500 to-blue-500',
    isEarned: (stats) => stats.flashcardsGenerated >= count,
  })),
  {
    id: 'dr_ahroid_question_help',
    name: 'Guided By Dr Ahroid',
    details: 'Use Help with current question while solving an MCQ.',
    icon: HelpCircle,
    color: 'from-amber-500 to-orange-500',
    isEarned: (stats) => stats.aiQuestionHelpCount >= 1,
  },
  {
    id: 'fast_correct_under_15',
    name: '15 Second Strike',
    details: 'Answer a question correctly in under 15 seconds.',
    icon: Flame,
    color: 'from-rose-500 to-red-500',
    isEarned: (stats) => stats.fastCorrectCount >= 1,
  },
  {
    id: 'saved_25_mcqs',
    name: 'Question Collector',
    details: 'Save 25 MCQs for revision.',
    icon: Award,
    color: 'from-indigo-500 to-blue-500',
    isEarned: (stats) => stats.savedMcqs >= 25,
  },
  {
    id: 'first_battle_win',
    name: 'Battle Winner',
    details: 'Win your first battle.',
    icon: Swords,
    color: 'from-purple-500 to-pink-500',
    isEarned: (stats) => stats.battleWins >= 1,
  },
];

const defaultStats: AchievementStats = {
  lifetimeMcqs: 0,
  correctMcqs: 0,
  flpCompletions: 0,
  aiChatSessions: 0,
  points: 0,
  accuracy: 0,
  aiQuestionHelpCount: 0,
  fastCorrectCount: 0,
  savedMcqs: 0,
  battleWins: 0,
  currentStreak: 0,
  correctedMcqs: 0,
  flashcardsGenerated: 0,
};

const arraysEqual = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index]);
const announcedUnlocks = new Set<string>();

export const notifyAchievementProgress = (reason = 'progress') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('achievement:refresh', { detail: { reason } }));
};

const getPakistanDateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const getFlashcardDailyLimit = (plan?: string | null) => {
  const normalizedPlan = String(plan || 'free').toLowerCase();
  if (normalizedPlan === 'premium') return 500;
  if (normalizedPlan === 'iconic') return 10;
  return 2;
};

export const getFlashcardQuota = async (userId?: string) => {
  if (!userId) {
    return {
      plan: 'free',
      limit: 0,
      used: 0,
      remaining: 0,
      dateKey: getPakistanDateKey(),
      badges: {},
    };
  }

  const dateKey = getPakistanDateKey();
  const { data: profile } = await supabase.from('profiles').select('plan, badges, flashcard_generated').eq('id', userId).maybeSingle();
  const badges = profile?.badges || {};
  const currentStats = badges.stats || {};
  const dailyUsage = currentStats.flashcardsDailyUsage || {};
  const used = dailyUsage.date === dateKey ? Number(dailyUsage.count || 0) : 0;
  const limit = getFlashcardDailyLimit(profile?.plan);

  return {
    plan: String(profile?.plan || 'free').toLowerCase(),
    lifetimeGenerated: Number(profile?.flashcard_generated || currentStats.flashcardsGeneratedCount || 0),
    limit,
    used,
    remaining: Math.max(0, limit - used),
    dateKey,
    badges,
  };
};

export const recordGeneratedFlashcards = async (userId?: string, count = 0) => {
  if (!userId || count <= 0) return;

  const quota = await getFlashcardQuota(userId);
  const currentBadges = quota.badges || {};
  const currentStats = currentBadges.stats || {};
  const nextCount = Number(quota.lifetimeGenerated || currentStats.flashcardsGeneratedCount || 0) + count;
  const nextDailyCount = quota.used + count;

  await supabase
    .from('profiles')
    .update({
      flashcard_generated: nextCount,
      badges: {
        ...currentBadges,
        stats: {
          ...currentStats,
          flashcardsGeneratedCount: nextCount,
          flashcardsDailyUsage: {
            date: quota.dateKey,
            count: nextDailyCount,
            limit: quota.limit,
            plan: quota.plan,
          },
        },
        synced_at: new Date().toISOString(),
      },
    } as any)
    .eq('id', userId);

  notifyAchievementProgress('flashcards_generated');
};

const playAchievementSound = () => {
  try {
    const audio = new Audio('/soundeffects/achievement-unlocked.mp3');
    audio.volume = 0.55;
    audio.play().catch(() => undefined);
  } catch {
    // Ignore browsers that block or cannot initialize audio.
  }
};

const AchievementUnlockToast = ({ badge, onDismiss }: { badge: BadgeDefinition | null; onDismiss: () => void }) => (
  <AnimatePresence>
    {badge && (
      <motion.div
        initial={{ opacity: 0, y: -40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -40, scale: 0.96 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        drag="y"
        dragConstraints={{ top: -90, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.y < -18 || info.velocity.y < -250) onDismiss();
        }}
        className="fixed left-3 right-3 z-[300] mx-auto max-w-md"
        style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <div className={`flex items-center gap-3 rounded-full bg-gradient-to-r ${badge.color} px-4 py-3 text-white shadow-2xl shadow-black/20 ring-1 ring-white/20`}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Achievement unlocked</p>
            <p className="truncate text-sm font-black leading-tight">{badge.name}</p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80 active:scale-95"
            aria-label="Dismiss achievement notification"
          >
            <span className="text-lg leading-none">x</span>
          </button>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const useAchievementData = (userId?: string, queryOptions: any = {}) => {
  return useQuery({
    queryKey: ['achievement-data', userId],
    queryFn: async () => {
      if (!userId) return { stats: defaultStats, earnedBadgeIds: [], profileBadges: null };

      const [
        answersResult,
        flpResult,
        aiChatsResult,
        savedResult,
        battleResult,
        profileResult,
      ] = await Promise.all([
        supabase.from('user_answers').select('is_correct, time_taken, created_at, used_ai_help, correction_mode').eq('user_id', userId),
        (supabase as any).from('flp_user_attempts').select('id').eq('user_id', userId),
        supabase.from('ai_chat_sessions').select('id').eq('user_id', userId),
        supabase.from('saved_mcqs').select('id').eq('user_id', userId),
        supabase.from('battle_results').select('rank').eq('user_id', userId),
        supabase.from('profiles').select('badges, flashcard_generated').eq('id', userId).maybeSingle(),
      ]);

      const answers = answersResult.data || [];
      const correctMcqs = answers.filter((answer) => answer.is_correct).length;
      const lifetimeMcqs = answers.length;
      const accuracy = lifetimeMcqs > 0 ? Math.round((correctMcqs / lifetimeMcqs) * 100) : 0;
      const profileBadges = profileResult.data?.badges || {};
      const previousStats = profileBadges?.stats || {};

      const stats: AchievementStats = {
        lifetimeMcqs,
        correctMcqs,
        flpCompletions: Math.max(Number(previousStats.flpCompletionCount || 0), flpResult.data?.length || 0),
        aiChatSessions: aiChatsResult.data?.length || 0,
        points: correctMcqs * 10 + accuracy,
        accuracy,
        aiQuestionHelpCount: Math.max(Number(previousStats.aiQuestionHelpCount || 0), answers.filter((answer) => answer.used_ai_help).length),
        fastCorrectCount: answers.filter((answer) => answer.is_correct && Number(answer.time_taken || 0) > 0 && Number(answer.time_taken || 0) <= 15).length,
        savedMcqs: savedResult.data?.length || 0,
        battleWins: battleResult.data?.filter((battle) => battle.rank === 1).length || 0,
        currentStreak: calculateCurrentStreak(answers),
        correctedMcqs: answers.filter((answer) => answer.correction_mode && answer.is_correct).length,
        flashcardsGenerated: Number(profileResult.data?.flashcard_generated || previousStats.flashcardsGeneratedCount || 0),
      };

      const newlyEarnedBadgeIds = BADGE_DEFINITIONS
        .filter((badge) => badge.isEarned(stats))
        .map((badge) => badge.id);
      const savedEarnedBadgeIds = Array.isArray(profileBadges?.earned_badge_ids) ? profileBadges.earned_badge_ids : [];
      const earnedBadgeIds = [...new Set([...savedEarnedBadgeIds, ...newlyEarnedBadgeIds])];

      return { stats, earnedBadgeIds, profileBadges };
    },
    enabled: !!userId,
    staleTime: 1000 * 60,
    ...queryOptions,
  });
};

export const AchievementUnlockNotifier = ({ userId }: { userId?: string }) => {
  const { data, refetch } = useAchievementData(userId, {
    refetchInterval: userId ? 15000 : false,
  });
  const [unlockToast, setUnlockToast] = useState<BadgeDefinition | null>(null);
  const hasInitializedRef = useRef(false);
  const stats = data?.stats || defaultStats;
  const earnedBadgeIds = data?.earnedBadgeIds || [];

  useEffect(() => {
    if (!userId || !data) return;

    const previousIds = data.profileBadges?.earned_badge_ids || [];
    const sortedPrevious = [...previousIds].sort();
    const sortedNext = [...earnedBadgeIds].sort();
    const newlyUnlockedIds = sortedNext.filter((badgeId) => !sortedPrevious.includes(badgeId));
    const previousStats = data.profileBadges?.stats || {};
    const nextStats = { ...previousStats, ...stats };
    const shouldAnnounce = hasInitializedRef.current;
    hasInitializedRef.current = true;

    if (arraysEqual(sortedPrevious, sortedNext) && JSON.stringify(previousStats) === JSON.stringify(nextStats)) return;

    supabase
      .from('profiles')
      .update({
        badges: {
          earned_badge_ids: sortedNext,
          stats: nextStats,
          synced_at: new Date().toISOString(),
        },
      } as any)
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.error('Failed to sync profile badges:', error);
        if (error || !shouldAnnounce || newlyUnlockedIds.length === 0) return;

        const badgeToAnnounce = BADGE_DEFINITIONS.find((badge) => badge.id === newlyUnlockedIds[0]);
        if (!badgeToAnnounce) return;

        const announceKey = `${userId}:${badgeToAnnounce.id}`;
        if (announcedUnlocks.has(announceKey)) return;
        announcedUnlocks.add(announceKey);

        setUnlockToast(badgeToAnnounce);
        playAchievementSound();
      });
  }, [userId, data, earnedBadgeIds, stats]);

  useEffect(() => {
    if (!unlockToast) return;
    const timer = window.setTimeout(() => setUnlockToast(null), 5000);
    return () => window.clearTimeout(timer);
  }, [unlockToast]);

  useEffect(() => {
    const handleRefresh = () => refetch();
    window.addEventListener('achievement:refresh', handleRefresh);
    return () => window.removeEventListener('achievement:refresh', handleRefresh);
  }, [refetch]);

  if (!userId) return null;

  return <AchievementUnlockToast badge={unlockToast} onDismiss={() => setUnlockToast(null)} />;
};

export const AchievementBadges = ({ userId, compact = false }: { userId?: string; compact?: boolean }) => {
  const { data, isLoading } = useAchievementData(userId);
  const stats = data?.stats || defaultStats;
  const earnedBadgeIds = data?.earnedBadgeIds || [];
  const earnedSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);

  if (isLoading) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-muted to-muted/50" />
          <div className="flex-1">
            <div className="h-5 w-32 animate-pulse rounded bg-muted mb-2" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted/70" />
          </div>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-38 w-44 shrink-0 animate-pulse rounded-2xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-2">
        <div className="mb-5 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                Badges
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                  {earnedBadgeIds.length}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground font-semibold">{earnedBadgeIds.length}/{BADGE_DEFINITIONS.length} unlocked • {stats.points} pts</p>
            </div>
          </div>
        </div>

        <div className="relative -mx-4 overflow-hidden">
          <div className="flex gap-4 overflow-x-auto px-4 pb-3 pt-1">
            {BADGE_DEFINITIONS.map((badge) => {
              const earned = earnedSet.has(badge.id);
              const Icon = badge.icon;

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`relative w-44 shrink-0 rounded-2xl border-2 p-4 transition-all duration-300 ${
                    earned
                      ? `border-transparent bg-gradient-to-br ${badge.color} text-white shadow-2xl shadow-primary/20 scale-[1.02] hover:scale-105`
                      : 'border-border/50 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 backdrop-blur-sm'
                  } ${compact ? 'min-h-[132px]' : 'min-h-[154px]'}`}
                >
                  {/* Sparkle effect for earned badges */}
                  {earned && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle2 className="h-5 w-5 text-white drop-shadow-lg animate-bounce-gentle" />
                    </div>
                  )}

                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                    earned
                      ? 'bg-white/25 backdrop-blur-sm shadow-lg'
                      : 'bg-background/80 border border-border/50'
                  }`}>
                    <Icon className={`h-6 w-6 transition-all ${earned ? 'text-white' : 'text-muted-foreground/60'}`} />
                  </div>

                  <p className={`text-sm font-black leading-tight mb-1.5 ${
                    earned ? 'text-white drop-shadow-md' : 'text-foreground/70'
                  }`}>
                    {badge.name}
                  </p>

                  <p className={`text-[11px] leading-snug ${
                    earned ? 'text-white/85' : 'text-muted-foreground/60'
                  }`}>
                    {badge.details}
                  </p>

                  {/* Shine effect for earned badges */}
                  {earned && (
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
    </div>
  );
};
