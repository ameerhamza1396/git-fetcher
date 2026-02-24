import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"; // Assuming Dialog components are available
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Sun,
  Moon,
  Mail, // New icon for the modal
  Loader2, // New icon for loading state
} from "lucide-react";
import Seo from "@/components/Seo";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import GoogleSignin from "@/components/GoogleSignin";

// --- New Component for Email Verification Modal ---
const EmailVerificationModal = ({
  email,
  isOpen,
  onClose,
  onResend,
  resendLoading,
  resendDelay,
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(resendDelay);

  const { toast } = useToast(); // Add this line

  useEffect(() => {
    let timer;
    if (isOpen) {
      setCountdown(resendDelay); // Reset countdown when modal opens
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, resendDelay]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="flex flex-col items-center text-center pt-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full mb-4"
          >
            <Mail className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </motion.div>
          <DialogTitle className="text-2xl">Verification Email Sent! 🚀</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400 mt-2">
            We've sent a verification link to **{email}**. Please check your inbox and spam folder to confirm your email address.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 mt-4">
          <Button
            onClick={() => {
              onClose();
              navigate("/login");
            }}
            className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
          >
            Go to Login Page
          </Button>
          <Button
            variant="outline"
            onClick={onResend}
            disabled={resendLoading || countdown > 0}
            className="w-full"
          >
            {resendLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : countdown > 0 ? (
              `Resend Email in ${countdown}s`
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
// --- End of New Component ---


const Signup = () => {
  // NOTE: keep existing signInWithGoogle for web fallback; also expect signInWithGoogleSupabase to be available
  const { signUp, user, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [mounted, setMounted] = useState(false);

  // New states for the Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const RESEND_DELAY_SECONDS = 60; // 1 minute delay for resend

  // Redirect if already logged in
  useEffect(() => {
    setMounted(true);
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Real-time validation
  useEffect(() => {
    const errors: Record<string, string> = {};

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    if (formData.fullName && formData.fullName.length < 2) {
      errors.fullName = "Full name must be at least 2 characters";
    }
    if (formData.password) {
      if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        errors.password =
          "Password must contain uppercase, lowercase, and a number";
      }
    }
    if (
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const { error } = await resendVerificationEmail(formData.email);

      if (error) {
        throw error;
      }

      // Reset the countdown by setting isModalOpen to false and true again, or
      // more simply, rely on the modal's internal state which is reset on open.
      toast({
        title: "Resent!",
        description: "Verification email has been successfully re-sent.",
        duration: 5000,
      });

    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description:
          error.message || "Could not resend the verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResendLoading(false);
      // The modal component handles the countdown reset.
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before submitting",
        variant: "destructive",
      });
      return;
    }

    // Check for missing required fields (in case validation useEffect hasn't run fully or initial state wasn't populated)
    if (
      !formData.email ||
      !formData.fullName ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // NOTE: Passing full data as the options object for signup.
      // The implementation of `useAuth().signUp` seems to handle it this way: `signUp(email, password, { fullName })`
      const { data, error } = await signUp(formData.email, formData.password, {
        fullName: formData.fullName,
      });

      if (!error && data) {
        // --- MODIFICATION 2: Show Modal instead of Toast and redirect ---
        // Setting the modal state to open
        setIsModalOpen(true);
        // The modal content will display the success message and options
      } else if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Signup Failed",
            description:
              "This email is already registered. Try logging in or use a different email.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.message || "An unexpected error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const getInputIcon = (
    fieldName: string,
    hasError: boolean,
    hasValue: boolean
  ) => {
    // Only show success icon if there's a value AND no error.
    // Error icon takes precedence.
    if (hasValue && !hasError) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (hasError) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient">
      <Seo
        title="Sign Up"
        description="Create a free account on Medmacs App to start your MDCAT preparation journey with AI-powered quizzes, mock tests, and study materials."
        canonical="https://medmacs.app/signup"
      />

      {/* MODIFICATION 2: Email Verification Modal */}
      <EmailVerificationModal
        email={formData.email}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onResend={handleResendVerification}
        resendLoading={resendLoading}
        resendDelay={RESEND_DELAY_SECONDS}
      />

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10">
        {/* Left Section (Signup Card) */}
        <AnimatePresence mode="wait">
          <motion.div
            key="signup-card"
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -40 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex items-center justify-center"
          >
            <Card className="w-full shadow-xl border-0 bg-white/90 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-between items-center mb-4">
                  <Link
                    to="/"
                    className="inline-flex items-center text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-center space-x-3 mb-4">
                  <img
                    src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                    alt="Medmacs Logo"
                    className="w-10 h-10 object-contain"
                  />
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    Medmacs
                  </span>
                </div>
                <CardTitle className="text-2xl text-gray-900 dark:text-white">
                  Create Account
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Join the best medical learning platform
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email"
                          className={
                            validationErrors.email ? "border-red-500" : ""
                          }
                          required
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getInputIcon(
                            "email",
                            !!validationErrors.email,
                            !!formData.email
                          )}
                        </div>
                      </div>
                      {validationErrors.email && (
                        <p className="text-red-500 text-sm">
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <Input
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          className={
                            validationErrors.fullName ? "border-red-500" : ""
                          }
                          required
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {getInputIcon(
                            "fullName",
                            !!validationErrors.fullName,
                            !!formData.fullName
                          )}
                        </div>
                      </div>
                      {validationErrors.fullName && (
                        <p className="text-red-500 text-sm">
                          {validationErrors.fullName}
                        </p>
                      )}
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Create a password"
                          className={
                            validationErrors.password ? "border-red-500" : ""
                          }
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {validationErrors.password && (
                        <p className="text-red-500 text-sm">
                          {validationErrors.password}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          placeholder="Confirm your password"
                          className={
                            validationErrors.confirmPassword
                              ? "border-red-500"
                              : ""
                          }
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 transform -translate-y-1/2"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {validationErrors.confirmPassword && (
                        <p className="text-red-500 text-sm">
                          {validationErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:scale-105 transition-transform duration-200"
                    disabled={
                      loading || Object.keys(validationErrors).length > 0
                    }
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-purple-300 dark:border-purple-700" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white/80 dark:bg-gray-800/80 px-2 text-gray-500 dark:text-gray-400">
                      Or
                    </span>
                  </div>
                </div>

                {/* Google Signin Component */}
                <GoogleSignin variant="signup" />

                {/* Already have account */}
                <div className="text-center mt-4">
                  <p className="text-gray-600 dark:text-gray-300">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Right Section (Avatar/Illustration) */}
        <div className="hidden md:flex flex-col items-center justify-center relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-purple-600 to-pink-600 p-6 animate-fade-in">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15),_transparent_70%)] animate-pulse"></div>
          <img
            src="/images/drhamzaavatar.png"
            alt="Avatar"
            className="w-72 h-72 object-contain z-10"
          />
          <h2 className="text-3xl font-bold text-white mt-4 z-10">
            Start Your Journey!
          </h2>
          <p className="text-purple-100 text-center z-10">
            Create your account and begin with Medmacs
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;