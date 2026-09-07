import { motion, useReducedMotion } from 'framer-motion';

interface SelectionBackdropProps {
  /** Brightens once the user has picked something — quiet acknowledgement. */
  active?: boolean;
  /** `teal` is the core brand; `amber` marks the SEQ flow. */
  accent?: 'teal' | 'amber';
}

/**
 * Minimal brand backdrop for the practice selection screens.
 *
 * A single faint wash at the top of the viewport — no mesh texture and no
 * floating orb, so the stacked lists read as the only content. It lifts
 * slightly when a row is selected, which is the one ambient response on the
 * page.
 *
 * Stacking: sits at `z-0`, above MCQPageLayout's opaque background but below
 * page content, so content blocks are given `relative z-10`.
 */
export const SelectionBackdrop = ({ active = false, accent = 'teal' }: SelectionBackdropProps) => {
  const reduceMotion = useReducedMotion();
  const from = accent === 'amber'
    ? 'from-amber-500/[0.07] dark:from-amber-500/[0.10]'
    : 'from-primary/[0.07] dark:from-primary/[0.10]';

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-0 h-64 bg-gradient-to-b to-transparent ${from}`}
      initial={false}
      animate={reduceMotion ? undefined : { opacity: active ? 1 : 0.75, height: active ? 320 : 256 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    />
  );
};

export default SelectionBackdrop;
