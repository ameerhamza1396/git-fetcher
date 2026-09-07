import type { Variants } from 'framer-motion';

/**
 * Entrance animation for rows in the stacked selection lists (MCQ + SEQ).
 *
 * A short opacity fade with a small upward slide — enough that the list
 * assembles rather than blinks, small enough that it can't fight the row's own
 * hover/press transitions. The stagger is tiny and capped at 10 rows so big
 * chapter lists don't cascade.
 *
 * Pair each row with `custom={index}` and gate it behind `useReducedMotion`
 * (pass `variants={undefined}` + `initial/animate={false}`).
 */
export const rowEntrance: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1], delay: Math.min(i, 10) * 0.03 },
  }),
};

/** Header/eyebrow reveal, matched to `rowEntrance` so the page feels of a piece. */
export const headerEntrance: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Title text slide-in with a slight overshoot for a lively entrance. */
export const titleSlide: Variants = {
  hidden: { opacity: 0, x: -16, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 },
  },
};

/** Bouncy icon entrance — the emoji or icon pops in with a spring. */
export const iconBounce: Variants = {
  hidden: { opacity: 0, scale: 0.3, rotate: -12 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 18,
      delay: Math.min(i, 10) * 0.04 + 0.15,
    },
  }),
};

/** Subtle glow pulse for selected items — a soft breathing ring of light. */
export const glowPulse = {
  initial: { boxShadow: '0 0 0 0 rgba(0,0,0,0)' },
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(0,0,0,0)',
      '0 0 12px 2px var(--glow-color, rgba(16,185,129,0.15))',
      '0 0 0 0 rgba(0,0,0,0)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

/** Floating decorative element — gentle vertical bob with horizontal sway. */
export const floatDecor = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1], delay },
  },
});

/** Tab indicator slide with spring physics for snappy feel. */
export const tabIndicator: Variants = {
  initial: { scaleX: 0, opacity: 0 },
  animate: {
    scaleX: 1,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 28 },
  },
};

/** Progress ring glow — subtle brightness boost when chapter is complete. */
export const ringGlow = {
  initial: { filter: 'drop-shadow(0 0 0px transparent)' },
  animate: {
    filter: 'drop-shadow(0 0 6px var(--ring-glow, rgba(16,185,129,0.4)))',
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};
