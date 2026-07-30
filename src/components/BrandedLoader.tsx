import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import LoaderTimeoutMessage from '@/components/LoaderTimeoutMessage';

type BrandedLoaderProps = {
  label?: string;
  variant?: 'dark' | 'light' | 'auto';
  timeoutMs?: number;
  fullscreen?: boolean;
  showBackdrop?: boolean;
};

const BrandedLoader = ({
  label = 'Loading',
  variant = 'auto',
  timeoutMs = 15000,
  fullscreen = true,
  showBackdrop = true,
}: BrandedLoaderProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = variant === 'dark' || (variant === 'auto' && resolvedTheme === 'dark');

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={[
        fullscreen ? 'fixed inset-0 z-[999]' : 'relative min-h-[16rem] w-full',
        'flex flex-col items-center justify-center overflow-hidden',
        isDark
          ? 'bg-black text-white'
          : 'bg-white text-black dark:bg-black dark:text-white',
      ].join(' ')}
    >
      {showBackdrop && (
        <div className="pointer-events-none absolute inset-0">
          <div className={isDark ? 'absolute inset-x-0 top-0 h-px bg-white/10' : 'absolute inset-x-0 top-0 h-px bg-black/10 dark:bg-white/10'} />
          <div className={isDark ? 'absolute inset-x-0 bottom-0 h-px bg-white/10' : 'absolute inset-x-0 bottom-0 h-px bg-black/10 dark:bg-white/10'} />
        </div>
      )}

      <div className="relative z-10 flex max-w-sm flex-col items-center px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center">
          <motion.img
            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
            alt="Medmacs"
            className="h-16 w-16 object-contain"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="mt-3 text-base font-black tracking-normal">
          <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 bg-clip-text text-transparent">
            Medmacs
          </span>
          <span className={isDark ? 'text-white' : 'text-black dark:text-white'}>.App</span>
        </p>
        <div className={`mt-4 h-[3px] w-48 overflow-hidden rounded-full ${
          isDark ? 'bg-white/12' : 'bg-black/10 dark:bg-white/12'
        }`}>
          <motion.div
            className={isDark ? 'h-full rounded-full bg-white' : 'h-full rounded-full bg-black dark:bg-white'}
            animate={{ x: ['-100%', '220%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '38%' }}
          />
        </div>
        <p className={`mt-4 text-xs font-medium ${
          isDark ? 'text-white/70' : 'text-black/65 dark:text-white/70'
        }`}>
          {label}
        </p>
        <LoaderTimeoutMessage timeoutMs={timeoutMs} variant={isDark ? 'dark' : 'light'} />
      </div>
    </motion.div>
  );
};

export default BrandedLoader;
