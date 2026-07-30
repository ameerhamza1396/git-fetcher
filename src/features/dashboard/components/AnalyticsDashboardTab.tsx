import { lazy, Suspense } from 'react';
import { BookOpen, ChevronRight, Loader2, PieChart, Sparkles, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnalyticsPlan } from '../types';

const LazyStudyAnalytics = lazy(() =>
  import('@/components/dashboard/StudyAnalytics').then((module) => ({ default: module.StudyAnalytics })),
);
const LazyProgressTracker = lazy(() =>
  import('@/components/mcq/ProgressTracker').then((module) => ({ default: module.ProgressTracker })),
);

type AnalyticsDashboardTabProps = {
  userId?: string;
  isOfflineMode: boolean;
  analyticsPlan: AnalyticsPlan | null;
  analyticsPlanLoading: boolean;
  analyticsPlanCadence: string;
  onRequestPlan: () => void;
  onNavigateToMcqs: () => void;
  onNavigateToDetails: () => void;
};

export function AnalyticsDashboardTab({
  userId,
  isOfflineMode,
  analyticsPlan,
  analyticsPlanLoading,
  analyticsPlanCadence,
  onRequestPlan,
  onNavigateToMcqs,
  onNavigateToDetails,
}: AnalyticsDashboardTabProps) {
  if (isOfflineMode) {
    return (
      <div>
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
          <Button onClick={onNavigateToMcqs} className="mt-5 rounded-2xl font-black">
            <BookOpen className="mr-2 h-4 w-4" />
            Practice Downloaded MCQs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-1">📊 Analytics</h1>
      <p className="text-xs text-muted-foreground mb-4">Track your progress</p>

      <div className="mb-4 rounded-3xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Request AI Analysis</p>
            <h2 className="mt-1 text-base font-black text-foreground">Dr Ahroid study plan</h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
              Analytic data will be sent to AI and Dr Ahroid will plan which subject needs attention and what strategy to follow.
            </p>
          </div>
          <Button onClick={onRequestPlan} disabled={analyticsPlanLoading} className="h-10 shrink-0 rounded-2xl px-3 text-xs font-black">
            {analyticsPlanLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Analyze
          </Button>
        </div>

        <div className="mt-3 rounded-2xl border border-border/50 bg-background/70 p-3">
          {analyticsPlan ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-black text-foreground">{analyticsPlan.headline}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Focus: <span className="font-bold text-primary">{analyticsPlan.focusSubject}</span>
                  {analyticsPlan.focusReason ? ` - ${analyticsPlan.focusReason}` : ''}
                </p>
              </div>
              {!!analyticsPlan.strategy?.length && (
                <div className="space-y-1.5">
                  {analyticsPlan.strategy.slice(0, 4).map((step, index) => (
                    <div key={step} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-black text-primary">{index + 1}</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
              {analyticsPlan.nextSession && (
                <p className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-bold leading-relaxed text-primary">
                  Next session: {analyticsPlan.nextSession}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs font-medium leading-relaxed text-muted-foreground">
              Ask Dr Ahroid for a personalized study plan from your analytics. Your plan can request this {analyticsPlanCadence}.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onNavigateToDetails}
        className="mb-5 w-full rounded-2xl border border-border/50 bg-card/90 p-4 text-left shadow-sm transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <PieChart className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">Deep Analysis</p>
              <p className="text-[11px] text-muted-foreground">Subject & topic-wise breakdown</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
      </button>

      <Suspense fallback={<div className="h-[560px] animate-pulse rounded-2xl bg-muted/30" />}>
        <LazyProgressTracker userId={userId} />
        <LazyStudyAnalytics />
      </Suspense>
    </div>
  );
}
