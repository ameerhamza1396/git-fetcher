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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent pb-[env(safe-area-inset-bottom)]" aria-label="Dashboard">
      <div
        className="mx-4 mb-2.5 overflow-hidden rounded-[1.15rem] border border-border/40 bg-card shadow-lg shadow-black/8 dark:shadow-black/30"
        style={{ borderRadius: '18px' }}
      >
        <div className="grid h-14 grid-cols-5 items-center px-1.5">
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
                <div className={`relative flex h-9 items-center justify-center gap-1.5 transition-[background-color,box-shadow,transform] duration-200 ease-out ${isActive ? 'bg-primary rounded-xl px-2.5 shadow-md shadow-primary/20' : 'w-9'}`}>
                  <div className="relative">
                    <item.icon className={`block transition-colors duration-200 ${isActive ? 'w-[17px] h-[17px] text-primary-foreground' : 'w-[18px] h-[18px] text-muted-foreground'}`} />
                    {!!item.badge && !isActive && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <span className="animate-in fade-in duration-150 whitespace-nowrap text-[10px] font-bold leading-none tracking-[-0.01em] text-primary-foreground">
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
