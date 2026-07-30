import { Link } from 'react-router-dom';
import type { DashboardAction } from '../types';

type DashboardActionCardProps = {
  action: DashboardAction;
  isExternal?: boolean;
  fixedHeight?: boolean;
  offlineMode?: boolean;
};

export function DashboardActionCard({
  action,
  isExternal = false,
  fixedHeight = false,
  offlineMode = false,
}: DashboardActionCardProps) {
  const isDisabled = action.disabled || (offlineMode && action.link !== '/mcqs');
  const cardClassName = [
    'dashboard-action-card relative overflow-hidden rounded-2xl p-4',
    'bg-gradient-to-br bg-clip-padding',
    action.gradient,
    'shadow-lg shadow-black/5 dark:shadow-black/20',
    'active:scale-[0.97] transition-transform duration-150',
    'flex min-h-[112px] w-full flex-col justify-start',
    isDisabled ? 'grayscale opacity-45' : '',
    fixedHeight ? 'h-[120px]' : '',
  ].filter(Boolean).join(' ');

  const content = (
    <div className={cardClassName}>
      <div className="pointer-events-none absolute -right-3 -bottom-3 opacity-15">
        <action.icon className={`w-20 h-20 ${action.iconColor}`} />
      </div>
      <div className="relative z-10">
        {offlineMode && action.link !== '/mcqs' && (
          <span className="mb-1 inline-block rounded-full bg-black/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/70">
            Offline
          </span>
        )}
        {action.tag && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${action.tagColor || 'bg-white/20 text-white'}`}>
            {action.tag}
          </span>
        )}
        <h3 className="text-[15px] font-bold text-white leading-tight">{action.title}</h3>
        <p className="text-white/60 text-[11px] mt-0.5 font-medium">{action.description}</p>
      </div>
    </div>
  );

  if (isExternal) {
    return (
      <a
        href={isDisabled ? undefined : action.link}
        target="_blank"
        rel="noopener noreferrer"
        className={`dashboard-action-link ${isDisabled ? 'pointer-events-none' : ''}`}
      >
        {content}
      </a>
    );
  }

  if (action.onClick) {
    return (
      <button
        type="button"
        onClick={isDisabled ? undefined : action.onClick}
        disabled={isDisabled}
        className="dashboard-action-link text-left disabled:cursor-not-allowed"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      to={isDisabled ? '#' : action.link || '#'}
      className={`dashboard-action-link ${isDisabled ? 'pointer-events-none' : ''}`}
    >
      {content}
    </Link>
  );
}
