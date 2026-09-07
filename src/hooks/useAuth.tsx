import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { markCurrentDeviceSignedOut } from '@/utils/deviceSessions';

const MEDMACS_NOTIFICATION_CHANNEL_ID = 'medmacs_updates';
const PRODUCTION_ORIGIN = 'https://medmacs.app';
const DASHBOARD_REDIRECT_URL = `${PRODUCTION_ORIGIN}/dashboard`;

// Module-level guard: ensures push registration only happens once per user
// session, regardless of how many useAuth() consumers are mounted.
// Without this, every component calling useAuth() creates its own
// onAuthStateChange subscription, and each independently calls
// initializePushNotifications — spawning hundreds of native threads via
// CapacitorHttp and crashing Android with an OutOfMemoryError.
let pushRegistrationUserId: string | null = null;

const getAuthRedirectUrl = (path = '/dashboard') => {
  const origin = window.location.origin;
  const isLocalWeb = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1');
  const isMedmacsWeb = origin === PRODUCTION_ORIGIN || origin.endsWith('.medmacs.app');
  const safeOrigin = isLocalWeb || isMedmacsWeb ? origin : PRODUCTION_ORIGIN;
  return `${safeOrigin}${path}`;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 🎯 Helper to Register Push & Update Supabase
  const initializePushNotifications = useCallback(async (userId: string) => {
    if (Capacitor.getPlatform() === 'web') return;
    if (pushRegistrationUserId === userId) return;
    pushRegistrationUserId = userId;

    try {
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: MEDMACS_NOTIFICATION_CHANNEL_ID,
          name: 'Medmacs Updates',
          description: 'Study reminders, announcements, and important Medmacs updates',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#14B8A6',
        });
      }

      // Check/Request Permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        return;
      }

      // Add Listener before registering
      await PushNotifications.removeAllListeners(); // Clean old listeners

      await PushNotifications.addListener('registration', async (token) => {
        // Update Supabase profiles table
        const { error } = await supabase
          .from('profiles')
          .update({ fcm_token: token.value })
          .eq('id', userId);

        if (error && import.meta.env.DEV) console.error('Supabase token update error:', error);
      });

      await PushNotifications.addListener('registrationError', (err) => {
        if (import.meta.env.DEV) console.error('Push registration error:', err.error);
      });

      // Trigger FCM Registration
      await PushNotifications.register();

    } catch (error) {
      if (import.meta.env.DEV) console.error('Push initialization failed:', error);
    }
  }, []);

  useEffect(() => {
    const authTimeoutId = window.setTimeout(() => {
      if (import.meta.env.DEV) console.warn('Authentication session restoration timed out.');
      setLoading(false);
    }, 10000);

    // 1. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        window.clearTimeout(authTimeoutId);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);

        // If user logs in, trigger push registration
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && currentSession?.user) {
          initializePushNotifications(currentSession.user.id);
        }
      }
    );

    // 2. Check for existing session on mount
    // Push registration is handled by onAuthStateChange above (INITIAL_SESSION),
    // so we don't call initializePushNotifications here — that would duplicate
    // the native thread storm when many useAuth() consumers are mounted.
    supabase.auth.getSession()
      .then(({ data: { session: currentSession } }) => {
        window.clearTimeout(authTimeoutId);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      })
      .catch(error => {
        window.clearTimeout(authTimeoutId);
        if (import.meta.env.DEV) console.error('Unable to restore authentication session:', error);
        setLoading(false);
      });

    return () => {
      window.clearTimeout(authTimeoutId);
      subscription.unsubscribe();
    };
  }, [initializePushNotifications]);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const meta: Record<string, any> = {
        full_name: userData.fullName || userData.full_name,
        username: userData.username,
      };
      if (userData.referralCode) {
        meta.referral_code = userData.referralCode;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: meta,
          emailRedirectTo: getAuthRedirectUrl('/dashboard')
        }
      });
      if (error) throw error;
      toast({ title: "Verification code sent!", description: "Enter the code from your email to finish signup." });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
  };

  const verifySignupOtp = async (email: string, token: string) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Verification failed", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
  };

  const resendSignupOtp = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
      toast({ title: "Code resent", description: "A new verification code has been sent." });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Resend failed", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: DASHBOARD_REDIRECT_URL },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Google Sign-in Failed", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
  };

  const signInWithFacebook = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: DASHBOARD_REDIRECT_URL },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Facebook Sign-in Failed", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
  };

  const signInWithGoogleSupabase = async (idToken: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Native Sign-in Failed", description: error.message, variant: "destructive" });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      if (user) {
        await markCurrentDeviceSignedOut(user.id);
      }
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      window.location.href = '/';
    } catch (error: any) {
      toast({ title: "Sign out failed", description: error.message, variant: "destructive" });
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    verifySignupOtp,
    resendSignupOtp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithFacebook,
    signInWithGoogleSupabase,
  };
};
