import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import type { DashboardAction } from '../types';

type StickyQuickActionsProps = {
  actions: DashboardAction[];
  offlineMode?: boolean;
};

export function StickyQuickActions({ actions, offlineMode = false }: StickyQuickActionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[60] flex justify-center px-4"
    >
      <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/95 px-3 py-2 shadow-2xl shadow-black/10 backdrop-blur-2xl dark:shadow-black/40">
        {actions.map((action) => {
          const Icon = action.icon;
          const isDisabled = action.disabled || (offlineMode && action.link !== '/mcqs');
          const content = (
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${action.gradient} text-white shadow-lg shadow-black/10 transition active:scale-95 ${isDisabled ? 'grayscale opacity-40' : ''}`}
              title={isDisabled ? `${action.title} unavailable in offline mode` : action.title}
            >
              <Icon className="h-5 w-5" />
              <span className="sr-only">{action.title}</span>
            </span>
          );

          if (action.onClick) {
            return (
              <button key={action.title} type="button" onClick={isDisabled ? undefined : action.onClick} disabled={isDisabled} className="rounded-full disabled:cursor-not-allowed">
                {content}
              </button>
            );
          }

          return (
            <Link key={action.title} to={isDisabled ? '#' : action.link || '#'} className={isDisabled ? 'pointer-events-none' : 'rounded-full'}>
              {content}
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
