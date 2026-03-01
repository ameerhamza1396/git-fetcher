// @ts-nocheck
import { useState, useEffect } from "react";
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
  ArrowLeft, Eye, EyeOff, CheckCircle, XCircle, Sun, Moon,
  Mail, Loader2, Crown,
} from "lucide-react";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
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
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="p-3 bg-primary/10 rounded-full mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </motion.div>
          <DialogTitle className="text-2xl">Verification Email Sent! 🚀</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            We've sent a verification link to **{email}**. Please check your inbox and spam folder.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 mt-4">
          <Button onClick={() => { onClose(); navigate("/login"); }} className="w-full bg-primary hover:bg-primary/90">
            Go to Login Page
          </Button>
          <Button variant="outline" onClick={onResend} disabled={resendLoading || countdown > 0} className="w-full">
            {resendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : countdown > 0 ? `Resend Email in ${countdown}s` : "Resend Verification Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Signup = () => {
  const { signUp, user, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({ email: "", fullName: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const RESEND_DELAY_SECONDS = 60;

  useEffect(() => { setMounted(true); if (user) navigate("/dashboard"); }, [user, navigate]);

  useEffect(() => {
    const errors: Record<string, string> = {};
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Please enter a valid email address";
    if (formData.fullName && formData.fullName.length < 2) errors.fullName = "Full name must be at least 2 characters";
    if (formData.password) {
      if (formData.password.length < 8) errors.password = "Password must be at least 8 characters";
      else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) errors.password = "Must contain uppercase, lowercase, and a number";
    }
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setValidationErrors(errors);
  }, [formData]);

  const handleInputChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleResendVerification = async () => {
    setResendLoading(true);
    try {
      const { error } = await resendVerificationEmail(formData.email);
      if (error) throw error;
      toast({ title: "Resent!", description: "Verification email has been successfully re-sent.", duration: 5000 });
    } catch (error) {
      toast({ title: "Resend Failed", description: error.message || "Could not resend.", variant: "destructive" });
    } finally { setResendLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0) { toast({ title: "Validation Error", description: "Please fix the errors.", variant: "destructive" }); return; }
    if (!formData.email || !formData.fullName || !formData.password || !formData.confirmPassword) { toast({ title: "Missing Info", description: "Please fill in all fields.", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const { data, error } = await signUp(formData.email, formData.password, { fullName: formData.fullName });
      if (!error && data) { setIsModalOpen(true); }
      else if (error) {
        if (error.message.includes("already registered")) toast({ title: "Signup Failed", description: "This email is already registered.", variant: "destructive" });
        else throw error;
      }
    } catch (error) { toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  if (!mounted) return null;

  const getInputIcon = (fieldName, hasError, hasValue) => {
    if (hasValue && !hasError) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (hasError) return <XCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  const InputField = ({ id, label, type = "text", placeholder, error, showToggle = false, showState, onToggle, icon: Icon }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-white/90 text-xs font-bold uppercase tracking-wider">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />}
        <Input
          id={id} name={id} type={showToggle ? (showState ? "text" : "password") : type}
          placeholder={placeholder} value={formData[id]} onChange={handleInputChange}
          className={`${Icon ? 'pl-10' : ''} ${showToggle ? 'pr-10' : ''} bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50 h-12 rounded-xl ${error ? "border-red-400/60" : ""}`}
          required
        />
        {showToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3 top-3.5 text-white/40 hover:text-white/70">
            {showState ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {!showToggle && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {getInputIcon(id, !!error, !!formData[id])}
          </div>
        )}
      </div>
      {error && <p className="text-red-300 text-xs">{error}</p>}
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950 flex items-center justify-center">
      <Seo title="Sign Up" description="Create a free account on Medmacs App." canonical="https://medmacs.app/signup" />
      <EmailVerificationModal email={formData.email} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onResend={handleResendVerification} resendLoading={resendLoading} resendDelay={RESEND_DELAY_SECONDS} />

      <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-3">
            <Link to="/"><Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110"><ArrowLeft className="h-5 w-5 text-primary" /></Button></Link>
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-8 h-8" />
            <span className="text-xl font-bold">Medmacs</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-7xl w-full">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-[calc(env(safe-area-inset-top)+60px)]">

          {/* Side panel - desktop only */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="hidden md:block">
            <div className="relative h-full overflow-hidden border-none bg-gradient-to-br from-rose-600 via-red-600 to-orange-700 text-white shadow-2xl flex flex-col rounded-[2.5rem] p-2">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center p-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-amber-400 blur-2xl opacity-40 rounded-full" />
                  <div className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                    <Crown className="w-8 h-8 text-amber-300" />
                  </div>
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-3">Join Us</h2>
                <div className="h-1.5 w-12 bg-amber-400 rounded-full mx-auto mb-4" />
                <img src="/images/drhamzaavatar.png" alt="Avatar" className="w-48 h-48 object-contain mb-4" />
                <p className="text-white/70 text-xs uppercase tracking-[0.15em] font-medium">Start your journey with Medmacs</p>
              </div>
            </div>
          </motion.div>

          {/* Signup Card */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="md:col-span-2">
            <div className="relative h-full overflow-hidden border-none bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-2xl flex flex-col rounded-[2.5rem] p-2">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />

              <div className="relative z-10 text-center pt-8 pb-3 px-6">
                <h1 className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">Create Account</h1>
                <div className="h-1.5 w-12 bg-emerald-300 rounded-full mx-auto mt-2 shadow-lg" />
                <p className="text-white/70 text-sm mt-2 font-medium uppercase tracking-[0.15em]">Join the best medical learning platform</p>
              </div>

              <div className="relative z-10 px-2 pb-2 flex-grow">
                <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 shadow-inner">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField id="email" label="Email" type="email" placeholder="Enter your email" error={validationErrors.email} icon={Mail} />
                      <InputField id="fullName" label="Full Name" placeholder="Enter your full name" error={validationErrors.fullName} />
                      <InputField id="password" label="Password" placeholder="Create a password" error={validationErrors.password} showToggle showState={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                      <InputField id="confirmPassword" label="Confirm Password" placeholder="Confirm password" error={validationErrors.confirmPassword} showToggle showState={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
                    </div>

                    <Button type="submit" className="w-full bg-white text-slate-900 hover:scale-105 transition-all duration-300 rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl" disabled={loading || Object.keys(validationErrors).length > 0}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Account"}
                    </Button>
                  </form>

                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/20" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-transparent px-2 text-white/40 text-[10px] tracking-widest">Or</span></div>
                  </div>

                  <GoogleSignin variant="signup" />

                  <div className="text-center mt-4">
                    <p className="text-white/60 text-sm">
                      Already have an account?{" "}
                      <Link to="/login" className="text-white font-bold hover:underline">Sign in</Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Signup;
