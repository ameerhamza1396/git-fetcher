import { Skeleton } from "@/components/ui/skeleton";
import DashboardHeader from "@/components/dashboard/DashboardHeader"; // Optional, depending on your app's structure
import { ArrowLeft } from "lucide-react";

const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header Skeleton */}
      <header className="bg-card/80 backdrop-blur-xl border-b border-border/40 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
             <Skeleton className="w-8 h-8 rounded-full" />
             <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </header>
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-6">
        
        {/* Banner or Title area */}
        <div className="space-y-2 mt-4">
            <Skeleton className="h-8 w-3/4 max-w-[250px]" />
            <Skeleton className="h-4 w-1/2 max-w-[200px]" />
        </div>
        
        {/* Main Card/Container block */}
        <div className="rounded-2xl border border-border/40 bg-card/50 p-4 space-y-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
        </div>

        {/* List items block */}
        <div className="space-y-3">
           <Skeleton className="h-20 w-full rounded-xl" />
           <Skeleton className="h-20 w-full rounded-xl" />
           <Skeleton className="h-20 w-full rounded-xl" />
        </div>

      </div>
    </div>
  );
};

export default PageSkeleton;
