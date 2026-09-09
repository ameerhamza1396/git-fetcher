// Helper to trigger subtle haptic vibration across mobile platforms (Capacitor) and web browsers
export const triggerHaptic = async (pattern: number | number[] = 10) => {
  if (typeof window === 'undefined') return;

  try {
    const win = window as any;
    // Check if Capacitor native plugins exist at runtime
    if (win.Capacitor?.isPluginAvailable?.('Haptics') && win.Capacitor?.Plugins?.Haptics) {
      await win.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
      return;
    }
  } catch {
    // Ignore native call errors and proceed to fallback
  }

  // Fallback to Web Vibration API for browsers/webviews
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
};
