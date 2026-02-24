import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileDropdown } from '@/components/ProfileDropdown';

type Profile = {
  avatar_url: string;
  created_at: string;
  full_name: string;
  id: string;
  medical_school: string;
  updated_at: string;
  username: string;
  year_of_study: number;
  plan?: string;
};

type DashboardHeaderProps = {
  profile: Profile | null;
  user: any;
  displayName: string;
};

const DashboardHeader = ({ profile, user, displayName }: DashboardHeaderProps) => {
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">      
     <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
            alt="Medmacs Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="text-xl font-bold text-foreground">Dashboard</span>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-semibold">
            {userPlanDisplayName}
          </Badge>
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;