import { Skeleton } from '@/components/ui/skeleton';

export const FLPResultSkeleton = () => (
  <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
    <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
    <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/15" />

    {/* Header */}
    <header className="shrink-0 bg-background/88 backdrop-blur-2xl border-b border-border/60 pt-[env(safe-area-inset-top)] z-40">
      <div className="container mx-auto px-5 h-16 flex justify-between items-center max-w-4xl">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-4 w-32 rounded-full" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </header>

    <main className="relative z-10 flex-1 flex flex-col min-h-0 w-full max-w-4xl mx-auto px-4 pt-4 pb-4 overflow-hidden gap-4">
      {/* Score Card */}
      <div className="overflow-hidden border border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl rounded-[1.5rem] shadow-sm">
        <div className="p-4 md:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-24 h-24 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-6 w-48 rounded-full" />
              <Skeleton className="h-3 w-full max-w-xs rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-border/20 pt-3">
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
            <Skeleton className="h-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-6 border-b border-border/50 shrink-0 pb-3">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-18 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Questions List */}
      <div className="flex-1 rounded-3xl border border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl shadow-sm p-2 divide-y divide-border/40">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-5">
            <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2.5 w-20 rounded-full" />
              <Skeleton className="h-4 w-full max-w-md rounded-full" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>
    </main>
  </div>
);

export default FLPResultSkeleton;
