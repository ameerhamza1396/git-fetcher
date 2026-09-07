import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Crown,
  Flame,
  FlaskConical,
  Gauge,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  TrendingUp,
  WifiOff,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MCQProgressWidget } from '@/components/dashboard/MCQProgressWidget';
import { DashboardActionCard } from './DashboardActionCard';
import { DashboardAnnouncementCard } from './DashboardAnnouncementCard';
import { InstituteDetailCard } from './InstituteDetailCard';
import type {
  AiUsageSummary,
  CaseOfDay,
  DashboardAction,
  DashboardAnnouncement,
  DashboardInstitute,
  DashboardProfile,
  DashboardPromotion,
  TermOfDay,
  UserStats,
} from '../types';

type HomeDashboardTabProps = {
  greetingMessage: string;
  displayName: string;
  dashboardNoticeLine?: string;
  isOfflineMode: boolean;
  userStats?: UserStats | null;
  userStatsLoading: boolean;
  quickActions: DashboardAction[];
  rawUserPlan: string;
  profile?: DashboardProfile | null;
  aiUsageSummary?: AiUsageSummary;
  aiUsageSummaryLoading: boolean;
  termOfDay?: TermOfDay;
  termLoading: boolean;
  onOpenTerm: () => void;
  onOpenUsageLimits: () => void;
  caseOfDay?: CaseOfDay;
  caseLoading: boolean;
  onOpenCase: () => void;
  instituteModules: DashboardAction[];
  dashboardAnnouncement?: DashboardAnnouncement | null;
  onOpenAnnouncement: (announcement: DashboardAnnouncement) => void;
  instituteData: DashboardInstitute;
  personalizationActions: DashboardAction[];
  premiumPerks: DashboardAction[];
  promotions: DashboardPromotion[];
  onOpenCollaborate: () => void;
};

export function HomeDashboardTab({
  greetingMessage,
  displayName,
  dashboardNoticeLine,
  isOfflineMode,
  userStats,
  userStatsLoading,
  quickActions,
  rawUserPlan,
  profile,
  aiUsageSummary,
  aiUsageSummaryLoading,
  termOfDay,
  termLoading,
  onOpenTerm,
  onOpenUsageLimits,
  caseOfDay,
  caseLoading,
  onOpenCase,
  instituteModules,
  dashboardAnnouncement,
  onOpenAnnouncement,
  instituteData,
  personalizationActions,
  premiumPerks,
  promotions,
  onOpenCollaborate,
}: HomeDashboardTabProps) {
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
  return (
    <div>
      <div className="mb-5">
        <p className="mb-1 text-xs font-bold text-muted-foreground brand-syne">{greetingMessage}</p>
        <h1 className="text-3xl sm:text-4xl font-black text-shimmer leading-[1.05] break-words brand-syne">{displayName}</h1>
        {dashboardNoticeLine && (
          <div className="mt-3 rounded-xl border border-amber-200/70 bg-[#fff8db] px-3 py-2 text-xs font-bold leading-relaxed text-amber-900 shadow-sm dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100">
            {dashboardNoticeLine}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1.5 font-medium">Ready for your next study move?</p>
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
        <div className="relative mb-6 min-h-[100px]">
          <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/12 to-accent/40 p-4 shadow-md shadow-primary/5 dark:from-primary/20 dark:to-accent/20">
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
          </div>
          {userStatsLoading && (
            <div className="absolute inset-0 bg-muted/50 rounded-2xl p-4 animate-pulse pointer-events-none">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-2.5 bg-muted rounded w-full mb-2" />
              <div className="flex justify-between">
                <div className="h-3 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-1/4" />
              </div>
            </div>
          )}
        </div>
      )}

      <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
        <Zap className="text-amber-500 fill-amber-500 w-3.5 h-3.5" /> Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {quickActions.map((action) => (
          <DashboardActionCard key={action.title} action={action} fixedHeight flat offlineMode={isOfflineMode} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={onOpenUsageLimits}
          className="rounded-2xl border border-border/40 bg-gradient-to-br from-primary/10 to-accent/40 backdrop-blur-sm p-4 text-left active:scale-[0.97] transition-all min-h-[120px] w-full dark:from-primary/15 dark:to-accent/20"
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Gauge className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Usage Limits</span>
          </div>
          <p className="text-sm font-black text-foreground mb-1">{userPlanDisplayName || 'Free Plan'}</p>
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {aiUsageSummaryLoading ? 'Checking AI...' : aiUsageSummary?.label || 'Tap to view usage details'}
          </p>
        </button>

        <div className="relative min-h-[120px]">
          <motion.button
            type="button"
            animate={{ opacity: termLoading ? 0 : 1, y: termLoading ? 4 : 0 }}
            transition={{ duration: 0.25 }}
            onClick={onOpenTerm}
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
          {termLoading && <div className="absolute inset-0 rounded-2xl border border-border/40 bg-muted/30 animate-pulse pointer-events-none" />}
        </div>
      </div>

      <div className="relative min-h-[100px] mb-6">
        <motion.button
          type="button"
          animate={{ opacity: caseLoading ? 0 : 1, y: caseLoading ? 4 : 0 }}
          transition={{ duration: 0.25 }}
          onClick={onOpenCase}
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
        {caseLoading && <div className="absolute inset-0 w-full rounded-2xl border border-border/40 bg-muted/30 animate-pulse pointer-events-none" />}
      </div>

      {!isOfflineMode && <MCQProgressWidget />}

      {instituteModules.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-primary animate-pulse-slow" />
            <h2 className="text-sm font-bold text-foreground">Study Modules</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {instituteModules.map((action) => (
          <DashboardActionCard key={action.title} action={action} flat offlineMode={isOfflineMode} />
            ))}
          </div>
        </div>
      )}

      {dashboardAnnouncement ? (
        <DashboardAnnouncementCard announcement={dashboardAnnouncement} onOpen={() => onOpenAnnouncement(dashboardAnnouncement)} />
      ) : (
        <InstituteDetailCard institute={instituteData} />
      )}

      <div className="flex items-center gap-2 mb-3 mt-6">
        <Target className="w-4 h-4 text-rose-500" />
        <h2 className="text-sm font-bold text-foreground">Personalization</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {personalizationActions.map((action) => (
          <DashboardActionCard key={action.title} action={action} flat offlineMode={isOfflineMode} />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-amber-500 animate-bounce-gentle" />
        <h2 className="text-sm font-bold text-foreground">Premium Perks</h2>
      </div>
      <div className="mb-8 divide-y divide-border/40 rounded-2xl">
        {premiumPerks.map((action) => {
          const isDisabled = action.disabled || (isOfflineMode && action.link !== '/mcqs');
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              to={isDisabled ? '#' : action.link || '#'}
              className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted/50 ${isDisabled ? 'pointer-events-none opacity-45 grayscale' : ''}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-sm`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-foreground leading-tight">{action.title}</h3>
                <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
            </Link>
          );
        })}
      </div>

      {promotions.length > 0 && (
        <div className="mb-6 border-t border-border/30 pt-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-violet-500" /> Explore
          </h2>
          <div className="space-y-3">
            {promotions.map((promotion) => {
              const card = (
                <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600 to-purple-700 p-4 text-left shadow-lg shadow-violet-500/10 transition-all active:scale-[0.97]">
                  <div className="relative z-10 flex items-center gap-3">
                    {promotion.image_url && (
                      <img
                        src={promotion.image_url}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-xl object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-bold text-white">{promotion.title}</h3>
                      {promotion.subtitle && (
                        <p className="truncate text-[11px] font-medium text-white/65">{promotion.subtitle}</p>
                      )}
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-white/50" />
                  </div>
                </div>
              );

              if (promotion.action_type === 'collaborate') {
                return (
                  <button
                    key={promotion.id}
                    type="button"
                    className="block w-full"
                    onClick={onOpenCollaborate}
                  >
                    {card}
                  </button>
                );
              }

              const isExternal = /^https?:\/\//i.test(promotion.target_url || '');
              return (
                <a
                  key={promotion.id}
                  href={promotion.target_url || '#'}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                  className="block"
                >
                  {card}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <div className="text-center pt-2 pb-16">
        <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
      </div>
    </div>
  );
}
