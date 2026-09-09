import { BellNavIcon } from '@/components/ui/TabIcons';
import { Badge } from '@/components/ui/badge';

type DashboardHeaderProps = {
  displayName: string;
  userPlanDisplayName: string;
  cachedAvatarUrl?: string | null;
  unreadCount?: number;
  onOpenAnnouncements: () => void;
  onOpenProfile?: () => void;
};

export function DashboardHeader({
  displayName,
  userPlanDisplayName,
  cachedAvatarUrl,
  unreadCount = 0,
  onOpenAnnouncements,
  onOpenProfile,
}: DashboardHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/20 bg-gradient-to-b from-background via-background to-background/95 pt-[env(safe-area-inset-top)] dark:from-background dark:via-background dark:to-background/95">
      <div className="flex items-center justify-between px-5 h-14">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
          <div className="min-w-0 leading-none">
            <p className="whitespace-nowrap font-['Syne'] text-[13px] font-extrabold tracking-[-0.035em]">
              <span className="text-primary">Medmacs</span><span className="text-foreground">.app</span>
            </p>
            <p className="mt-1 whitespace-nowrap text-[8px] font-bold leading-none tracking-[0.02em] text-muted-foreground">
              By HMACS Studios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="text-[10px] font-bold bg-primary/10 text-primary border-0 px-2.5">
            {userPlanDisplayName}
          </Badge>
          <button
            type="button"
            onClick={onOpenAnnouncements}
            aria-label="Open announcements"
            className="relative shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <BellNavIcon className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

