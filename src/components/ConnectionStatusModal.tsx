import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';

const OFFLINE_TOLERANCE_MS = 2000;

const ConnectionStatusModal = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const toleranceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOnline = useCallback(() => {
    // Double check navigator.onLine to avoid false positives from browser events
    if (!navigator.onLine) return;

    if (toleranceTimer.current) {
      clearTimeout(toleranceTimer.current);
      toleranceTimer.current = null;
    }
    setIsRetrying(false);
    setIsOffline((prev) => {
      if (prev) {
        setShowRestored(true);
        setTimeout(() => setShowRestored(false), 2500);
      }
      return false;
    });
  }, []);

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

  const handleRetry = async () => {
    setIsRetrying(true);
    
    // Add a minimum delay for the animation to feel "real" and avoid flickering
    const minDelay = new Promise(resolve => setTimeout(resolve, 800));
    
    try {
      // Use a cache-busting fetch to the origin to truly verify connectivity
      // Favicon is usually a small, safe file to check.
      const ping = fetch(`${window.location.origin}/favicon.ico?t=${Date.now()}`, { 
        method: 'HEAD', 
        mode: 'no-cors',
        cache: 'no-store'
      });
      
      await Promise.all([ping, minDelay]);
      
      // If fetch didn't throw, we likely have connectivity.
      // But let's also check navigator.onLine one last time.
      if (navigator.onLine) {
        handleOnline();
      } else {
        throw new Error('Still offline');
      }
    } catch (error) {
      console.log('Retry failed:', error);
      await minDelay;
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
            className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl bg-primary text-primary-foreground shadow-xl flex items-center gap-2"
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
              className="relative mx-6 max-w-sm w-full rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-8 text-center shadow-2xl"
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
