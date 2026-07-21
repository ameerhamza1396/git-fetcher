import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { toast } from 'sonner';

const MetaAppEvents = registerPlugin<{
  setConsent(options: { granted: boolean }): Promise<{ granted: boolean }>;
}>('MetaAppEvents');
const GoogleAnalytics = registerPlugin<{
  setConsent(options: { granted: boolean }): Promise<void>;
}>('GoogleAnalytics');

export const CONSENT_VERSION = '2026-07-16.1';
const PRODUCT = (import.meta.env.VITE_PRODUCT_ID || (location.hostname.includes('medmacs') || document.title.toLowerCase().includes('medmacs') ? 'medmacs' : 'medistics')).toLowerCase();
const CACHE_KEY = `${PRODUCT}_consent_preferences`;

export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
  version: string;
  source: 'mobile' | 'web' | 'anonymous_web';
  consentedAt: string;
  updatedAt: string;
  explicit: boolean;
};

type ConsentContextValue = {
  preferences: ConsentPreferences;
  measurementAllowed: boolean;
  cloudLoading: boolean;
  saveConsent: (allowed: boolean) => Promise<void>;
  withdrawConsent: () => Promise<void>;
  openPreferences: () => void;
};

const denied = (): ConsentPreferences => ({
  analytics: false, marketing: false, version: CONSENT_VERSION,
  source: isNative() ? 'mobile' : 'anonymous_web',
  consentedAt: '', updatedAt: '', explicit: false,
});

function isNative() {
  return Capacitor.isNativePlatform();
}
const mobilePromptAllowed = () => location.pathname === '/dashboard';

function readCache(): ConsentPreferences {
  try { return { ...denied(), ...JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') }; }
  catch { return denied(); }
}

function publishConsent(value: ConsentPreferences, mode: 'default' | 'update' = 'update') {
  const state = value.analytics ? 'granted' : 'denied';
  const marketing = value.marketing ? 'granted' : 'denied';
  (window as any).dataLayer = (window as any).dataLayer || [];
  const gtag = (...args: any[]) => (window as any).dataLayer.push(args);
  gtag('consent', mode, {
    analytics_storage: state,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: 'denied',
  });
  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    void MetaAppEvents.setConsent({ granted: value.marketing })
      .catch(error => console.warn('Unable to update Meta App Events consent', error));
    void GoogleAnalytics.setConsent({ granted: value.analytics })
      .catch(error => console.warn('Unable to update Firebase Analytics consent', error));
  }
  window.dispatchEvent(new CustomEvent('platform-consent-changed', { detail: value }));
}

function loadMeasurement(value: ConsentPreferences) {
  const analyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
  const adsId = import.meta.env.VITE_GOOGLE_ADS_ID;
  const googleId = value.analytics ? analyticsId : value.marketing ? adsId : '';
  if (googleId) {
    if (!document.querySelector('[data-platform-google-tag]')) {
      const script = document.createElement('script'); script.async = true; script.dataset.platformGoogleTag = 'true';
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`; document.head.appendChild(script);
    }
    const gtag = (...args: any[]) => ((window as any).dataLayer ||= []).push(args);
    if (value.analytics && analyticsId) gtag('config', analyticsId, { allow_google_signals: false });
    if (value.marketing && adsId) gtag('config', adsId, { allow_ad_personalization_signals: false });
  }
  if (value.marketing) {
    const params = new URLSearchParams(location.search);
    const attribution = Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'].filter(k => params.get(k)).map(k => [k, params.get(k)]));
    if (Object.keys(attribution).length) localStorage.setItem(`${PRODUCT}_campaign_attribution`, JSON.stringify({ ...attribution, captured_at: new Date().toISOString() }));
    const pixelId = import.meta.env.VITE_META_PIXEL_ID;
    if (pixelId && !(window as any).fbq) {
      const fbq: any = (...args: any[]) => fbq.callMethod ? fbq.callMethod(...args) : (fbq.queue ||= []).push(args);
      fbq.loaded = true; fbq.version = '2.0'; fbq.queue = []; (window as any).fbq = fbq;
      const script = document.createElement('script'); script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js'; document.head.appendChild(script);
      fbq('init', pixelId); fbq('track', 'PageView');
    }
  }
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<ConsentPreferences>(() => readCache());
  const [cloudLoading, setCloudLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profilePresent, setProfilePresent] = useState(false);
  const [dismissedForSession, setDismissedForSession] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const apply = useCallback((next: ConsentPreferences) => {
    const allowed = next.analytics && next.marketing;
    const unified = { ...next, analytics: allowed, marketing: allowed };
    localStorage.setItem(CACHE_KEY, JSON.stringify(unified));
    setPreferences(unified);
    publishConsent(unified); loadMeasurement(unified);
  }, []);

  useEffect(() => {
    publishConsent(denied(), 'default');
    const cached = readCache();
    if (cached.explicit && cached.version === CONSENT_VERSION) apply(cached);
    const show = () => setOpen(true);
    window.addEventListener('open-privacy-preferences', show);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
      if (event === 'SIGNED_OUT') {
        const cachedAfterSignOut = readCache();
        if (cachedAfterSignOut.explicit && cachedAfterSignOut.version === CONSENT_VERSION) apply(cachedAfterSignOut);
        else { const next = denied(); setPreferences(next); publishConsent(next); }
      }
    });
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    return () => { window.removeEventListener('open-privacy-preferences', show); listener.subscription.unsubscribe(); };
  }, [apply]);

  useEffect(() => {
    let active = true;
    (async () => {
      setCloudLoading(true);
      if (!userId) {
        const cached = readCache();
        setCloudLoading(false);
        if (!isNative() && (!cached.explicit || cached.version !== CONSENT_VERSION)) setOpen(true);
        return;
      }
      const { data, error } = await supabase.from('user_consents').select('*').eq('user_id', userId).maybeSingle();
      if (!active) return;
      const cached = readCache();
      const cachedIsCurrent = cached.explicit && cached.version === CONSENT_VERSION;

      if (error) {
        if (cachedIsCurrent) apply(cached);
        setCloudLoading(false);
        return;
      }

      const cloud = data ? {
        analytics: data.analytics_allowed,
        marketing: data.marketing_allowed,
        version: data.consent_version,
        source: data.source,
        consentedAt: data.consented_at,
        updatedAt: data.updated_at,
        explicit: true,
      } satisfies ConsentPreferences : null;
      const cloudIsCurrent = cloud?.version === CONSENT_VERSION;
      const cachedIsNewer = cachedIsCurrent && (!cloudIsCurrent || Date.parse(cached.updatedAt || '0') >= Date.parse(cloud?.updatedAt || '0'));

      if (cachedIsNewer) {
        apply(cached);
        setOpen(false);
        if (!cloudIsCurrent || cloud?.analytics !== cached.analytics || cloud?.marketing !== cached.marketing) {
          void saveCloud(userId, cached).catch(syncError => console.warn('Unable to reconcile consent preferences', syncError));
        }
      } else if (cloudIsCurrent && cloud) {
        apply(cloud);
        setOpen(false);
      } else if (cloud) {
        apply(cloud);
        if (!isNative()) setOpen(true);
      } else if (cached.explicit) {
        apply(cached);
        void saveCloud(userId, cached).catch(syncError => console.warn('Unable to sync cached consent preferences', syncError));
      } else if (!isNative()) {
        setOpen(true);
      }
      setCloudLoading(false);
    })();
    return () => { active = false; };
  }, [apply, userId]);

  useEffect(() => {
    let active = true;
    setProfilePresent(false);
    if (!userId) return () => { active = false; };

    void supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.warn('Unable to confirm profile before showing privacy preferences', error);
          return;
        }
        setProfilePresent(Boolean(data));
      });

    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!isNative()) return;
    const timer = window.setInterval(() => {
      const cached = readCache();
      if (
        userId &&
        profilePresent &&
        !dismissedForSession &&
        mobilePromptAllowed() &&
        (!cached.explicit || cached.version !== CONSENT_VERSION)
      ) {
        setOpen(true);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [dismissedForSession, profilePresent, userId]);

  const saveConsent = useCallback(async (allowed: boolean) => {
    const now = new Date().toISOString();
    const next: ConsentPreferences = { analytics: allowed, marketing: allowed, version: CONSENT_VERSION,
      source: isNative() ? 'mobile' : userId ? 'web' : 'anonymous_web', consentedAt: now, updatedAt: now, explicit: true };
    apply(next);
    setDismissedForSession(true);
    setOpen(false);

    if (!userId) {
      toast.success('Privacy preference saved on this device.');
      return;
    }

    setSyncing(true);
    toast.success('Preference received', { description: 'Syncing securely with your account…' });
    try {
      await saveCloud(userId, next);
      toast.success('Privacy preference synced.');
    } catch (error) {
      console.warn('Unable to sync consent preference', error);
      toast.error('Saved on this device', { description: 'Account sync will be retried the next time you open the app.' });
    } finally {
      setSyncing(false);
    }
  }, [apply, userId]);

  const value = useMemo(() => ({
    preferences,
    measurementAllowed: preferences.analytics && preferences.marketing,
    cloudLoading,
    saveConsent,
    withdrawConsent: () => saveConsent(false),
    openPreferences: () => setOpen(true),
  }), [preferences, cloudLoading, saveConsent]);

  return <ConsentContext.Provider value={value}>{children}
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setDismissedForSession(true);
        setOpen(nextOpen);
      }}
    >
      <SheetContent
        side="bottom"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        className="max-h-[88dvh] overflow-hidden rounded-t-[2rem] border-x border-t border-primary/20 bg-background/95 p-0 shadow-[0_-18px_60px_-24px_hsl(var(--primary)/0.45)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/20 via-background/95 to-background dark:from-primary/25 dark:via-background/95" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />
        <div className="no-scrollbar relative max-h-[88dvh] overflow-y-auto px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-primary/30" />
          <div className="mx-auto w-full max-w-lg">
            <SheetHeader className="pr-10 text-left">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                Your choice, your privacy
              </p>
              <SheetTitle className="text-2xl font-black tracking-tight text-foreground">
                Privacy preferences
              </SheetTitle>
              <SheetDescription className="text-sm font-medium leading-6 text-foreground/70">
                To help us improve Medmacs, we may share limited, non-sensitive usage information with Google and Meta for analytics and campaign measurement. This information is used in an anonymous or aggregated form and is not intended to include sensitive personal details, medical answers, or private study content.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 rounded-2xl border border-primary/15 bg-card/70 p-4 text-sm font-medium leading-6 text-foreground/80 shadow-sm backdrop-blur-xl dark:bg-card/55">
              You can agree to this optional measurement or opt out. Advertising personalization remains disabled, and you can change your choice later from Privacy Preferences.
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-12 rounded-xl border-border/80 bg-background/70 font-bold text-foreground shadow-sm hover:border-primary/30 hover:bg-primary/5"
                onClick={() => saveConsent(false)}
                disabled={syncing}
              >
                {syncing ? 'Syncing…' : 'Opt out'}
              </Button>
              <Button
                className="h-12 rounded-xl bg-primary font-black text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                onClick={() => saveConsent(true)}
                disabled={syncing}
              >
                {syncing ? 'Syncing…' : 'Agree'}
              </Button>
            </div>

            <p className="mt-4 text-center text-xs font-medium leading-5 text-foreground/60">
              Contact us for details{' '}
              <a className="font-black text-primary underline decoration-primary/40 underline-offset-4" href="mailto:hi@medmacs.app">
                hi@medmacs.app
              </a>
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </ConsentContext.Provider>;
}

async function saveCloud(userId: string, value: ConsentPreferences) {
  const { error } = await supabase.from('user_consents').upsert({ user_id: userId, analytics_allowed: value.analytics,
    marketing_allowed: value.marketing, consent_version: value.version, consented_at: value.consentedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(), source: value.source }, { onConflict: 'user_id' });
  if (error) throw error;
}

export const useConsent = () => {
  const value = useContext(ConsentContext);
  if (!value) throw new Error('useConsent must be used inside ConsentProvider');
  return value;
};
