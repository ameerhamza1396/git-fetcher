import type { LucideIcon } from 'lucide-react';
import type { DashboardTabId } from '../types';

export type DashboardNavigationItem = {
  id: DashboardTabId;
  label: string;
  icon: LucideIcon;
  badge?: number | null;
};

type DashboardBottomNavigationProps = {
  activeTab: DashboardTabId;
  items: DashboardNavigationItem[];
  onTabChange: (tab: DashboardTabId) => void;
};

export function DashboardBottomNavigation({ activeTab, items, onTabChange }: DashboardBottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]" aria-label="Dashboard">
      <div className="mx-5 mb-2.5 overflow-hidden rounded-full border border-black/10 bg-white/70 backdrop-blur-2xl shadow-2xl shadow-black/10 dark:border-white/5 dark:bg-white/5 dark:shadow-black/30">
        <div className="grid h-[56px] grid-cols-5 items-center px-1">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className="relative flex h-full min-w-0 items-center justify-center focus:outline-none focus-visible:outline-none"
              >
                <div className="relative flex items-center justify-center transition-all duration-200 ease-out">
                  <div className="relative">
                    <item.icon className={`block transition-colors duration-200 ${isActive ? 'w-6 h-6 text-primary' : 'w-[22px] h-[22px] text-foreground/60 dark:text-muted-foreground/70'}`} strokeWidth={isActive ? 2.2 : 1.8} />
                    {!!item.badge && !isActive && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className="animate-in fade-in duration-150 ml-1.5 whitespace-nowrap text-[10px] font-bold leading-none tracking-[-0.01em] text-primary">
                      {item.label}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
