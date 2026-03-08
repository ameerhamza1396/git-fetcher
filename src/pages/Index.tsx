import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, ChevronLeft, Zap, BarChart3,
  Trophy, Swords, Bot, Sparkles, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Largest MCQ Collection",
    description: "Attempt the MCQs from the largest collection in Pakistan, tailored for your success.",
    mascot: "/mascots/Mascot1.png",
    screen: "/screenMedia/screen7.png",
    icon: <Zap className="w-20 h-20 text-yellow-400/80" />,
    gradient: "from-blue-600 via-indigo-700 to-purple-800"
  },
  {
    title: "Track Performance",
    description: "Monitor your progress and identify weak spots through deep in-app Analysis.",
    mascot: "/mascots/Mascot10.png",
    screen: "/screenMedia/screen17.png",
    icon: <BarChart3 className="w-20 h-20 text-green-400/80" />,
    gradient: "from-emerald-600 via-teal-700 to-cyan-800"
  },
  {
    title: "Rise to the Top",
    description: "Compete with thousands and claim your spot at the top of the National Leaderboard.",
    mascot: "/mascots/Mascot5.png",
    screen: "/screenMedia/screen16.png",
    icon: <Trophy className="w-20 h-20 text-orange-400/80" />,
    gradient: "from-orange-600 via-red-700 to-rose-800"
  },
  {
    title: "Battle Mode",
    description: "Challenge your friends or random opponents in real-time MCQ battles.",
    mascot: "/mascots/Mascot3.png",
    screen: "/screenMedia/screen18.png",
    icon: <Swords className="w-20 h-20 text-purple-400/80" />,
    gradient: "from-violet-600 via-purple-700 to-fuchsia-800"
  },
  {
    title: "Meet Dr. Ahroid",
    description: "Your personal AI companion, ready to solve doubts and guide your study path.",
    mascot: "/mascots/Mascot6.png",
    screen: "/screenMedia/screen11.png",
    icon: <Bot className="w-20 h-20 text-blue-300/80" />,
    gradient: "from-slate-800 via-blue-900 to-indigo-950"
  }
];

export default function Welcome() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const welcomeMascot = useMemo(() => {
    const avatars = ["Mascot2", "Mascot8", "Mascot9", "Mascot10", "Mascot13", "Mascot14"];
    return `/mascots/${avatars[Math.floor(Math.random() * avatars.length)]}.png`;
  }, []);

  useEffect(() => {
    async function checkState() {
      const hasSeenWizard = localStorage.getItem("hasSeenWizard");
      const { data } = await supabase.auth.getSession();
      const userExists = !!data?.session;
      setIsLoggedIn(userExists);

      if (!hasSeenWizard) {
        setShowWizard(true);
      } else if (userExists) {
        navigate("/dashboard");
      }
      setLoading(false);
    }
    checkState();
  }, [navigate]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((prev) => prev + 1);
    else completeSetup();
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((prev) => prev - 1);
  };

  const completeSetup = () => {
    localStorage.setItem("hasSeenWizard", "true");
    if (isLoggedIn) navigate("/dashboard");
    else setShowWizard(false);
  };

  const restartWizard = () => {
    setCurrentStep(0);
    setShowWizard(true);
  };

  if (loading) return null;

  return (
    <AnimatePresence mode="wait">
      {showWizard ? (
        /* ─── WIZARD VIEW ─── */
        <motion.div
          key="wizard"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 0.9,
            transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
          }}
          className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden transition-colors
            duration-700 bg-gradient-to-br ${STEPS[currentStep].gradient}`}
        >
          <button onClick={completeSetup} className="absolute top-8 right-8 z-50 text-white/50 hover:text-white text-sm font-bold uppercase tracking-widest transition-colors">
            Skip
          </button>

          {/* Visual Composition */}
          <div className="relative w-full max-w-5xl h-[45vh] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {/* 1. Screen Media (Background Left) */}
                <motion.div
                  initial={{ x: -100, opacity: 0, rotate: -5 }}
                  animate={{ x: -80, opacity: 0.4, rotate: 15 }}
                  className="absolute left-[10%] md:left-[20%] z-10 w-48 md:w-72"
                >
                  <img src={STEPS[currentStep].screen} alt="" className="rounded-[2.5rem] shadow-2xl border-8 border-white/5" />
                </motion.div>

                {/* 2. Icon (Background Bottom) */}
                <motion.div
                  initial={{ y: 50, scale: 0.5, opacity: 0 }}
                  animate={{ y: 120, scale: 1.2, opacity: 0.3 }}
                  className="absolute z-0"
                >
                  {STEPS[currentStep].icon}
                </motion.div>

                {/* 3. Mascot (Front) */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="absolute z-30 w-64 md:w-96"
                >
                  <img src={STEPS[currentStep].mascot} alt="Mascot" className="drop-shadow-[0_25px_50px_rgba(0,0,0,0.6)]" />
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Content & Buttons */}
          <div className="relative z-40 text-center px-8 max-w-3xl mt-12">
            <AnimatePresence mode="wait">
              <motion.div key={currentStep} initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
                <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter italic">{STEPS[currentStep].title}</h2>
                <p className="text-white/70 text-lg md:text-2xl mb-12 font-medium leading-tight max-w-xl mx-auto">{STEPS[currentStep].description}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
              <div className="flex items-center gap-3 w-full">
                <AnimatePresence mode="popLayout">
                  {currentStep > 0 && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: currentStep === STEPS.length - 1 ? "15%" : "40%", opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      className="overflow-hidden shrink-0"
                    >
                      <Button onClick={handleBack} variant="outline" className="w-full h-16 rounded-2xl border-2 border-white/20 bg-white/5 text-white p-0">
                        <ChevronLeft className={currentStep === STEPS.length - 1 ? "h-6 w-6" : "mr-1 h-5 w-5"} />
                        {currentStep !== STEPS.length - 1 && "Back"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div layout className="flex-grow">
                  <Button onClick={handleNext} className="w-full h-16 rounded-2xl bg-white text-black hover:bg-slate-100 text-lg font-black shadow-2xl transition-all">
                    {currentStep === STEPS.length - 1 ? (
                      <span className="flex items-center justify-center gap-2 text-sm sm:text-base whitespace-nowrap">
                        Continue to Medmacs.App <Sparkles className="h-4 w-4 fill-black" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Next <ChevronRight className="h-6 w-6" /></span>
                    )}
                  </Button>
                </motion.div>
              </div>
              <div className="flex gap-3">
                {STEPS.map((_, idx) => (
                  <div key={idx} className={`h-2 w-10 rounded-full transition-all ${idx === currentStep ? "bg-white" : "bg-white/20"}`} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        /* ─── LOGIN SCREEN VIEW ─── */
        <motion.div
          key="login"
          initial={{ opacity: 0, scale: 1.1, y: 20 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              type: "spring",
              damping: 20,
              stiffness: 100,
              delay: 0.1
            }
          }}
          className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a2e2e] overflow-hidden"
        >
          {/* Help/Revisit Button */}
          <button
            onClick={restartWizard}
            className="absolute top-8 right-8 z-50 text-teal-100/40 hover:text-teal-400 transition-colors p-2"
            title="Revisit App Tour"
          >
            <HelpCircle className="w-7 h-7" />
          </button>

          <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-teal-500/30 rounded-full blur-[80px]" />

          <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">
            <motion.img
              initial={{ y: 20 }} animate={{ y: 0 }}
              src={welcomeMascot} alt="Mascot" className="w-40 h-auto drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
            />
            <div className="text-center mt-8">
              <h1 className="text-4xl font-extrabold text-white">Medmacs<span className="text-teal-400">.App</span></h1>
              <p className="text-teal-100/70 text-sm uppercase mt-2 font-bold tracking-widest">Master the MBBS Journey</p>
            </div>
            <div className="mt-12 w-full flex flex-col gap-4">
              <button onClick={() => navigate("/signup")} className="w-full py-4 bg-teal-500 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">Create Account</button>
              <button onClick={() => navigate("/login")} className="w-full py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl active:scale-95 transition-transform">Login</button>
            </div>
          </div>
          <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }`}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}