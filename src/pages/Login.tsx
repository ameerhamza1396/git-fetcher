// @ts-nocheck
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Moon, Sun, Shield, Star, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
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
  const { theme, setTheme } = useTheme();

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
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950 flex items-center justify-center">
      <Seo
        title="Login"
        description="Log in to your Medmacs App account to access personalized MDCAT preparation tools, MCQs, AI study assistant, and more."
        canonical="https://medmacs.app/login"
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-3">
            <Link to="/">
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
      </header>

      <main className="container mx-auto px-4 max-w-7xl w-full">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-[calc(env(safe-area-inset-top)+80px)]">

          {/* Login Card - styled like pricing card */}
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

              <div className="relative z-10 text-center pt-10 pb-4 px-6">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-slate-400 blur-2xl opacity-40 rounded-full" />
                    <div className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                      <Shield className="w-8 h-8 text-slate-200" />
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">Sign In</h1>
                <div className="h-1.5 w-12 bg-slate-300 rounded-full mx-auto mt-2 shadow-lg" />
                <p className="text-white/70 text-sm mt-3 font-medium uppercase tracking-[0.15em]">Enter your credentials to continue</p>
              </div>

              <div className="relative z-10 px-2 pb-2 flex-grow">
                <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-inner">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white/90 text-sm font-bold uppercase tracking-wider">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50 h-12 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white/90 text-sm font-bold uppercase tracking-wider">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3.5 h-4 w-4 text-white/40" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50 h-12 rounded-xl"
                          required
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-white/40 hover:text-white/70">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center space-x-2 text-sm">
                        <input type="checkbox" className="rounded border-white/30" />
                        <span className="text-white/60 text-xs">Remember me</span>
                      </label>
                      <Link to="/forgot-password" className="text-xs text-white/60 hover:text-white/90 transition-colors font-semibold">
                        Forgot password?
                      </Link>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-white text-slate-900 hover:scale-105 transition-all duration-300 rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                          <span>Signing in...</span>
                        </div>
                      ) : (
                        "Sign In"
                      )}
                    </Button>

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/20" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-transparent px-2 text-white/40 text-[10px] tracking-widest">Or</span>
                      </div>
                    </div>

                    <GoogleSignin buttonText="Continue with Google" />

                    <div className="text-center pt-2">
                      <p className="text-sm text-white/60">
                        Don't have an account?{" "}
                        <Link to="/signup" className="text-white font-bold hover:underline">
                          Create account
                        </Link>
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Side info panel */}
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
                <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-3">Welcome Back</h2>
                <div className="h-1.5 w-12 bg-yellow-400 rounded-full mx-auto mb-4" />
                <img src="/images/drhamzaavatar.png" alt="Avatar" className="w-48 h-48 object-contain mb-4" />
                <p className="text-white/70 text-xs uppercase tracking-[0.15em] font-medium">Continue your learning journey with Medmacs</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Login;
