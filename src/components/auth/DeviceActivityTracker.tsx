import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { heartbeatCurrentDevice, registerCurrentDevice } from '@/utils/deviceSessions';

const DeviceActivityTracker = () => {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    void registerCurrentDevice(session);

    const updateActivity = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void heartbeatCurrentDevice(session);
      }
    };
    const interval = window.setInterval(updateActivity, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', updateActivity);
    window.addEventListener('focus', updateActivity);
    window.addEventListener('online', updateActivity);
    window.addEventListener('pageshow', updateActivity);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', updateActivity);
      window.removeEventListener('focus', updateActivity);
      window.removeEventListener('online', updateActivity);
      window.removeEventListener('pageshow', updateActivity);
    };
  }, [session]);

  return null;
};

export default DeviceActivityTracker;
