// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, CheckCircle, XCircle,
  Mail, Loader2, User,
} from "lucide-react";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";
import GoogleSignin from "@/components/GoogleSignin";

const EmailVerificationModal = ({ email, isOpen, onClose, onResend, resendLoading, resendDelay }) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(resendDelay);

  useEffect(() => {
    let timer;
    if (isOpen) {
      setCountdown(resendDelay);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
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
            className="p-3 bg-primary/10 rounded-full mb-4"
          >
            <Mail className="w-8 h-8 text-primary" />
          </motion.div>

          <DialogTitle className="text-2xl">Verification Email Sent! 🚀</DialogTitle>

          <DialogDescription className="text-muted-foreground mt-2">
            We've sent a verification link to {email}. Please check your inbox and spam folder.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-3 mt-4">
          <Button
            onClick={() => { onClose(); navigate("/login"); }}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Go to Login Page
          </Button>

          <Button
            variant="outline"
            onClick={onResend}
            disabled={resendLoading || countdown > 0}
            className="w-full"
          >
            {resendLoading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : countdown > 0
                ? `Resend Email in ${countdown}s`
                : "Resend Verification Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InputField = ({
  id,
  label,
  type = "text",
  placeholder,
  error,
  showToggle = false,
  showState,
  onToggle,
  icon: Icon,
  value,
  onChange,
  getInputIcon
}) => (
  <div className="space-y-1.5">
    <Label
      htmlFor={id}
      className="text-white/80 text-xs font-semibold uppercase tracking-wider"
    >
      {label}
    </Label>

    <div className="relative">
      {Icon && <Icon className="absolute left-3.5 top-3.5 h-4 w-4 text-white/30" />}

      <Input
        id={id}
        name={id}
        type={showToggle ? (showState ? "text" : "password") : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        autoComplete={
          id === "password" || id === "confirmPassword"
            ? "off"
            : id === "email"
              ? "email"
              : id === "fullName"
                ? "name"
                : "off"
        }
        className={`${Icon ? "pl-10" : "pl-3.5"} ${showToggle ? "pr-10" : ""}
        bg-white/[0.08] border-white/10 text-white placeholder:text-white/25
        focus:border-[hsl(168,80%,50%)]/50 focus:ring-[hsl(168,80%,50%)]/20
        h-12 rounded-xl ${error ? "border-red-400/50" : ""}`}
      />

      {showToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-3.5 text-white/30 hover:text-white/60 transition-colors"
        >
          {showState ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}

      {!showToggle && (
        <div className="absolute right-3.5 top-1/2 transform -translate-y-1/2">
          {getInputIcon(id, !!error, !!value)}
        </div>
      )}
    </div>

    {error && <p className="text-red-300/80 text-[11px]">{error}</p>}
  </div>
);

const Signup = () => {
  const { signUp, user, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [mounted, setMounted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const RESEND_DELAY_SECONDS = 60;

  useEffect(() => {
    setMounted(true);
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const validateForm = useCallback((data) => {
    const errors = {};

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
      errors.email = "Invalid email";

    if (data.fullName && data.fullName.length < 2)
      errors.fullName = "Too short";

    if (data.password) {
      if (data.password.length < 8)
        errors.password = "Min 8 characters";
      else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password))
        errors.password = "Need upper, lower & number";
    }

    if (data.confirmPassword && data.password !== data.confirmPassword)
      errors.confirmPassword = "Passwords don't match";

    return errors;
  }, []);

  useEffect(() => {
    setValidationErrors(validateForm(formData));
  }, [formData, validateForm]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleResendVerification = useCallback(async () => {
    setResendLoading(true);
    try {
      const { error } = await resendVerificationEmail(formData.email);
      if (error) throw error;

      toast({
        title: "Resent!",
        description: "Verification email has been successfully re-sent.",
        duration: 5000
      });

    } catch (error) {

      toast({
        title: "Resend Failed",
        description: error.message || "Could not resend.",
        variant: "destructive"
      });

    } finally {
      setResendLoading(false);
    }
  }, [formData.email, resendVerificationEmail, toast]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.email || !formData.fullName || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Missing Info",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        { fullName: formData.fullName }
      );

      if (!error && data) {
        setIsModalOpen(true);
      } else if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Signup Failed",
            description: "This email is already registered.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      }

    } catch (error) {

      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });

    } finally {
      setLoading(false);
    }
  }, [formData, validationErrors, signUp, toast]);

  const getInputIcon = useCallback((fieldName, hasError, hasValue) => {
    if (hasValue && !hasError)
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;

    if (hasError)
      return <XCircle className="w-4 h-4 text-red-400" />;

    return null;
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex flex-col relative overflow-hidden bg-gradient-to-br from-[hsl(168,80%,20%)] via-[hsl(190,60%,14%)] to-[hsl(220,60%,12%)]">

      <Seo
        title="Sign Up"
        description="Create a free account on Medmacs App."
        canonical="https://medmacs.app/signup"
      />

      <EmailVerificationModal
        email={formData.email}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onResend={handleResendVerification}
        resendLoading={resendLoading}
        resendDelay={RESEND_DELAY_SECONDS}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 right-0 w-96 h-96 bg-[hsl(168,80%,40%)]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -left-32 w-80 h-80 bg-[hsl(280,60%,50%)]/12 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute -bottom-32 right-1/4 w-72 h-72 bg-[hsl(200,80%,50%)]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.8s" }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)`
        }} />
      </div>

      <div className="pt-[env(safe-area-inset-top)]" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex items-center justify-between px-5 py-4"
      >
        <Link to="/" className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="text-sm font-medium">Back</span>
        </Link>

        <div className="flex items-center space-x-2">
          <img
            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
            alt="Logo"
            className="w-7 h-7"
          />
          <span className="text-white font-bold text-lg tracking-tight">
            Medmacs
          </span>
        </div>
      </motion.div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-[env(safe-area-inset-bottom)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >

          <div className="text-center mb-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 mb-3 border border-white/10"
            >
              <span className="text-[hsl(168,80%,60%)] text-xs font-semibold uppercase tracking-widest">
                Get Started
              </span>
            </motion.div>

            <h1 className="text-white text-3xl font-black tracking-tight">
              Create your account
            </h1>

            <p className="text-white/50 text-sm mt-2">
              Join the best medical learning platform
            </p>
          </div>

          <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <InputField
                  id="email"
                  label="Email"
                  type="email"
                  placeholder="your@email.com"
                  error={validationErrors.email}
                  icon={Mail}
                  value={formData.email}
                  onChange={handleInputChange}
                  getInputIcon={getInputIcon}
                />

                <InputField
                  id="fullName"
                  label="Full Name"
                  placeholder="Your name"
                  error={validationErrors.fullName}
                  icon={User}
                  value={formData.fullName}
                  onChange={handleInputChange}
                  getInputIcon={getInputIcon}
                />

                <InputField
                  id="password"
                  label="Password"
                  placeholder="Create password"
                  error={validationErrors.password}
                  showToggle
                  showState={showPassword}
                  onToggle={() => setShowPassword(!showPassword)}
                  value={formData.password}
                  onChange={handleInputChange}
                  getInputIcon={getInputIcon}
                />

                <InputField
                  id="confirmPassword"
                  label="Confirm"
                  placeholder="Confirm password"
                  error={validationErrors.confirmPassword}
                  showToggle
                  showState={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  getInputIcon={getInputIcon}
                />

              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[hsl(168,80%,36%)] to-[hsl(180,70%,38%)] hover:from-[hsl(168,80%,32%)] hover:to-[hsl(180,70%,34%)] text-white rounded-xl h-12 font-bold text-sm tracking-wide shadow-lg shadow-[hsl(168,80%,36%)]/20 transition-all duration-300"
                disabled={loading || Object.keys(validationErrors).length > 0}
              >
                {loading
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : "Create Account"}
              </Button>

            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>

              <div className="relative flex justify-center text-xs">
                <span className="bg-transparent px-3 text-white/30 text-[10px] uppercase tracking-widest">
                  or continue with
                </span>
              </div>
            </div>

            <GoogleSignin variant="signup" />

            <p className="text-center text-white/40 text-sm mt-5">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[hsl(168,80%,60%)] font-semibold hover:text-[hsl(168,80%,70%)] transition-colors"
              >
                Sign in
              </Link>
            </p>

          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
