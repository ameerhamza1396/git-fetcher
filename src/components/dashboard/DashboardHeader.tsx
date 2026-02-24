import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, Flame } from 'lucide-react';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';

// Define the profile type to include the optional plan property
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
  const { theme, setTheme } = useTheme();

  // Define plan color schemes
  const planColors: Record<string, { light: string; dark: string }> = {
    'free': {
      light: 'bg-purple-100 text-purple-800 border-purple-300',
      dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
    },
    'premium': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
    },
    'iconic': {
      light: 'bg-green-100 text-green-800 border-green-300',
      dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
    },
    'default': {
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
  const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

  return (
    /**
     * Updated header: 
     * 1. Added 'pt-[var(--sat)]' to provide top padding equal to the status bar height.
     * 2. This ensures the background color/blur extends under the status bar.
     */
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">      
     <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
            alt="Medmacs Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</span>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Badge
            variant="secondary"
            className={`${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
          >
            {userPlanDisplayName}
          </Badge>
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;