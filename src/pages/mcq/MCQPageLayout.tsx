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
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  );
};
