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
      className={`${scrollable ? 'fixed inset-0 overflow-hidden' : 'min-h-screen overflow-x-hidden'} w-full bg-[#F8FAFC] dark:bg-gray-950`}
    >
      <div className={`${scrollable ? 'flex h-full min-h-0 flex-col' : ''} container mx-auto max-w-full px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-4 sm:pb-[calc(env(safe-area-inset-bottom)+2rem)] sm:pt-[calc(env(safe-area-inset-top)+2rem)] lg:px-8`}>
        {children}
      </div>
    </div>
  );
};
