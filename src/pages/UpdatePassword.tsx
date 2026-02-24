import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

const UpdatePassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation(); // To get URL parameters like access_token

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isTokenValid, setIsTokenValid] = useState(false); // To check if the reset token is valid

  // Validate password and confirm password in real-time
  useEffect(() => {
    const errors = {};

    if (password) {
      if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters.';
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.';
      }
    }

    if (confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    } else if (confirmPassword && !password) {
      errors.confirmPassword = 'Please enter your new password first.';
    }
    setValidationErrors(errors);
  }, [password, confirmPassword]);

  // Check if access token is present in URL on component mount
  useEffect(() => {
    const checkToken = async () => {
      // Supabase automatically handles session from URL hash if user clicked magic link
      // We can check if a session exists after render.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsTokenValid(true);
      } else {
        // If no session, it means the token might be invalid or expired.
        // Supabase often clears invalid tokens from the URL.
        toast({
          title: "Invalid or Expired Link",
          description: "The password reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
          duration: 7000,
        });
        // Redirect to forgot password to request new link
        navigate('/forgot-password');
      }
    };
    checkToken();
  }, [navigate, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isTokenValid) {
      toast({
        title: "Error",
        description: "Cannot reset password. Invalid or expired link.",
        variant: "destructive",
      });
      return;
    }

    if (!password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in both new password fields.",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the password errors before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Supabase's updateUser function updates the password for the current user session
      const { data, error } = await supabase.auth.updateUser({ password: password });

      if (error) {
        throw error;
      }

      toast({
        title: "Password Updated!",
        description: "Your password has been successfully reset. You can now log in with your new password.",
        duration: 7000,
      });
      navigate('/login'); // Redirect to login page

    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred while updating password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInputIcon = (fieldName) => {
    if (password && !validationErrors.password) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (validationErrors.password) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Set New Password</h1>
          <p className="text-gray-600 dark:text-gray-300">Enter and confirm your new password below.</p>
        </div>

        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle>Update Your Password</CardTitle>
            <CardDescription>
              Please enter your new password. Make sure it's strong and unique.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={validationErrors.password ? "border-red-500" : ""}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                    {getInputIcon('password')}
                  </div>
                </div>
                {validationErrors.password && (
                  <p className="text-red-500 text-sm">{validationErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={validationErrors.confirmPassword ? "border-red-500" : ""}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-red-500 text-sm">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                disabled={loading || !isTokenValid || Object.keys(validationErrors).length > 0 || !password || !confirmPassword}
              >
                {loading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>

            <div className="text-center mt-4">
              <p className="text-gray-600 dark:text-gray-300">
                <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                  Go to Login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UpdatePassword;
