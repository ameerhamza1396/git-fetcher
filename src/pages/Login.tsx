// @ts-nocheck
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import Seo from "@/components/Seo";
import { motion } from "framer-motion";
import GoogleSignin from "@/components/GoogleSignin";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const { data, error } = await signIn(formData.email, formData.password);
    if (data && !error) navigate("/dashboard");
    setIsLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden overscroll-none bg-gradient-to-br from-[#0a2e2e] via-[#0f172a] to-[#020617]">
      <Seo
        title="Login"
        description="Log in to your Medmacs App account to access personalized MDCAT preparation tools, MCQs, AI study assistant, and more."
        canonical="https://medmacs.app/login"
      />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2dd4bf]/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-[#0ea5e9]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-[#67e8f9]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Diagonal pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)`
        }} />
      </div>

      {/* Safe area top spacing */}
      <div className="pt-[env(safe-area-inset-top)]" />

      {/* Top bar - just back button + logo, no full header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 flex items-center justify-between px-5 py-4"
      >
        <Link to="/" className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          <span className="text-sm font-medium">Back</span>
        </Link>
        <div className="flex items-center space-x-2">
          <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
          <span className="text-white font-bold text-lg tracking-tight">Medmacs</span>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-[env(safe-area-inset-bottom)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Welcome text */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 mb-4 border border-white/10"
            >
              <span className="text-[#2dd4bf] text-xs font-semibold uppercase tracking-widest">Welcome back</span>
            </motion.div>
            <h1 className="text-white text-3xl font-black tracking-tight">Sign in to your account</h1>
            <p className="text-white/50 text-sm mt-2">Continue your learning journey</p>
          </div>

          {/* Form card */}
          <div className="bg-white/[0.07] backdrop-blur-2xl rounded-3xl p-6 border border-white/10 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/80 text-xs font-semibold uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-white/30" />
                  <Input
                    id="email" type="email" placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-white/[0.08] border-white/10 text-white placeholder:text-white/25 focus:border-[#2dd4bf]/50 focus:ring-[#2dd4bf]/20 h-12 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/80 text-xs font-semibold uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-white/30" />
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 pr-10 bg-white/[0.08] border-white/10 text-white placeholder:text-white/25 focus:border-[#2dd4bf]/50 focus:ring-[#2dd4bf]/20 h-12 rounded-xl"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link to="/forgot-password" university-colors className="text-xs text-[#2dd4bf] hover:text-[#2dd4bf]/80 transition-colors font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] hover:from-[#2dd4bf]/90 hover:to-[#0ea5e9]/90 text-white rounded-xl h-12 font-bold text-sm tracking-wide shadow-lg shadow-[#0ea5e9]/20 transition-all duration-300 hover:shadow-xl hover:shadow-[#0ea5e9]/30"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : "Sign In"}
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-transparent px-3 text-white/30 text-[10px] uppercase tracking-widest">or continue with</span></div>
              </div>

              <GoogleSignin buttonText="Continue with Google" />
            </form>

            <p className="text-center text-white/40 text-sm mt-5">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#2dd4bf] font-semibold hover:text-[#2dd4bf]/80 transition-colors">Create account</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
