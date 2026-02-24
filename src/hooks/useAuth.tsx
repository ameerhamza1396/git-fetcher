import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [toast]); // Added toast to dependency array, although it's stable.

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('Starting signup with:', { email, userData });

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userData.fullName || userData.full_name,
            username: userData.username,
          },
          emailRedirectTo: `${window.location.origin}/dashboard` // Ensure this is correct
        }
      });

      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      console.log('Signup successful:', data);

      toast({
        title: "Account created!",
        description: "Welcome to Medmacs! Please check your email to confirm your account.", // Adjusted message for email verification flow
      });

      // Supabase sends a verification email. The user is not truly signed in until they verify.
      // You might want to handle data.user being null here if email verification is required.
      return { data, error: null };
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({
        title: "Signup failed",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error('Signin error:', error);
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  // --- NEW: signInWithGoogle function ---
  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // This redirectTo URL MUST be one of your "Authorized JavaScript origins"
          // in Google Cloud Console and also implicitly handled by Supabase's callback URL.
          // It's the URL your user will land on *after* completing Google's authentication.
          redirectTo: `${window.location.origin}/dashboard`, // Example: redirects to your dashboard after Google auth
        },
      });

      if (error) {
        console.error('Google Sign-in error:', error);
        throw error;
      }

      // No explicit navigation here for OAuth, as Supabase handles the redirect automatically
      // through the browser's native flow.
      return { data, error: null };
    } catch (error: any) {
      console.error('Google Sign-in process failed:', error);
      toast({
        title: "Google Sign-in Failed",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };
  // --- END NEW FUNCTION ---

  // --- NEW: signInWithGoogleSupabase for Native/Capacitor Flow ---
  const signInWithGoogleSupabase = async (idToken: string) => {
    try {
      console.log('Exchanging native ID token for Supabase session...');
      // The core requirement: exchange the Google ID token for a Supabase session
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.error('ID Token Sign-in error:', error);
        throw error;
      }

      console.log('ID Token Sign-in successful:', data);
      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "Native Sign-in Failed",
        description: error.message || "Could not exchange Google token for Supabase session.",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };
  // --- END NEW FUNCTION ---

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });

      // Redirect to home page after successful logout
      // Using window.location.href ensures a full page reload, clearing any previous state
      window.location.href = '/';
    } catch (error: any) {
      console.error('Signout error:', error);
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
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
