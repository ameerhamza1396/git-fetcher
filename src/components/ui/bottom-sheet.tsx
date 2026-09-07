import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  /** Announced as the dialog label. Rendered unless `hideHeader` is set. */
  title?: string;
  description?: string;
  /** Small all-caps line above the title, e.g. a status word. */
  eyebrow?: string;
  /** Leading visual beside the title, e.g. an icon tile or a badge medallion. */
  media?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  showClose?: boolean;
  /** Keep the title for screen readers only and render your own heading in `children`. */
  hideHeader?: boolean;
};

// Snappy enough to feel native on Android, soft enough to not look like a jump cut.
const SHEET_SPRING = { type: 'spring', damping: 32, stiffness: 340, mass: 0.85 } as const;
const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 550;

/**
 * App-wide bottom-to-top modal: slides up from the bottom edge, dims the app behind it,
 * dismisses on backdrop tap, Escape, or a downward swipe on the grabber.
 */
export const BottomSheet = ({
  open,
  onClose,
  title,
  description,
  eyebrow,
  media,
  footer,
  children,
  className,
  bodyClassName,
  showClose = true,
  hideHeader = false,
}: BottomSheetProps) => {
  const dragControls = useDragControls();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const generatedId = useId();
  const titleId = `bottom-sheet-title-${generatedId}`;
  const descriptionId = `bottom-sheet-description-${generatedId}`;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };

    body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));

    return () => {
      body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(focusFrame);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="bottom-sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={onClose}
          role="presentation"
          className="fixed inset-0 z-[220] flex items-end justify-center bg-foreground/25 backdrop-blur-[3px] dark:bg-background/70"
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={SHEET_SPRING}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) onClose();
            }}
            onClick={(event) => event.stopPropagation()}
            className={cn(
              'dashboard-modern-font relative w-full max-w-lg overflow-hidden outline-none',
              'rounded-t-[1.75rem] border-x border-t border-border/50 bg-background/95 backdrop-blur-2xl',
              'shadow-[0_-18px_60px_-24px_hsl(var(--primary)/0.45)]',
              'pb-[calc(1.25rem+env(safe-area-inset-bottom))]',
              className,
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/[0.07] to-transparent" />

            <div
              onPointerDown={(event) => dragControls.start(event)}
              className="relative flex touch-none cursor-grab justify-center pb-1.5 pt-3 active:cursor-grabbing"
            >
              <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>

            {!hideHeader && (title || media) && (
              <div className="relative flex items-start gap-3.5 px-5 pb-4 pt-1.5">
                {media}
                <div className="min-w-0 flex-1">
                  {eyebrow && (
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary/80">{eyebrow}</p>
                  )}
                  {title && (
                    <h2 id={titleId} className="mt-0.5 text-lg font-black leading-tight tracking-tight text-foreground">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id={descriptionId} className="mt-1.5 text-xs font-medium leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-1.5 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {hideHeader && title && (
              <span id={titleId} className="sr-only">
                {title}
              </span>
            )}

            {children && (
              <div
                className={cn(
                  'no-scrollbar relative max-h-[68dvh] overflow-y-auto overscroll-contain px-5',
                  !hideHeader && !title && !media && 'pt-1',
                  bodyClassName,
                )}
              >
                {children}
              </div>
            )}

            {footer && <div className="relative mt-4 border-t border-border/40 px-5 pt-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default BottomSheet;
