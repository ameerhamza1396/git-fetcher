import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronRight, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { BADGE_TONES, BadgeMedallion } from './BadgeMedallion';
import { AchievementBadgesSkeleton } from './AchievementBadgesSkeleton';
import { BadgeDetailSheet, BadgeGrid, useBadgeDetail } from './BadgeGrid';
import { BADGE_DEFINITIONS, defaultStats, sortEarnedFirst, type AchievementStats, type BadgeDefinition } from './badgeDefinitions';

export type { AchievementStats, BadgeDefinition };
export { BADGE_DEFINITIONS };

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
        <div className={`flex items-center gap-3 rounded-full bg-gradient-to-r ${BADGE_TONES[badge.tone].gradient} px-4 py-3 text-white shadow-2xl shadow-black/20 ring-1 ring-white/20`}>
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

type AchievementData = {
  stats: AchievementStats;
  earnedBadgeIds: string[];
  profileBadges: {
    earned_badge_ids?: string[];
    stats?: Partial<AchievementStats> & {
      flpCompletionCount?: number;
      flashcardsGeneratedCount?: number;
    };
  } | null;
};

export const useAchievementData = (
  userId?: string,
  queryOptions: Partial<UseQueryOptions<AchievementData>> = {},
) => {
  return useQuery<AchievementData>({
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
        referralResult,
      ] = await Promise.all([
        supabase.from('user_answers').select('is_correct, time_taken, created_at, used_ai_help, correction_mode').eq('user_id', userId),
        (supabase as any).from('flp_user_attempts').select('id').eq('user_id', userId),
        supabase.from('ai_chat_sessions').select('id').eq('user_id', userId),
        supabase.from('saved_mcqs').select('id').eq('user_id', userId),
        supabase.from('battle_results').select('rank').eq('user_id', userId),
        supabase.from('profiles').select('badges, flashcard_generated').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', userId),
      ]);

      const answers = answersResult.data || [];
      const correctMcqs = answers.filter((answer) => answer.is_correct).length;
      const lifetimeMcqs = answers.length;
      const accuracy = lifetimeMcqs > 0 ? Math.round((correctMcqs / lifetimeMcqs) * 100) : 0;
      const profileBadges = (profileResult.data?.badges || {}) as AchievementData['profileBadges'];
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
        referralCount: referralResult.count || 0,
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

const PREVIEW_BADGE_COUNT = 8;

/** Profile-tab preview: progress summary plus a capped grid that links out to the full badges page. */
export const AchievementBadges = ({ userId, compact = false }: { userId?: string; compact?: boolean }) => {
  const { data, isLoading } = useAchievementData(userId);
  const { activeBadge, isOpen, openBadge, closeBadge } = useBadgeDetail();
  const stats = data?.stats || defaultStats;
  const earnedBadgeIds = data?.earnedBadgeIds || [];
  const earnedSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);
  const previewBadges = useMemo(() => sortEarnedFirst(BADGE_DEFINITIONS, earnedSet).slice(0, PREVIEW_BADGE_COUNT), [earnedSet]);

  if (isLoading) {
    return <AchievementBadgesSkeleton count={PREVIEW_BADGE_COUNT} compact={compact} />;
  }

  const progress = Math.round((earnedBadgeIds.length / BADGE_DEFINITIONS.length) * 100);

  return (
    <div className="py-2">
      <div className="mb-5 flex items-center gap-3.5 px-1">
        <BadgeMedallion
          shape="rosette"
          tone="amber"
          icon={Trophy}
          earned={earnedBadgeIds.length > 0}
          showLock={false}
          className="h-14 w-14"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="text-lg font-black uppercase tracking-tight text-foreground">Badges</h3>
            <span className="text-xs font-bold text-muted-foreground">
              {earnedBadgeIds.length}/{BADGE_DEFINITIONS.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
            />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
            {progress}% unlocked • {stats.points.toLocaleString()} pts
          </p>
        </div>
      </div>

      <BadgeGrid
        badges={previewBadges}
        earnedIds={earnedSet}
        activeBadgeId={isOpen ? activeBadge?.id : null}
        onSelect={openBadge}
        size={compact ? 'sm' : 'md'}
      />

      <Link
        to="/profile/badges"
        className="mt-4 flex w-full items-center justify-center gap-1 rounded-2xl border border-border/40 bg-card/60 py-2.5 text-xs font-black uppercase tracking-wider text-primary transition-colors active:bg-muted/60"
      >
        See all {BADGE_DEFINITIONS.length} badges
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>

      <BadgeDetailSheet
        badge={activeBadge}
        earned={activeBadge ? earnedSet.has(activeBadge.id) : false}
        open={isOpen}
        onClose={closeBadge}
      />
    </div>
  );
};
