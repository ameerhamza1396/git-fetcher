import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OFFLINE_TOLERANCE_MS = 1500;

const ConnectionStatusModal = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const toleranceTimer = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleOnline = useCallback(() => {
    // Clear any pending offline timer
    if (toleranceTimer[0]) {
      clearTimeout(toleranceTimer[0]);
      toleranceTimer[0] = null;
    }
    if (isOffline) {
      setIsOffline(false);
      setIsRetrying(false);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 2500);
    }
  }, [isOffline, toleranceTimer]);

  const handleOffline = useCallback(() => {
    // Delay showing offline modal to avoid false positives on refresh
    const timer = setTimeout(() => {
      if (!navigator.onLine) {
        setIsOffline(true);
        setShowRestored(false);
      }
    }, OFFLINE_TOLERANCE_MS);
    toleranceTimer[0] = timer;
  }, [toleranceTimer]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await fetch(window.location.origin, { method: 'HEAD', mode: 'no-cors' });
      handleOnline();
    } catch {
      setIsRetrying(false);
    }
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
            className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 flex items-center gap-2"
          >
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-bold">Connection restored</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline modal */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[199] flex items-center justify-center bg-background/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25 }}
              className="mx-6 max-w-sm w-full rounded-3xl border border-border/40 bg-card p-8 text-center shadow-2xl"
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
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                It looks like you're offline. Please check your internet connection and try again.
              </p>

              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20"
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
