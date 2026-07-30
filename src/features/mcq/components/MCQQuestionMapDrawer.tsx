import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

type MCQQuestionMapDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

export function MCQQuestionMapDrawer({
  open,
  onOpenChange,
  children,
}: MCQQuestionMapDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef({ startX: 0, latestX: 0, startedAt: 0 });
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.style.transform = '';
      contentRef.current.style.transition = '';
    }
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    gestureRef.current = {
      startX: event.clientX,
      latestX: event.clientX,
      startedAt: performance.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    gestureRef.current.latestX = event.clientX;
    const distance = Math.min(0, event.clientX - gestureRef.current.startX);
    if (contentRef.current) {
      contentRef.current.style.transform = `translate3d(${distance}px, 0, 0)`;
      contentRef.current.style.transition = 'none';
    }
  };

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const distance = gestureRef.current.latestX - gestureRef.current.startX;
    const elapsed = Math.max(performance.now() - gestureRef.current.startedAt, 1);
    const velocity = distance / elapsed;
    const shouldClose = distance < -72 || velocity < -0.55;

    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 140ms ease-out';
      contentRef.current.style.transform = shouldClose
        ? 'translate3d(-100%, 0, 0)'
        : 'translate3d(0, 0, 0)';
    }
    if (shouldClose) {
      event.preventDefault();
      event.stopPropagation();
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        onOpenChange(false);
      }, 140);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 dark:bg-black/70" />
        <DialogPrimitive.Content
          ref={contentRef}
          className="fixed inset-y-0 left-0 z-[201] flex h-full w-[310px] max-w-[88vw] touch-pan-y flex-col border-r border-slate-300/80 bg-white/[0.98] shadow-2xl outline-none backdrop-blur-3xl will-change-transform data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left data-[state=closed]:duration-200 data-[state=open]:duration-200 dark:border-white/10 dark:bg-zinc-950/[0.97] sm:w-[360px]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishGesture}
          onPointerCancel={finishGesture}
        >
          <div className="flex items-center justify-between border-b border-border/50 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
            <div>
              <DialogPrimitive.Title className="font-['Syne'] text-lg font-extrabold tracking-tight text-foreground">
                Question <span className="text-primary">Map</span>
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                Swipe left to close
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-xl border border-border/60 bg-muted/50 p-2 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Close question map</span>
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
