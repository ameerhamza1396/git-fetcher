// Helper to trigger subtle haptic vibration across mobile platforms (Capacitor) and web browsers
export const triggerHaptic = async (pattern: number | number[] = 10) => {
  if (typeof window === 'undefined') return;

  try {
    // @ts-ignore
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (Haptics) {
      if (Array.isArray(pattern)) {
        if (NotificationType) {
          const type = pattern[0] > 30 ? NotificationType.Error : NotificationType.Success;
          await Haptics.notification({ type });
        } else if (ImpactStyle) {
          await Haptics.impact({ style: ImpactStyle.Medium || ImpactStyle.Light });
        }
      } else if (ImpactStyle) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else {
        await Haptics.selectionStart();
      }
      return;
    }
  } catch {
    // Ignore and proceed to fallback
  }

  try {
    const win = window as any;
    if (win.Capacitor?.isPluginAvailable?.('Haptics') && win.Capacitor?.Plugins?.Haptics) {
      if (Array.isArray(pattern)) {
        await win.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
      } else {
        await win.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
      }
      return;
    }
  } catch {
    // Ignore native call errors and proceed to fallback
  }

  // Fallback to Web Vibration API for browsers/webviews
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
};

export default triggerHaptic;
