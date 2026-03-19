import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

export const MCQProgressSkeleton = () => {
  return (
    <div className="mb-6 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-orange-500/50" />
        <Skeleton className="h-4 w-40" />
      </div>
      
      {/* Horizontally scrollable container skeleton */}
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-5 px-5">
        {[1, 2].map((i) => (
          <div 
            key={i}
            className="relative flex items-center justify-between gap-4 p-4 rounded-[1.8rem] bg-muted/30 border border-border/20 shrink-0 w-[280px]"
          >
            <div className="flex-1 min-w-0 space-y-3">
              <Skeleton className="h-3 w-20" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>

            <div className="relative shrink-0">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-background border border-border/50 flex items-center justify-center">
                <Skeleton className="w-3 h-3 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
