import { useId, type SVGProps } from 'react';
import { Lock, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeShape = 'hexagon' | 'shield' | 'rosette' | 'orb';

export const BADGE_TONES = {
  ocean: { gradient: 'from-blue-500 to-cyan-500', from: '#3b82f6', to: '#06b6d4' },
  violet: { gradient: 'from-violet-500 to-fuchsia-500', from: '#8b5cf6', to: '#d946ef' },
  emerald: { gradient: 'from-emerald-500 to-teal-500', from: '#10b981', to: '#14b8a6' },
  fuchsia: { gradient: 'from-fuchsia-500 to-rose-500', from: '#d946ef', to: '#f43f5e' },
  ember: { gradient: 'from-orange-500 to-red-500', from: '#f97316', to: '#ef4444' },
  rose: { gradient: 'from-rose-500 to-orange-500', from: '#f43f5e', to: '#f97316' },
  cyan: { gradient: 'from-cyan-500 to-blue-500', from: '#22d3ee', to: '#3b82f6' },
  amber: { gradient: 'from-amber-500 to-orange-500', from: '#f59e0b', to: '#f97316' },
  indigo: { gradient: 'from-indigo-500 to-blue-500', from: '#6366f1', to: '#3b82f6' },
  crimson: { gradient: 'from-rose-500 to-red-500', from: '#f43f5e', to: '#dc2626' },
  purple: { gradient: 'from-purple-500 to-pink-500', from: '#a855f7', to: '#ec4899' },
  pink: { gradient: 'from-pink-500 to-rose-500', from: '#ec4899', to: '#f43f5e' },
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

const CENTER = 50;
const PLATE_RADIUS = 45;
const FACE_RADIUS = 35;
const ENGRAVING_RADIUS = 30;
// Fill + matching stroke with a round join is what softens every polygon corner.
const CORNER_ROUNDING = 4;

const round = (value: number) => Number(value.toFixed(2));

const polygonPoints = (sides: number, radius: number, rotation: number) =>
  Array.from({ length: sides }, (_, index) => {
    const angle = ((rotation + (360 / sides) * index) * Math.PI) / 180;
    return `${round(CENTER + radius * Math.cos(angle))},${round(CENTER + radius * Math.sin(angle))}`;
  }).join(' ');

const rosettePoints = (spikes: number, radius: number, innerRatio: number, rotation: number) =>
  Array.from({ length: spikes * 2 }, (_, index) => {
    const spikeRadius = index % 2 === 0 ? radius : radius * innerRatio;
    const angle = ((rotation + (180 / spikes) * index) * Math.PI) / 180;
    return `${round(CENTER + spikeRadius * Math.cos(angle))},${round(CENTER + spikeRadius * Math.sin(angle))}`;
  }).join(' ');

const shieldPath = (radius: number) => {
  const halfWidth = round(radius * 0.9);
  const top = round(CENTER - radius * 0.92);
  const shoulder = round(CENTER + radius * 0.16);
  const bottom = round(CENTER + radius);
  const left = round(CENTER - halfWidth);
  const right = round(CENTER + halfWidth);
  const flare = round(shoulder + radius * 0.46);
  const tipPull = round(bottom - radius * 0.1);
  const tipReach = round(halfWidth * 0.5);

  return [
    `M${left} ${top}`,
    `H${right}`,
    `V${shoulder}`,
    `C${right} ${flare} ${round(CENTER + tipReach)} ${tipPull} ${CENTER} ${bottom}`,
    `C${round(CENTER - tipReach)} ${tipPull} ${left} ${flare} ${left} ${shoulder}`,
    'Z',
  ].join(' ');
};

type MedallionShapeProps = SVGProps<SVGPathElement> & { shape: BadgeShape; radius: number };

const MedallionShape = ({ shape, radius, ...props }: MedallionShapeProps) => {
  if (shape === 'shield') return <path d={shieldPath(radius)} strokeLinejoin="round" {...props} />;
  if (shape === 'rosette') return <polygon points={rosettePoints(12, radius, 0.78, -90)} strokeLinejoin="round" {...(props as any)} />;
  if (shape === 'orb') return <circle cx={CENTER} cy={CENTER} r={radius} {...(props as any)} />;
  return <polygon points={polygonPoints(6, radius, -90)} strokeLinejoin="round" {...(props as any)} />;
};

// The shield's mass sits low, so its icon needs to ride a little higher than centre.
const ICON_OFFSETS: Record<BadgeShape, string> = {
  hexagon: '',
  shield: 'pb-[7%]',
  rosette: '',
  orb: '',
};

type BadgeMedallionProps = {
  shape: BadgeShape;
  tone: BadgeTone;
  icon: LucideIcon;
  earned: boolean;
  showLock?: boolean;
  className?: string;
};

export const BadgeMedallion = ({ shape, tone, icon: Icon, earned, showLock = true, className }: BadgeMedallionProps) => {
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const faceId = `badge-face-${instanceId}`;
  const sheenId = `badge-sheen-${instanceId}`;
  const glowId = `badge-glow-${instanceId}`;
  const palette = BADGE_TONES[tone] || BADGE_TONES.ocean;

  return (
    <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className={cn(
          'h-full w-full transition-[filter,opacity] duration-500',
          earned
            ? 'drop-shadow-[0_5px_12px_rgba(15,23,42,0.22)]'
            : 'grayscale opacity-40 dark:opacity-30',
        )}
      >
        <defs>
          <linearGradient id={faceId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.from} />
            <stop offset="100%" stopColor={palette.to} />
          </linearGradient>
          <linearGradient id={sheenId} x1="0.1" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {earned && (
          <MedallionShape
            shape={shape}
            radius={PLATE_RADIUS}
            fill={`url(#${faceId})`}
            filter={`url(#${glowId})`}
            opacity="0.45"
          />
        )}

        {/* Outer rim: the badge tone, deepened, so the face reads as inset metal. */}
        <MedallionShape
          shape={shape}
          radius={PLATE_RADIUS}
          fill={`url(#${faceId})`}
          stroke={`url(#${faceId})`}
          strokeWidth={CORNER_ROUNDING}
        />
        <MedallionShape
          shape={shape}
          radius={PLATE_RADIUS}
          fill="#0f172a"
          stroke="#0f172a"
          strokeWidth={CORNER_ROUNDING}
          opacity="0.3"
        />
        <MedallionShape
          shape={shape}
          radius={PLATE_RADIUS}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.3"
          strokeWidth="1.1"
        />

        {/* Inner face, its highlight, and a hairline engraving. */}
        <MedallionShape
          shape={shape}
          radius={FACE_RADIUS}
          fill={`url(#${faceId})`}
          stroke={`url(#${faceId})`}
          strokeWidth={CORNER_ROUNDING}
        />
        <MedallionShape
          shape={shape}
          radius={FACE_RADIUS}
          fill={`url(#${sheenId})`}
          stroke={`url(#${sheenId})`}
          strokeWidth={CORNER_ROUNDING}
        />
        <MedallionShape
          shape={shape}
          radius={ENGRAVING_RADIUS}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.32"
          strokeWidth="1"
        />
      </svg>

      <span className={cn('pointer-events-none absolute inset-0 flex items-center justify-center', ICON_OFFSETS[shape])}>
        <Icon
          strokeWidth={2.2}
          className={cn(
            'h-[34%] w-[34%] transition-colors duration-500',
            earned ? 'text-white drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]' : 'text-muted-foreground/70',
          )}
        />
      </span>

      {!earned && showLock && (
        <span className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[30%] w-[30%] items-center justify-center rounded-full bg-background ring-1 ring-border">
          <Lock className="h-[52%] w-[52%] text-muted-foreground/70" strokeWidth={2.6} />
        </span>
      )}
    </span>
  );
};

export const BadgeMedallionSkeleton = ({ shape, className }: { shape: BadgeShape; className?: string }) => (
  <span className={cn('relative inline-flex shrink-0 items-center justify-center', className)}>
    <svg viewBox="0 0 100 100" aria-hidden="true" className="h-full w-full animate-pulse text-muted">
      <MedallionShape
        shape={shape}
        radius={PLATE_RADIUS}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={CORNER_ROUNDING}
      />
      <MedallionShape
        shape={shape}
        radius={FACE_RADIUS}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={CORNER_ROUNDING}
        opacity="0.55"
      />
    </svg>
  </span>
);
