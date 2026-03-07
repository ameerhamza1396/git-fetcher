// @ts-nocheck
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, EyeOff, CheckCircle, XCircle, Sun, Moon, Mail, Loader2, Star, Shield, Lock, User } from "lucide-react";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import GoogleSignin from "@/components/GoogleSignin";

const InputField = ({ id, label, type = "text", placeholder, value, onChange, error, showToggle = false, showState, onToggle, icon: Icon }) => {
  return (
    <div className="space-y-1.5 text-left">
      <Label htmlFor={id} className="text-white/90 text-[10px] font-bold uppercase tracking-wider">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />}
        <Input
          id={id}
          name={id}
          type={showToggle ? (showState ? "text" : "password") : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`${Icon ? 'pl-10' : ''} ${showToggle ? 'pr-10' : ''} bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50 h-12 rounded-xl text-sm ${error ? "border-red-400/60" : ""}`}
          required
        />
        {showToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3 top-3.5 text-white/40 hover:text-white/70">
            {showState ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-red-300 text-[10px] font-medium leading-none mt-1">{error}</p>}
    </div>
  );
};

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
      <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
        <DialogHeader className="flex flex-col items-center text-center pt-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="p-3 bg-primary/10 rounded-full mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </motion.div>
          <DialogTitle className="text-2xl font-bold">Verification Email Sent! 🚀</DialogTitle>
          <DialogDescription className="text-muted-foreground mt-2">
            We've sent a verification link to <br /><span className="font-bold text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-3 mt-4">
          <Button onClick={() => { onClose(); navigate("/login"); }} className="w-full rounded-xl">Go to Login</Button>
          <Button variant="outline" onClick={onResend} disabled={resendLoading || countdown > 0} className="w-full rounded-xl">
            {resendLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : countdown > 0 ? `Resend in ${countdown}s` : "Resend Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Signup = () => {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [formData, setFormData] = useState({ email: "", fullName: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => { setMounted(true); if (user) navigate("/dashboard"); }, [user, navigate]);

  useEffect(() => {
    const errors = {};
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email format";
    if (formData.fullName && formData.fullName.length < 2) errors.fullName = "Name must be at least 2 characters";
    if (formData.password) {
      if (formData.password.length < 8) errors.password = "Minimum 8 characters required";
      else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) errors.password = "Include uppercase, lowercase & digit";
    }
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match";
    setValidationErrors(errors);
  }, [formData]);

  const handleInputChange = (e) => setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);
    const { data, error } = await signUp(formData.email, formData.password, { fullName: formData.fullName });
    if (!error && data) setIsModalOpen(true);
    else toast({ title: "Signup Failed", description: error?.message || "Please try again later.", variant: "destructive" });
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950 flex items-center justify-center overflow-x-hidden">
      <Seo title="Create Account" description="Join Medmacs today." canonical="https://medmacs.app/signup" />
      <EmailVerificationModal email={formData.email} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onResend={() => { }} resendLoading={false} resendDelay={60} />

      {/* Header - Identical to Login */}
      {/* <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110">
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Button>
            </Link>
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-8 h-8" />
            <span className="text-xl font-bold">Medmacs</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </header> */}

      <main className="container mx-auto px-4 max-w-7xl w-full py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">

          {/* Signup Card - Matching Login Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="md:col-span-2"
          >
            <div className="relative h-full overflow-hidden border-none bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-2xl flex flex-col rounded-[2.5rem] p-2">
              {/* Pattern Overlay */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`,
                maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
              }} />

              <div className="relative z-10 text-center pt-8 pb-4 px-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-slate-400 blur-2xl opacity-40 rounded-full" />
                    <div className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                      <Shield className="w-8 h-8 text-slate-200" />
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">Create Account</h1>
                <div className="h-1.5 w-12 bg-slate-300 rounded-full mx-auto mt-2 shadow-lg" />
                <p className="text-white/70 text-xs mt-3 font-medium uppercase tracking-[0.15em]">Join the elite MDCAT community</p>
              </div>

              <div className="relative z-10 px-2 pb-2 flex-grow">
                <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-inner">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField id="fullName" label="Full Name" value={formData.fullName} onChange={handleInputChange} error={validationErrors.fullName} icon={User} placeholder="John Doe" />
                      <InputField id="email" label="Email Address" value={formData.email} onChange={handleInputChange} error={validationErrors.email} icon={Mail} placeholder="john@example.com" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField id="password" label="Password" value={formData.password} onChange={handleInputChange} error={validationErrors.password} icon={Lock} showToggle showState={showPassword} onToggle={() => setShowPassword(!showPassword)} placeholder="••••••••" />
                      <InputField id="confirmPassword" label="Confirm Password" value={formData.confirmPassword} onChange={handleInputChange} error={validationErrors.confirmPassword} icon={Lock} showToggle showState={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} placeholder="••••••••" />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-white text-slate-900 hover:scale-[1.02] transition-all duration-300 rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl mt-4"
                      disabled={loading}
                    >
                      {loading ? <Loader2 className="animate-spin" /> : "Start Your Journey"}
                    </Button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-transparent px-2 text-white/40 text-[10px] tracking-widest">Or Register With</span>
                      </div>
                    </div>

                    <GoogleSignin buttonText="Sign up with Google" />

                    <div className="text-center pt-2">
                      <p className="text-sm text-white/60">
                        Already a member?{" "}
                        <Link to="/login" className="text-white font-bold hover:underline">
                          Sign In
                        </Link>
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Side Info Panel - Matching Login Style */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="hidden md:block"
          >
            <div className="relative h-full overflow-hidden border-none bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-2xl flex flex-col rounded-[2.5rem] p-2">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`,
                maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
              }} />
              <div className="relative z-10 flex flex-col items-center justify-center h-full text-center p-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 rounded-full" />
                  <div className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                    <Star className="w-8 h-8 text-yellow-300" />
                  </div>
                </div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-3">Join Medmacs</h2>
                <div className="h-1.5 w-12 bg-yellow-400 rounded-full mx-auto mb-4" />
                <img src="/images/drhamzaavatar.png" alt="Avatar" className="w-48 h-48 object-contain mb-4" />
                <p className="text-white/70 text-[10px] leading-relaxed uppercase tracking-[0.15em] font-medium max-w-[200px]">
                  Master the MDCAT with personalized AI guidance and expert-curated content.
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
};

export default Signup;