import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Lock, PlayCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getOfflineChapterSummaries,
  isChapterDownloaded,
  OfflineChapterSummary,
  subscribeOfflineChapterChanges,
} from '@/utils/offlineChapters';
import {
  getQueuedMCQAnswerCount,
  subscribeOfflineAnswerChanges,
  syncQueuedMCQAnswers,
} from '@/utils/offlineAnswerSync';
import { checkSupabaseConnectivity } from '@/integrations/supabase/client';

const OFFLINE_TOLERANCE_MS = 2000;

const ConnectionStatusModal = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const [downloadedChapters, setDownloadedChapters] = useState<OfflineChapterSummary[]>([]);
  const [routeAllowsOffline, setRouteAllowsOffline] = useState(false);
  const [queuedAnswerCount, setQueuedAnswerCount] = useState(0);
  const toleranceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncInFlight = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const syncOfflineAnswers = useCallback(async () => {
    if (syncInFlight.current || !navigator.onLine) return;

    syncInFlight.current = true;
    try {
      await syncQueuedMCQAnswers();
      setQueuedAnswerCount(await getQueuedMCQAnswerCount());
    } catch {
      // Queued answers remain persisted and will retry on the next online event.
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  const handleOnline = useCallback(() => {
    // Double check navigator.onLine to avoid false positives from browser events
    if (!navigator.onLine) return;

    if (toleranceTimer.current) {
      clearTimeout(toleranceTimer.current);
      toleranceTimer.current = null;
    }
    setIsRetrying(false);
    void syncOfflineAnswers();
    setIsOffline((prev) => {
      if (prev) {
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 2500);
      }
      return false;
    });
  }, [syncOfflineAnswers]);

  const handleOffline = useCallback(() => {
    toleranceTimer.current = setTimeout(() => {
      if (!navigator.onLine) {
        setIsOffline(true);
        setShowRestored(false);
      }
    }, OFFLINE_TOLERANCE_MS);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (toleranceTimer.current) clearTimeout(toleranceTimer.current);
    };
  }, [handleOnline, handleOffline]);

  const refreshOfflineContext = useCallback(async () => {
    const summaries = await getOfflineChapterSummaries();
    setDownloadedChapters(summaries);

    const pathname = location.pathname;
    const subjectMatch = pathname.match(/^\/mcqs\/chapter\/([^/]+)$/);
    const chapterRouteMatch = pathname.match(/^\/mcqs\/(?:settings|quiz)\/([^/]+)\/([^/]+)/);

    if (pathname === '/dashboard') {
      setRouteAllowsOffline(true);
      return;
    }

    if (pathname === '/mcqs') {
      setRouteAllowsOffline(summaries.length > 0);
      return;
    }

    if (subjectMatch) {
      setRouteAllowsOffline(summaries.some(chapter => chapter.subjectId === subjectMatch[1]));
      return;
    }

    if (chapterRouteMatch) {
      setRouteAllowsOffline(await isChapterDownloaded(chapterRouteMatch[2]));
      return;
    }

    setRouteAllowsOffline(false);
  }, [location.pathname]);

  useEffect(() => {
    refreshOfflineContext();
    return subscribeOfflineChapterChanges(refreshOfflineContext);
  }, [refreshOfflineContext]);

  useEffect(() => {
    const refreshQueuedAnswers = async () => {
      setQueuedAnswerCount(await getQueuedMCQAnswerCount());
    };

    refreshQueuedAnswers();
    if (navigator.onLine) syncOfflineAnswers();
    return subscribeOfflineAnswerChanges(refreshQueuedAnswers);
  }, [syncOfflineAnswers]);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Keep the feedback visible long enough to avoid flickering.
    const minDelay = new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      const [serverReachable] = await Promise.all([
        checkSupabaseConnectivity(),
        minDelay,
      ]);

      if (navigator.onLine && serverReachable) {
        handleOnline();
      } else {
        throw new Error('Data server is still unreachable');
      }
    } catch {
      await minDelay;
      setIsRetrying(false);
    }
  };

  const goToOfflineMcqs = () => {
    setIsOffline(false);
    navigate('/mcqs');
  };

  const goToDownloadedChapter = (chapter: OfflineChapterSummary) => {
    setIsOffline(false);
    navigate(`/mcqs/settings/${chapter.subjectId}/${chapter.id}`);
  };

  return (
    <>
      {/* Restored toast */}
      <AnimatePresence>
        {showRestored && (
          <motion.div
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl bg-primary text-primary-foreground shadow-xl flex items-center gap-2"
          >
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-bold">Connection restored</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline modal */}
      <AnimatePresence>
        {isOffline && !routeAllowsOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[199] flex flex-col items-center justify-center bg-background/95 backdrop-blur-2xl"
          >
            {/* Floating orbs for alive feel */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="orb1 w-72 h-72 top-[-5%] left-[-10%] opacity-30" />
              <div className="orb2 w-56 h-56 bottom-[10%] right-[-8%] opacity-20" />
            </div>

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 24 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="relative mx-6 max-w-sm w-full rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-7 text-center shadow-2xl"
            >
              {/* Animated icon */}
              <div className="mx-auto mb-6 w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <WifiOff className="w-10 h-10 text-destructive" />
                </motion.div>
              </div>

              <h2 className="text-xl font-black text-foreground mb-2">No Connection</h2>
              <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                You're offline. Dashboard links and non-downloaded chapters are unavailable until your connection returns.
                {queuedAnswerCount > 0 ? ` ${queuedAnswerCount} answer${queuedAnswerCount === 1 ? '' : 's'} waiting to sync.` : ''}
              </p>

              {downloadedChapters.length > 0 ? (
                <div className="mb-5 space-y-2 text-left">
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Downloaded chapters</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={goToOfflineMcqs} className="h-7 rounded-lg px-2 text-[10px] font-black uppercase">
                      MCQs
                    </Button>
                  </div>
                  <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                    {downloadedChapters.map(chapter => (
                      <button
                        key={chapter.id}
                        type="button"
                        onClick={() => goToDownloadedChapter(chapter)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-border/40 bg-background/80 p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <PlayCircle className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black text-foreground">{chapter.chapterName}</p>
                          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {chapter.subjectName} · Chapter {chapter.chapterNumber}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border/40 bg-muted/40 p-3 text-left opacity-60">
                  <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs font-bold text-muted-foreground">No chapters are downloaded on this device yet.</p>
                </div>
              )}

              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full h-12 rounded-2xl font-bold text-sm"
              >
                {isRetrying ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isRetrying ? 'Reconnecting...' : 'Try Again'}
              </Button>

              <p className="text-[10px] text-muted-foreground mt-4">
                We'll reconnect automatically when your network is back.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ConnectionStatusModal;
