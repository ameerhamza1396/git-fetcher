import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Welcome() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkUser() {
      const minDelay = new Promise((res) => setTimeout(res, 3000)); // 3 sec minimum
      const { data } = await supabase.auth.getSession();

      await minDelay;

      if (data?.session) {
        setIsLoggedIn(true);
        navigate("/dashboard"); // redirect if logged in
      }

      setIsLoggedIn(!!data?.session);
      setLoading(false);
    }
    checkUser();
  }, [navigate]);

  const handleClick = () => {
    if (isLoggedIn) navigate("/dashboard");
    else navigate("/signup");
  };

  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a2e2e] relative overflow-hidden font-sans">

        {/* ─── DYNAMIC BACKGROUND ─── */}
        {/* Animated blobs for a high-end "Apple-style" mesh gradient */}
        <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-teal-500/30 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-[-5%] right-[-5%] w-80 h-80 bg-emerald-500/20 rounded-full blur-[100px] animate-bounce" style={{ animationDuration: '8s' }} />

        <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">

          {/* ─── FLOATING MASCOT ─── */}
          <div className="relative group">
            <div className="absolute inset-0 bg-teal-400/20 blur-2xl rounded-full scale-75 group-hover:scale-110 transition-transform duration-500" />
            <img
              src="/images/drhamzaavatar.png"
              alt="Medmacs Mascot"
              className="w-40 h-auto relative drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
            />
          </div>

          {/* ─── TEXT CONTENT ─── */}
          <div className="text-center mt-8 space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Medmacs<span className="text-teal-400">.App</span>
            </h1>
            <p className="text-teal-100/70 text-sm font-medium tracking-wide uppercase">
              Master the MBBS Journey
            </p>
          </div>

          {/* ─── INTERACTIVE AREA ─── */}
          <div className="mt-12 w-full">
            {loading ? (
              /* Elegant Pulse Loader */
              <div className="flex justify-center items-center space-x-3 h-16">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-3 h-3 bg-teal-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                {!isLoggedIn ? (
                  <>
                    {/* Signup: Primary Action */}
                    <button
                      onClick={() => navigate("/signup")}
                      className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-2xl shadow-[0_10px_20px_-10px_rgba(20,184,166,0.5)] transition-all active:scale-95"
                    >
                      Create Account
                    </button>

                    {/* Login: Glassmorphism Action */}
                    <button
                      onClick={() => navigate("/login")}
                      className="w-full py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all"
                    >
                      Welcome Back, Login
                    </button>
                  </>
                ) : (
                  /* Logged In State */
                  <button
                    onClick={handleClick}
                    className="w-full py-4 bg-white text-teal-900 font-bold rounded-2xl shadow-xl hover:shadow-teal-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    Enter Dashboard
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─── FOOTER QUOTE ─── */}
          {!loading && (
            <p className="mt-10 text-[10px] text-teal-100/40 uppercase tracking-[0.2em]">
              Precision Learning for Future Doctors
            </p>
          )}
        </div>

        {/* Global CSS for the custom float animation */}
        <style >{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
      </div>
    );
  }