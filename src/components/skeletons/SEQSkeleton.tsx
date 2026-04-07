import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <div className="space-y-6">
      <Card className="border-2 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-24 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-5 w-28 mb-2" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
          <div>
            <Skeleton className="h-5 w-28 mb-2" />
            <div className="flex gap-3 overflow-hidden">
              <Skeleton className="h-24 w-[240px] shrink-0 rounded-lg" />
              <Skeleton className="h-24 w-[240px] shrink-0 rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Skeleton className="h-12 w-32 rounded-xl" />
        <Skeleton className="h-12 w-40 rounded-xl" />
      </div>
    </div>
  );
};