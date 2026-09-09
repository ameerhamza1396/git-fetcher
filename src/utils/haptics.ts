import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Helper to trigger subtle haptic vibration across mobile platforms (Capacitor) and web browsers
export const triggerHaptic = async (pattern: number | number[] = 10) => {
  try {
    // Attempt Capacitor native haptics on mobile (Android/iOS)
    await Haptics.impact({ style: ImpactStyle.Light });
    return;
  } catch {
    // Fallback to web navigator.vibrate if running in browser or Capacitor Haptics fails
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration errors
      }
    }
  }
};
