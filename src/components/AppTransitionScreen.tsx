import { motion } from 'framer-motion';

type AppTransitionScreenProps = {
  label?: string;
  variant?: 'dark' | 'light';
};

const AppTransitionScreen = ({
  label = 'Loading',
  variant = 'dark',
}: AppTransitionScreenProps) => {
  const isDark = variant === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className={[
        'fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden overscroll-none',
        isDark
          ? 'bg-gradient-to-br from-[#0a2e2e] via-[#0f172a] to-[#020617] text-white'
          : 'bg-background text-foreground',
      ].join(' ')}
    >
      {isDark && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-[#2dd4bf]/20 blur-3xl" />
          <div className="absolute -bottom-24 right-[-8rem] h-80 w-80 rounded-full bg-[#0ea5e9]/15 blur-3xl" />
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center">
        <motion.img
          src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
          alt="Medmacs"
          className="h-20 w-20 object-contain drop-shadow-2xl"
          animate={{ scale: [1, 1.04, 1], opacity: [0.82, 1, 0.82] }}
          transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p className={`mt-4 text-xs font-bold uppercase tracking-[0.28em] ${isDark ? 'text-cyan-100/55' : 'text-muted-foreground'}`}>
          {label}
        </p>
      </div>
    </motion.div>
  );
};

export default AppTransitionScreen;
