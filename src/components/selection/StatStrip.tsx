import { useEffect } from 'react';
import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatStripProps {
  items: Array<{ value: string | number; label: string }>;
  /** `teal` is the core brand; `amber` marks the SEQ flow. */
  accent?: 'teal' | 'amber';
  className?: string;
}

/**
 * Splits "1.2K" / "78%" into the number to animate and the text to keep.
 * Returns `null` when there is no leading number to count up.
 */
const splitValue = (value: string | number) => {
  if (typeof value === 'number') return Number.isFinite(value) ? { target: value, suffix: '', decimals: 0 } : null;

  const match = /^(-?[\d,]*\.?\d+)(.*)$/.exec(value.trim());
  if (!match) return null;

  const target = Number(match[1].replace(/,/g, ''));
  if (!Number.isFinite(target)) return null;

  return { target, suffix: match[2], decimals: match[1].includes('.') ? 1 : 0 };
};

/** Counts up to the value on mount so the numbers land rather than appear. */
const CountUp = ({ value }: { value: string | number }) => {
  const reduceMotion = useReducedMotion();
  const parsed = splitValue(value);
  const target = parsed?.target ?? null;
  const spring = useSpring(0, { stiffness: 70, damping: 18, mass: 0.7 });
  const text = useTransform(spring, (latest) => {
    if (!parsed) return '';
    const rounded = parsed.decimals ? latest.toFixed(parsed.decimals) : Math.round(latest).toLocaleString();
    return `${rounded}${parsed.suffix}`;
  });

  useEffect(() => {
    if (target == null || reduceMotion) return;
    spring.set(target);
  }, [target, reduceMotion, spring]);

  if (!parsed || reduceMotion) return <>{value}</>;
  return <motion.span>{text}</motion.span>;
};

/**
 * Four hairline-divided cells. No tiles, no icons — the only decoration is
 * the count-up on mount and an accent shift on hover.
 */
export const StatStrip = ({ items, accent = 'teal', className }: StatStripProps) => {
  const accentHover = accent === 'amber'
    ? 'group-hover:text-amber-600 dark:group-hover:text-amber-500'
    : 'group-hover:text-primary';

  return (
    <dl
      className={cn(
        'grid grid-cols-2 divide-x divide-y divide-border/50 border-y border-border/50 sm:grid-cols-4 sm:divide-y-0',
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="group flex min-w-0 flex-col items-center justify-center gap-1 px-2 py-4 transition-colors duration-200 hover:bg-foreground/[0.02]"
        >
          <dd
            className={cn(
              'max-w-full truncate text-xl font-bold tracking-tight text-foreground transition-colors duration-200',
              accentHover,
            )}
          >
            <CountUp value={item.value} />
          </dd>
          <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">{item.label}</dt>
        </div>
      ))}
    </dl>
  );
};

export default StatStrip;
