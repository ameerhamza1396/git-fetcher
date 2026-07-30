import { Skeleton } from '@/components/ui/skeleton';

export const MCQLoadingSkeleton = () => (
  <div
    className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background"
    aria-label="Loading quiz questions"
    aria-busy="true"
  >
    <header className="border-b border-border/40 bg-background/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex flex-1 flex-col items-center gap-2">
          <Skeleton className="h-4 w-36 rounded-full" />
          <Skeleton className="h-2.5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
      <div className="mx-auto mt-3 w-full max-w-4xl">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </header>

    <main className="min-h-0 flex-1 overflow-hidden px-4 py-5 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-3xl border border-border/60 bg-card/85 p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>

          <div className="space-y-3">
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-5 w-11/12 rounded-lg" />
            <Skeleton className="h-5 w-7/12 rounded-lg" />
          </div>

          <div className="mt-7 space-y-3">
            {[0, 1, 2, 3].map(option => (
              <div
                key={option}
                className="flex items-center gap-3 rounded-2xl border border-border/50 p-3.5"
              >
                <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                <Skeleton className={`h-4 rounded-full ${
                  option === 1 ? 'w-8/12' : option === 2 ? 'w-10/12' : 'w-9/12'
                }`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>

    <footer className="border-t border-border/40 bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl gap-3">
        <Skeleton className="h-12 w-28 rounded-xl sm:w-32" />
        <Skeleton className="h-12 flex-1 rounded-xl" />
      </div>
    </footer>
  </div>
);

export default MCQLoadingSkeleton;
