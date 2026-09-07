import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { cn } from '@/lib/utils';
import { BadgeMedallion } from './BadgeMedallion';
import type { BadgeDefinition } from './badgeDefinitions';

/** Keeps the selected badge mounted while the sheet plays its closing animation. */
export const useBadgeDetail = () => {
  const [activeBadge, setActiveBadge] = useState<BadgeDefinition | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openBadge = useCallback((badge: BadgeDefinition) => {
    setActiveBadge(badge);
    setIsOpen(true);
  }, []);
  const closeBadge = useCallback(() => setIsOpen(false), []);

  return { activeBadge, isOpen, openBadge, closeBadge };
};

type BadgeGridProps = {
  badges: BadgeDefinition[];
  earnedIds: Set<string>;
  activeBadgeId?: string | null;
  onSelect: (badge: BadgeDefinition) => void;
  size?: 'sm' | 'md';
  className?: string;
};

export const BadgeGrid = ({ badges, earnedIds, activeBadgeId, onSelect, size = 'md', className }: BadgeGridProps) => (
  <div className={cn('grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6', className)}>
    {badges.map((badge, index) => {
      const earned = earnedIds.has(badge.id);
      const active = activeBadgeId === badge.id;

      return (
        <motion.button
          key={badge.id}
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          // Capped so long lists still finish their entrance quickly.
          transition={{ duration: 0.26, delay: Math.min(index, 11) * 0.025, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => onSelect(badge)}
          aria-label={`${badge.name}, ${earned ? 'unlocked' : 'locked'}. ${badge.details}`}
          className={cn(
            'flex flex-col items-center gap-2 rounded-2xl px-1 py-1.5 outline-none transition-colors',
            'focus-visible:ring-2 focus-visible:ring-primary/50',
            active ? 'bg-primary/10' : 'active:bg-muted/50',
          )}
        >
          <BadgeMedallion
            shape={badge.shape}
            tone={badge.tone}
            icon={badge.icon}
            earned={earned}
            className={cn(size === 'sm' ? 'h-14 w-14' : 'h-16 w-16', 'transition-transform duration-300', active && 'scale-105')}
          />
          <span
            className={cn(
              'line-clamp-2 text-center text-[10px] font-bold leading-tight',
              earned ? 'text-foreground' : 'text-muted-foreground/60',
            )}
          >
            {badge.name}
          </span>
        </motion.button>
      );
    })}
  </div>
);

type BadgeDetailSheetProps = {
  badge: BadgeDefinition | null;
  earned: boolean;
  open: boolean;
  onClose: () => void;
};

export const BadgeDetailSheet = ({ badge, earned, open, onClose }: BadgeDetailSheetProps) => (
  <BottomSheet
    open={open && !!badge}
    onClose={onClose}
    eyebrow={badge?.group}
    title={badge?.name || 'Badge'}
    description={badge?.details}
    media={
      badge ? (
        <BadgeMedallion
          shape={badge.shape}
          tone={badge.tone}
          icon={badge.icon}
          earned={earned}
          showLock={false}
          className="h-14 w-14"
        />
      ) : null
    }
    bodyClassName="pb-2"
  >
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3.5',
        earned ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-border/50 bg-muted/40',
      )}
    >
      <div
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-xl',
          earned ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground',
        )}
      >
        {earned ? <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} /> : <Lock className="h-4 w-4" strokeWidth={2.4} />}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            'text-xs font-black uppercase tracking-wider',
            earned ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
          )}
        >
          {earned ? 'Unlocked' : 'Locked'}
        </p>
        <p className="mt-0.5 text-[11px] font-medium leading-snug text-muted-foreground">
          {earned ? 'Earned and showing on your profile.' : 'Keep studying — this unlocks on its own.'}
        </p>
      </div>
    </div>
  </BottomSheet>
);
