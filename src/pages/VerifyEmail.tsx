// src/pages/VerifyEmail.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const VerifyEmail = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [email] = useState(location.state?.email || '');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleResendEmail = async () => {
    if (resendCountdown > 0 || !email) return;

    setIsResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    setIsResending(false);

    if (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resend email.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email Sent!',
        description: 'A new verification email has been sent to your inbox.',
      });
      setResendCountdown(30); // Start the 30-second countdown
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in text-center">
        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-col items-center">
            <Mail className="w-16 h-16 text-purple-600 dark:text-purple-400 mb-4" />
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300 mt-2 text-center">
              We've sent a verification link to **{email}**. Please check your inbox (and spam folder!) to confirm your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              <p>Once you've verified your email, you can proceed to log in.</p>
            </div>
            {email && (
              <Button
                onClick={handleResendEmail}
                disabled={isResending || resendCountdown > 0}
                className="w-full bg-purple-500 hover:bg-purple-600 dark:bg-purple-700 dark:hover:bg-purple-800"
              >
                {isResending ? 'Sending...' : resendCountdown > 0 ? `Resend in ${resendCountdown}s` : 'Resend Email'}
              </Button>
            )}
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                Go to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Link to="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default VerifyEmail;