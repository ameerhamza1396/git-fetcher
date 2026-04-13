import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export const SEQQuizSkeleton = () => {
  return (
    <div className="space-y-6">
      <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-lg">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-3/4" />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>

      <div className="flex justify-end">
        <Skeleton className="h-14 w-40 rounded-2xl" />
      </div>
    </div>
  );
};

export const SEQResultSkeleton = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-2 shadow-lg border-orange-200 dark:border-orange-800 animate-pulse">
          <CardHeader className="pb-4">
            <div className="flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center mb-4">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              </div>
              <Skeleton className="h-6 w-48 rounded-full mb-2" />
              <Skeleton className="h-4 w-64 rounded-full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Skeleton className="h-5 w-40 mb-2 rounded-full" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-5 w-32 mb-2 rounded-full" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-5 w-36 mb-2 rounded-full" />
              <div className="flex gap-3 overflow-hidden">
                <Skeleton className="h-24 w-[240px] shrink-0 rounded-lg" />
                <Skeleton className="h-24 w-[240px] shrink-0 rounded-lg" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

