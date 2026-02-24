import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

import Seo from '@/components/Seo'; // Import the Seo component

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    // Basic email validation
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setValidationError('Please enter a valid email address.');
    } else {
      setValidationError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setValidationError('Email address is required.');
      return;
    }

    if (validationError) {
      toast({
        title: "Validation Error",
        description: "Please fix the email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setEmailSent(false); // Reset emailSent state before new attempt

    try {
      // Supabase's password reset function
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // This should be the URL where user can update password after clicking link
      });

      if (error) {
        throw error;
      }

      setEmailSent(true);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox (and spam folder) for instructions to reset your password.",
        duration: 7000,
      });

    } catch (error) {
      console.error("Error sending password reset email:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <Seo
        title="Forgot Password"
        description="Reset your password for Medmacs App. Enter your email to receive instructions on how to regain access to your account."
        canonical="https://medmacs.app/forgot-password"
      />

            
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Forgot Password?</h1>
          <p className="text-gray-600 dark:text-gray-300">Enter your email to receive a password reset link.</p>
        </div>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle>Reset Your Password</CardTitle>
            <CardDescription>
              {emailSent ? (
                <p className="text-green-600 dark:text-green-400">
                  If an account exists with that email, a password reset link has been sent to your inbox.
                </p>
              ) : (
                <p>Don't worry, it happens! Just enter your email below.</p>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="your@example.com"
                  className={validationError ? "border-red-500" : ""}
                  required
                />
                {validationError && (
                  <p className="text-red-500 text-sm">{validationError}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={loading || !!validationError || !email}
              >
                {loading ? 'Sending Link...' : 'Send Reset Link'}
              </Button>
            </form>

            <div className="text-center mt-4">
              <p className="text-gray-600 dark:text-gray-300">
                Remember your password?{' '}
                <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
};

export default ForgotPassword;
