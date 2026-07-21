import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import type { Ref, UIEventHandler } from 'react';
import { useEffect } from 'react';

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
  useEffect(() => {
    if (!scrollable) return;

    document.documentElement.classList.add('mcq-document-scroll-lock');
    document.body.classList.add('mcq-document-scroll-lock');
    return () => {
      document.documentElement.classList.remove('mcq-document-scroll-lock');
      document.body.classList.remove('mcq-document-scroll-lock');
    };
  }, [scrollable]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={`${scrollable ? 'h-[100dvh] overflow-hidden' : 'min-h-screen overflow-x-hidden'} w-full bg-[#F8FAFC] dark:bg-gray-950`}
    >
      <div className={`${scrollable ? 'flex h-full min-h-0 flex-col' : ''} container mx-auto max-w-full px-3 py-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:px-4 sm:py-8 lg:px-8`}>
        {children}
      </div>
    </div>
  );
};
