import { Badge } from '@/components/ui/badge';

type DashboardHeaderProps = {
  displayName: string;
  userPlanDisplayName: string;
  cachedAvatarUrl?: string | null;
  onOpenProfile: () => void;
};

export function DashboardHeader({
  displayName,
  userPlanDisplayName,
  cachedAvatarUrl,
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
          <button type="button" onClick={onOpenProfile} aria-label="Open profile tab" className="shrink-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden ring-1 ring-primary/20">
              {cachedAvatarUrl ? (
                <img src={cachedAvatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-foreground font-bold text-[10px]">{displayName.substring(0, 2).toUpperCase()}</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
