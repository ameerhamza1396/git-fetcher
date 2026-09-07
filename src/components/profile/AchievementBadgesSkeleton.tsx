import { BadgeMedallionSkeleton, type BadgeShape } from './BadgeMedallion';
import { cn } from '@/lib/utils';

// Cycled so the placeholder row has the same silhouette variety as the loaded grid.
const PLACEHOLDER_SHAPES: BadgeShape[] = ['hexagon', 'orb', 'shield', 'rosette'];

export const AchievementBadgesSkeleton = ({ count = 8, compact = false }: { count?: number; compact?: boolean }) => (
  <div className="py-2">
    <div className="mb-5 flex items-center gap-3.5 px-1">
      <BadgeMedallionSkeleton shape="rosette" className="h-14 w-14" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-28 animate-pulse rounded-full bg-muted" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
        <div className="h-2.5 w-36 animate-pulse rounded-full bg-muted/70" />
      </div>
    </div>

    <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex flex-col items-center gap-2 px-1 py-1.5">
          <BadgeMedallionSkeleton
            shape={PLACEHOLDER_SHAPES[index % PLACEHOLDER_SHAPES.length]}
            className={cn(compact ? 'h-14 w-14' : 'h-16 w-16')}
          />
          <div className="h-2.5 w-12 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  </div>
);
