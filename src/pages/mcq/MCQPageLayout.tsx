import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProfileDropdown } from '@/components/ProfileDropdown';

interface MCQPageLayoutProps {
  children: React.ReactNode;
  backTo?: string;
  backAction?: () => void;
  showHeader?: boolean;
  showBackButton?: boolean;
  backLabel?: string;
}

export const MCQPageLayout = ({
  children,
  backTo,
  backAction,
  showHeader = true,
  showBackButton = true,
  backLabel
}: MCQPageLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
      {showHeader && (
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
          <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex justify-between items-center max-w-full">
            {showBackButton && (
              backAction ? (
                <button onClick={backAction} className="flex items-center space-x-1 sm:space-x-2 text-primary hover:text-primary/80 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{backLabel || 'Back'}</span>
                </button>
              ) : backTo ? (
                <Link to={backTo} className="flex items-center space-x-1 sm:space-x-2 text-primary hover:text-primary/80 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{backLabel || 'Back'}</span>
                </Link>
              ) : (
                <div />
              )
            )}

            <div className="flex items-center space-x-2 sm:space-x-3">
              <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              <span className="text-lg sm:text-xl font-bold text-foreground hidden sm:inline">Practice MCQs</span>
              <span className="text-sm font-bold text-foreground sm:hidden">MCQs</span>
            </div>

            <ProfileDropdown />
          </div>
        </header>
      )}

      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-full mt-[var(--header-height)] pt-[env(safe-area-inset-top)]">
        {children}
      </div>
    </div>
  );
};
