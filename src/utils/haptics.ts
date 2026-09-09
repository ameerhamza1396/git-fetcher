// Helper to trigger subtle haptic vibration across mobile platforms (Capacitor) and web browsers
export const triggerHaptic = async (pattern: number | number[] = 10) => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
    return;
  } catch {
    // Fallback to web navigator.vibrate if Capacitor Haptics is unavailable or fails
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore vibration errors
      }
    }
  }
};
