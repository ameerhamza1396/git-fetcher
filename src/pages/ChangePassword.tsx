
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Seo from '@/components/Seo';


const ChangePassword = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordChecks = [
    { label: '6+ characters', valid: newPassword.length >= 6 },
    { label: 'Uppercase letter', valid: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter', valid: /[a-z]/.test(newPassword) },
    { label: 'Number', valid: /\d/.test(newPassword) },
  ];
  const matched = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const strengthCount = passwordChecks.filter(check => check.valid).length;
  const strengthLabel = strengthCount >= 4 ? 'Strong' : strengthCount >= 3 ? 'Good' : strengthCount >= 2 ? 'Fair' : 'Weak';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirm password do not match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      });

      if (verifyError) {
        toast({
          title: "Current Password Incorrect",
          description: "Please check your current password and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated.",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      navigate('/profile');
    } catch (error: any) {
      console.error('Password update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile/password`,
      });

      if (error) throw error;

      toast({
        title: "Reset Email Sent",
        description: "Please check your email for password reset instructions.",
      });
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo title="Change Password" description="Update your Medmacs account password." canonical="https://medmacs.app/profile/password" />

      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+18px)]">
        <div className="mb-6">
          <Link
            to="/profile"
            className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Account Security</p>
              <h1 className="mt-1 text-2xl font-black uppercase italic tracking-tight text-foreground">Change Password</h1>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-muted-foreground">Update your sign-in password or send a reset link to your email.</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-muted/40 p-1">
          <Button
            type="button"
            variant={!showForgotPassword ? 'default' : 'ghost'}
            onClick={() => setShowForgotPassword(false)}
            className="h-11 rounded-xl text-xs font-black"
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Update
          </Button>
          <Button
            type="button"
            variant={showForgotPassword ? 'default' : 'ghost'}
            onClick={() => setShowForgotPassword(true)}
            className="h-11 rounded-xl text-xs font-black"
          >
            <Mail className="mr-2 h-4 w-4" />
            Reset Email
          </Button>
        </div>

        <Card className="overflow-hidden rounded-3xl border-border/70 bg-card/95 shadow-xl shadow-primary/5">
          <CardHeader className="border-b border-border/60 bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg font-black text-foreground">
              <Lock className="h-5 w-5 text-primary" />
              <span>{showForgotPassword ? 'Reset Password' : 'Change Password'}</span>
            </CardTitle>
            <CardDescription className="text-sm font-medium">
              {showForgotPassword
                ? 'Enter your email to receive reset instructions'
                : 'Enter your current password and choose a new one'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-sm font-black text-foreground">Password reset link</p>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">We will send a secure reset email. Use this if you signed in with Google or forgot your current password.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="h-12 rounded-2xl border-border/70 bg-background font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl font-black">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Sending...' : 'Send Reset Email'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowForgotPassword(false)}
                    className="h-11 w-full rounded-2xl font-bold"
                  >
                    Back to Change Password
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="h-12 rounded-2xl border-border/70 bg-background pr-12 font-medium"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCurrentPassword(value => !value)}
                      className="absolute right-1 top-1 h-10 w-10 rounded-xl p-0 text-muted-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="h-12 rounded-2xl border-border/70 bg-background pr-12 font-medium"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNewPassword(value => !value)}
                      className="absolute right-1 top-1 h-10 w-10 rounded-xl p-0 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strength</span>
                      <span className="text-xs font-black text-primary">{strengthLabel}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {passwordChecks.map((check, index) => (
                        <div key={check.label} className={`h-1.5 rounded-full ${index < strengthCount ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                      ))}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {passwordChecks.map(check => (
                        <span key={check.label} className={`flex items-center gap-1 text-[10px] font-bold ${check.valid ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                          <CheckCircle2 className="h-3 w-3" />
                          {check.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="h-12 rounded-2xl border-border/70 bg-background pr-12 font-medium"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmPassword(value => !value)}
                      className="absolute right-1 top-1 h-10 w-10 rounded-xl p-0 text-muted-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {confirmPassword && (
                    <p className={`text-xs font-bold ${matched ? 'text-emerald-600 dark:text-emerald-300' : 'text-destructive'}`}>
                      {matched ? 'Passwords match.' : 'Passwords do not match yet.'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Button type="submit" disabled={loading} className="h-12 w-full rounded-2xl font-black">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Updating...' : 'Update Password'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(true)}
                    className="h-11 w-full rounded-2xl border-border/70 font-bold"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Forgot Password?
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
};

export default ChangePassword;
