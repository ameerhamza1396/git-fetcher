import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import type { Ref, UIEventHandler } from 'react';

interface MCQPageLayoutProps {
  children: React.ReactNode;
  backTo?: string;
  backAction?: () => void;
  showHeader?: boolean;
  showBackButton?: boolean;
  backLabel?: string;
  scrollable?: boolean;
  scrollRef?: Ref<HTMLDivElement>;
  onScroll?: UIEventHandler<HTMLDivElement>;
}

export const MCQPageLayout = ({
  children,
  backTo,
  backAction,
  showHeader = true,
  showBackButton = true,
  backLabel,
  scrollable = false,
  scrollRef,
  onScroll
}: MCQPageLayoutProps) => {
  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={`${scrollable ? 'fixed inset-0 overflow-y-auto' : 'min-h-screen'} w-full bg-[#F8FAFC] dark:bg-gray-950`}
    >
      <div className="container mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8 max-w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </div>
  );
};
