import type { KeyboardEvent, ReactNode } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SelectionRowProps {
  title: ReactNode;
  /** Small label above the title, e.g. "Chapter 3". */
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** Leading glyph — a bare emoji or icon, deliberately unboxed. */
  leading?: ReactNode;
  /** Badges rendered under the title. */
  meta?: ReactNode;
  /** Right-hand content placed before the select indicator. */
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  /** `teal` is the core brand; `amber` marks the SEQ flow. */
  accent?: 'teal' | 'amber';
  /**
   * 0–1. Draws a hairline bar along the row's bottom edge that grows in on
   * mount, so the divider itself carries the progress.
   */
  progress?: number;
  /**
   * Shared across every row in one list. Makes the selected row's accent bar
   * *slide* from the previously selected row instead of cutting.
   */
  accentLayoutId?: string;
  /**
   * Render a div with role="button" instead of a native button. Required when
   * the row embeds its own interactive controls (nesting a button inside a
   * button is invalid HTML).
   */
  asDiv?: boolean;
  onSelect?: () => void;
  onPointerEnter?: () => void;
  onTouchStart?: () => void;
  className?: string;
}

/**
 * One row in a flat, stacked selection list. Intentionally has no card
 * chrome — no border, radius, shadow or blur. Separation comes from the
 * parent's dividers; all the life comes from motion instead: a press-scale, a
 * directional hover sweep, a sliding accent bar and a spring-popped check.
 */
export const SelectionRow = ({
  title,
  eyebrow,
  subtitle,
  leading,
  meta,
  trailing,
  selected = false,
  disabled = false,
  accent = 'teal',
  progress,
  accentLayoutId,
  asDiv = false,
  onSelect,
  onPointerEnter,
  onTouchStart,
  className,
}: SelectionRowProps) => {
  const reduceMotion = useReducedMotion();
  const isAmber = accent === 'amber';
  const accentText = isAmber ? 'text-amber-600 dark:text-amber-500' : 'text-primary';
  const accentHoverText = isAmber
    ? 'group-hover:text-amber-600/90 dark:group-hover:text-amber-500/90'
    : 'group-hover:text-primary/90';
  const accentBar = isAmber ? 'bg-amber-500' : 'bg-primary';
  const accentTint = isAmber ? 'bg-amber-500/[0.06]' : 'bg-primary/[0.05]';
  const accentSweep = isAmber
    ? 'from-amber-500/[0.07] via-amber-500/[0.02]'
    : 'from-primary/[0.06] via-primary/[0.015]';
  const accentRing = isAmber ? 'focus-visible:ring-amber-500/40' : 'focus-visible:ring-primary/40';

  const interactive = !disabled;
  const clampedProgress = progress == null ? null : Math.max(0, Math.min(1, progress));

  const containerClass = cn(
    'group relative flex w-full items-center gap-3.5 py-4 pl-4 pr-3 text-left transition-colors duration-200 sm:gap-4',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
    accentRing,
    disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
    selected && accentTint,
    className,
  );

  /** Press feedback — tiny, so the dividers don't visibly breathe. */
  const pressProps = interactive && !reduceMotion ? { whileTap: { scale: 0.99 } } : {};

  const body = (
    <>
      {selected && (
        accentLayoutId && !reduceMotion ? (
          <motion.span
            aria-hidden="true"
            layoutId={accentLayoutId}
            transition={{ type: 'spring', stiffness: 480, damping: 34 }}
            className={cn('absolute inset-y-0 left-0 w-[3px]', accentBar)}
          />
        ) : (
          <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-[3px]', accentBar)} />
        )
      )}

      {/* Directional hover sweep — reads as light catching the row. */}
      {interactive && !selected && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-0 bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100',
            accentSweep,
          )}
        />
      )}

      {clampedProgress != null && clampedProgress > 0 && (
        <motion.span
          aria-hidden="true"
          className={cn('absolute bottom-0 left-0 h-[2px]', accentBar, selected ? 'opacity-80' : 'opacity-30')}
          initial={reduceMotion ? false : { width: 0 }}
          animate={{ width: `${clampedProgress * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
        />
      )}

      {leading && (
        <span className="relative flex shrink-0 items-center justify-center text-xl leading-none transition-transform duration-300 group-hover:scale-110 group-active:scale-95 sm:text-[1.4rem]">
          {leading}
        </span>
      )}

      <span className="relative min-w-0 flex-1">
        {eyebrow && (
          <span
            className={cn(
              'mb-0.5 block text-[10px] font-bold uppercase tracking-[0.18em] transition-colors',
              selected ? accentText : 'text-muted-foreground/70',
            )}
          >
            {eyebrow}
          </span>
        )}
        <span
          className={cn(
            'block line-clamp-2 text-[0.95rem] font-bold leading-snug tracking-tight transition-colors',
            selected ? accentText : cn('text-foreground', interactive && accentHoverText),
          )}
        >
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 block line-clamp-2 text-xs font-medium text-muted-foreground/70">{subtitle}</span>
        )}
        {meta && <span className="mt-1.5 flex flex-wrap items-center gap-2">{meta}</span>}
      </span>

      {trailing && <span className="relative flex shrink-0 items-center">{trailing}</span>}

      <span
        aria-hidden="true"
        className={cn(
          'relative flex h-5 w-5 shrink-0 items-center justify-center transition-colors',
          selected ? accentText : 'text-muted-foreground/35',
        )}
      >
        <AnimatePresence initial={false} mode="wait">
          {selected ? (
            <motion.span
              key="check"
              initial={reduceMotion ? false : { scale: 0.4, opacity: 0, rotate: -25 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={reduceMotion ? undefined : { scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            >
              <Check className="h-4 w-4" strokeWidth={3} />
            </motion.span>
          ) : (
            <motion.span
              key="chevron"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="transition-transform duration-300 group-hover:translate-x-1"
            >
              <ChevronRight className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </>
  );

  if (asDiv) {
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      onSelect?.();
    };

    return (
      <motion.div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-pressed={selected}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onSelect}
        onKeyDown={handleKeyDown}
        onPointerEnter={onPointerEnter}
        onTouchStart={onTouchStart}
        className={containerClass}
        {...pressProps}
      >
        {body}
      </motion.div>
    );
  }

  return (
    <motion.button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      onPointerEnter={onPointerEnter}
      onTouchStart={onTouchStart}
      className={containerClass}
      {...pressProps}
    >
      {body}
    </motion.button>
  );
};

export default SelectionRow;
