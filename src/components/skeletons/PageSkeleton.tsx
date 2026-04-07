import { Skeleton } from "@/components/ui/skeleton";
import DashboardHeader from "@/components/dashboard/DashboardHeader"; // Optional, depending on your app's structure
import { ArrowLeft } from "lucide-react";

const PageSkeleton = () => {
  return (
    <div className="min-h-screen bg-background p-6 space-y-8 animate-pulse">
      {/* Header Area */}
      <div className="flex items-center justify-between opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted" />
          <div className="h-4 w-24 bg-muted rounded-full" />
        </div>
        <div className="w-10 h-10 rounded-2xl bg-muted" />
      </div>

      {/* Hero Block */}
      <div className="space-y-4">
        <div className="h-12 w-3/4 bg-muted rounded-2xl" />
        <div className="h-4 w-1/2 bg-muted rounded-full opacity-60" />
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="h-48 w-full bg-muted/40 rounded-[2.5rem] border border-border/50" />
        
        <div className="grid grid-cols-1 gap-4">
          <div className="h-20 w-full bg-muted/30 rounded-3xl" />
          <div className="h-20 w-full bg-muted/30 rounded-3xl" />
          <div className="h-20 w-full bg-muted/30 rounded-3xl" />
          <div className="h-20 w-full bg-muted/30 rounded-3xl" />
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;
