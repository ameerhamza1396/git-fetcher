import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // 🎯 Helper to Register Push & Update Supabase
  const initializePushNotifications = useCallback(async (userId: string) => {
    if (Capacitor.getPlatform() === 'web') return;

    try {
      // Check/Request Permissions
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        console.warn('Push permissions denied by user');
        return;
      }

      // Add Listener before registering
      await PushNotifications.removeAllListeners(); // Clean old listeners

      await PushNotifications.addListener('registration', async (token) => {
        console.log('FCM Token Generated:', token.value);

        // Update Supabase profiles table
        const { error } = await supabase
          .from('profiles')
          .update({ fcm_token: token.value })
          .eq('id', userId);

        if (error) console.error('Supabase token update error:', error);
      });

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err.error);
      });

      // Trigger FCM Registration
      await PushNotifications.register();

    } catch (error) {
      console.error('Push initialization failed:', error);
    }
  }, []);

  useEffect(() => {
    // 1. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event);
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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);

      if (currentSession?.user) {
        initializePushNotifications(currentSession.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [initializePushNotifications]);

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || userData.full_name,
            username: userData.username,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
      toast({ title: "Account created!", description: "Please check your email to confirm." });
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

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      toast({ title: "Google Sign-in Failed", description: error.message, variant: "destructive" });
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
      // Clear token from DB on logout for security (optional)
      if (user) {
        await supabase.from('profiles').update({ fcm_token: null }).eq('id', user.id);
      }
      const { error } = await supabase.auth.signOut();
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
    signIn,
    signOut,
    signInWithGoogle,
    signInWithGoogleSupabase,
  };
};