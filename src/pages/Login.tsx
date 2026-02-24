import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import Seo from "@/components/Seo";
import { motion, AnimatePresence } from "framer-motion";

// ⭐ NEW IMPORT for the extracted component
import GoogleSignin from "@/components/GoogleSignin";

// ⭐ REMOVED: import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ⭐ MODIFIED HOOK: Removed signInWithGoogleSupabase as it's not needed directly here
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // ⭐ REQUIRED: Removed GoogleAuth initialization logic
    setMounted(true);
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  // ⭐ REMOVED: handleGoogleNative function

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { data, error } = await signIn(formData.email, formData.password);

    // NOTE: Add toast logic here for better UX if your useAuth hook doesn't handle it
    // if (data && !error) {
    //   navigate("/dashboard");
    // } else if (error) {
    //   // Display error toast
    // }

    if (data && !error) navigate("/dashboard");
    setIsLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center animate-gradient">
      <Seo
        title="Login"
        description="Log in to your Medmacs App account to access personalized MDCAT preparation tools, MCQs, AI study assistant, and more."
        canonical="https://medmacs.app/login"
      />

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-10">

        {/* Left Section */}
        <div className="hidden md:flex flex-col items-center justify-center relative overflow-hidden rounded-2xl shadow-lg bg-gradient-to-br from-purple-600 to-pink-600 p-6 animate-fade-in">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15),_transparent_70%)] animate-pulse"></div>
          <img
            src="/images/drhamzaavatar.png"
            alt="Avatar"
            className="w-72 h-72 object-contain z-10"
          />
          <h2 className="text-3xl font-bold text-white mt-4 z-10">
            Welcome Back!
          </h2>
          <p className="text-purple-100 text-center z-10">
            Continue your learning journey with Medmacs
          </p>
        </div>

        {/* Right Section */}
        <AnimatePresence mode="wait">
          <motion.div
            key="login-card"
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
                  Sign In
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-900 dark:text-white">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="pl-10 bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-gray-900 dark:text-white">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        className="pl-10 pr-10 bg-white dark:bg-gray-800 border-purple-300 dark:border-purple-700 focus:border-purple-500 dark:focus:border-purple-400"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember + Forgot */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <span className="text-gray-600 dark:text-gray-400">
                        Remember me
                      </span>
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Sign in button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:scale-105 transition-transform duration-200"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      "Sign In"
                    )}
                  </Button>

                  {/* ⭐ MODIFIED: Use the new component */}
                  <GoogleSignin buttonText="Continue with Google" />

                  {/* Sign up */}
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Don't have an account?{" "}
                      <Link
                        to="/signup"
                        className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium transition-colors"
                      >
                        Create account for free
                      </Link>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;