import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor, registerPlugin } from '@capacitor/core';

const MetaAppEvents = registerPlugin<{
  setConsent(options: { granted: boolean }): Promise<{ granted: boolean }>;
}>('MetaAppEvents');

export const CONSENT_VERSION = '2026-07-12.1';
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
  cloudLoading: boolean;
  saveConsent: (analytics: boolean, marketing: boolean) => Promise<void>;
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
  const [analytics, setAnalytics] = useState(preferences.analytics);
  const [marketing, setMarketing] = useState(preferences.marketing);
  const [userId, setUserId] = useState<string | null>(null);
  const [profilePresent, setProfilePresent] = useState(false);

  const apply = useCallback((next: ConsentPreferences) => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    setPreferences(next); setAnalytics(next.analytics); setMarketing(next.marketing);
    publishConsent(next); loadMeasurement(next);
  }, []);

  useEffect(() => {
    publishConsent(denied(), 'default');
    const cached = readCache();
    if (cached.explicit && cached.version === CONSENT_VERSION) apply(cached);
    const show = () => setOpen(true);
    window.addEventListener('open-privacy-preferences', show);
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
      if (event === 'SIGNED_OUT') { const next = denied(); setPreferences(next); publishConsent(next); }
    });
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
    return () => { window.removeEventListener('open-privacy-preferences', show); listener.subscription.unsubscribe(); };
  }, [apply]);

  useEffect(() => {
    let active = true;
    (async () => {
      setCloudLoading(true);
      if (!userId) {
        setCloudLoading(false);
        if (!isNative() && (!preferences.explicit || preferences.version !== CONSENT_VERSION)) setOpen(true);
        return;
      }
      const { data } = await supabase.from('user_consents').select('*').eq('user_id', userId).maybeSingle();
      if (!active) return;
      if (data) {
        apply({ analytics: data.analytics_allowed, marketing: data.marketing_allowed, version: data.consent_version,
          source: data.source, consentedAt: data.consented_at, updatedAt: data.updated_at, explicit: true });
        if (!isNative() && data.consent_version !== CONSENT_VERSION) setOpen(true);
      } else {
        const cached = readCache();
        if (cached.explicit) await saveCloud(userId, cached);
        else if (!isNative()) setOpen(true);
      }
      setCloudLoading(false);
    })();
    return () => { active = false; };
  }, [userId]);

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
      if (userId && profilePresent && mobilePromptAllowed() && (!cached.explicit || cached.version !== CONSENT_VERSION)) setOpen(true);
    }, 500);
    return () => window.clearInterval(timer);
  }, [profilePresent, userId]);

  const saveConsent = useCallback(async (analyticsAllowed: boolean, marketingAllowed: boolean) => {
    const now = new Date().toISOString();
    const next: ConsentPreferences = { analytics: analyticsAllowed, marketing: marketingAllowed, version: CONSENT_VERSION,
      source: isNative() ? 'mobile' : userId ? 'web' : 'anonymous_web', consentedAt: now, updatedAt: now, explicit: true };
    if (userId) await saveCloud(userId, next);
    apply(next); setOpen(false);
  }, [apply, userId]);

  const value = useMemo(() => ({ preferences, cloudLoading, saveConsent, withdrawConsent: () => saveConsent(false, false), openPreferences: () => setOpen(true) }), [preferences, cloudLoading, saveConsent]);

  return <ConsentContext.Provider value={value}>{children}
    <Dialog open={open} onOpenChange={() => { if (preferences.explicit) setOpen(false); }}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader><div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck /></div>
          <DialogTitle>Privacy preferences</DialogTitle><DialogDescription>Choose whether optional measurement may help us understand and improve our campaigns. Advertising personalization stays disabled.</DialogDescription></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between rounded-2xl border p-4"><div><Label>Analytics</Label><p className="text-xs text-muted-foreground">Product performance and usage measurement.</p></div><Switch checked={analytics} onCheckedChange={setAnalytics} /></div>
          <div className="flex items-center justify-between rounded-2xl border p-4"><div><Label>Marketing measurement</Label><p className="text-xs text-muted-foreground">Non-personalized Google and Meta campaign attribution.</p></div><Switch checked={marketing} onCheckedChange={setMarketing} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => saveConsent(false, false)}>Reject all</Button><Button onClick={() => saveConsent(true, true)}>Accept all</Button></div>
        <Button variant="ghost" onClick={() => saveConsent(analytics, marketing)}>Save selected preferences</Button>
      </DialogContent>
    </Dialog>
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
