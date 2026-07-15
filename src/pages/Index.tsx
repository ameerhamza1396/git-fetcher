import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, ChevronLeft, BarChart3, Swords,
  HelpCircle, BookOpen, GraduationCap, BadgeCheck,
  BrainCircuit, FileCheck2, Crown, ArrowRight
} from "lucide-react";
import AppTransitionScreen from "@/components/AppTransitionScreen";

const STEPS = [
  {
    eyebrow: "Welcome to Medmacs",
    title: "Pakistan's Largest MCQ Library",
    description: "Built for medical students who want focused practice, stronger recall, and better exam performance.",
    mascot: "/mascots/Mascot14.png",
    kind: "library"
  },
  {
    eyebrow: "Study with confidence",
    title: "Live References & Validation",
    description: "Every important MCQ is backed by syllabus books, explanations, and verifiable learning context.",
    mascot: "/mascots/Mascot9.png",
    kind: "references"
  },
  {
    eyebrow: "Your AI study partner",
    title: "Meet Dr Ahroid",
    description: "Pakistan's advanced medical AI, trained to explain concepts with the depth and clarity medical students need.",
    mascot: "/mascots/Mascot6.png",
    kind: "ai"
  },
  {
    eyebrow: "Practice smarter",
    title: "Compete. Analyze. Grow.",
    description: "Turn daily practice into measurable progress with battles, smart tests, rankings, and in-depth analytics.",
    mascot: "/mascots/Mascot13.png",
    kind: "growth"
  },
  {
    eyebrow: "Your medical success",
    title: "Starts Today",
    description: "Join Medmacs and build a learning experience around your year, goals, and exam journey.",
    mascot: "/mascots/Mascot11.png",
    kind: "start"
  }
];

function StepVisual({ kind, mascot }: { kind: string; mascot: string }) {
  if (kind === "library") return <>
    <img src={mascot} alt="Dr Ahroid welcoming you" className="absolute bottom-8 left-1/2 h-[88%] -translate-x-1/2 object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />
    <div className="absolute inset-x-4 bottom-1 grid grid-cols-2 gap-2 rounded-2xl border border-teal-400/35 bg-[#031b1d]/90 p-3 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2"><BookOpen className="h-7 w-7 text-teal-300"/><div><b className="block text-sm text-white">50,000+</b><span className="text-[10px] text-slate-400">Verified MCQs</span></div></div>
      <div className="flex items-center gap-2"><GraduationCap className="h-7 w-7 text-cyan-300"/><div><b className="block text-sm text-white">All years</b><span className="text-[10px] text-slate-400">Major exams</span></div></div>
    </div>
  </>;

  if (kind === "references") return <>
    <div className="absolute right-4 top-3 w-[58%] rotate-2 rounded-lg border border-amber-200/30 bg-gradient-to-br from-[#26372f] to-[#101d19] p-4 shadow-2xl">
      <div className="text-center font-serif text-[9px] tracking-[.18em] text-amber-200">STANDARD TEXTBOOK</div>
      <div className="mt-3 text-center font-serif text-xl text-amber-100">MEDICINE</div>
      <div className="mt-1 text-center text-[8px] text-amber-300/70">LIVE BOOK REFERENCE</div>
    </div>
    <img src={mascot} alt="Dr Ahroid checking a reference" className="absolute -bottom-4 -left-8 h-[92%] object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />
    <div className="absolute bottom-2 right-2 w-[62%] rounded-xl border border-white/15 bg-white/95 p-3 text-[#102527] shadow-2xl">
      <p className="text-[9px] font-semibold">Which finding best supports the diagnosis?</p>
      <div className="mt-2 rounded-md bg-teal-100 px-2 py-1.5 text-[9px] font-bold text-teal-900">B. Iron deficiency <BadgeCheck className="float-right h-3 w-3"/></div>
      <p className="mt-2 flex items-center gap-1 text-[8px] text-slate-600"><FileCheck2 className="h-3 w-3 text-teal-600"/> Validated from syllabus book</p>
    </div>
  </>;

  if (kind === "ai") return <>
    <div className="absolute left-3 top-8 max-w-[58%] rounded-2xl rounded-bl-sm border border-teal-400/40 bg-[#062b2d]/90 px-3 py-2 text-[10px] text-teal-50 shadow-xl">Explain ACE inhibitors in a way I'll remember.</div>
    <div className="absolute right-3 top-[34%] flex gap-2"><span className="grid h-12 w-12 place-items-center rounded-full border border-cyan-300/40 bg-cyan-400/10"><BrainCircuit className="h-6 w-6 text-cyan-300"/></span><span className="grid h-12 w-12 place-items-center rounded-full border border-teal-300/40 bg-teal-400/10"><BookOpen className="h-6 w-6 text-teal-300"/></span></div>
    <img src={mascot} alt="Dr Ahroid AI tutor" className="absolute -bottom-10 left-1/2 h-[88%] -translate-x-1/2 object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />
    <div className="absolute bottom-3 left-3 max-w-[62%] rounded-2xl rounded-bl-sm border border-teal-400/40 bg-[#062b2d]/95 px-3 py-2 text-[9px] leading-relaxed text-teal-50">They block conversion of Angiotensin I to II—lowering vasoconstriction and aldosterone.</div>
  </>;

  if (kind === "growth") return <>
    <div className="absolute left-2 top-1 w-[67%] space-y-1.5">
      {[[Swords,"Battle Mode","1v1, 2v2 & FFA"],[FileCheck2,"AI Tests","Made for your weak areas"],[BarChart3,"Deep Analytics","Find gaps faster"],[Crown,"Leaderboards","Climb and compete"]].map(([Icon,title,sub]: any) => <div key={title} className="flex items-center gap-2 rounded-xl border border-teal-400/15 bg-teal-400/10 px-3 py-2 backdrop-blur"><Icon className="h-5 w-5 text-teal-300"/><div><b className="block text-[10px] text-white">{title}</b><span className="block text-[8px] text-slate-400">{sub}</span></div></div>)}
    </div>
    <div className="absolute bottom-3 left-2 grid h-24 w-24 place-items-center rounded-2xl border border-teal-400/25 bg-[#062426]/90"><div className="grid h-16 w-16 place-items-center rounded-full border-[7px] border-teal-400 text-lg font-black text-white">82%</div></div>
    <img src={mascot} alt="Dr Ahroid showing your progress" className="absolute -bottom-8 -right-10 h-[80%] object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />
  </>;

  return <>
    <img src={mascot} alt="Dr Ahroid ready to begin" className="absolute -bottom-10 left-1/2 h-[92%] -translate-x-1/2 object-contain drop-shadow-[0_24px_30px_rgba(0,0,0,.55)]" />
    <div className="absolute inset-x-3 bottom-2 rounded-2xl border border-teal-400/35 bg-[#031b1d]/95 p-4 shadow-2xl backdrop-blur-xl">
      <p className="text-sm font-bold text-white">Let's get you started <span aria-hidden>🚀</span></p>
      <div className="my-3 h-px bg-white/10" />
      <div className="space-y-2 text-[10px] text-slate-300"><div className="rounded-lg bg-white/5 px-3 py-2">Choose your institute</div><div className="rounded-lg bg-white/5 px-3 py-2">Select your current MBBS year</div></div>
    </div>
  </>;
}

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
        navigate("/dashboard", { replace: true });
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
    if (isLoggedIn) navigate("/dashboard", { replace: true });
    else setShowWizard(false);
  };

  const restartWizard = () => {
    setCurrentStep(0);
    setShowWizard(true);
  };

  if (loading) return <AppTransitionScreen label="Preparing" />;

  return (
    <AnimatePresence mode="wait">
      {showWizard ? (
        /* ─── WIZARD VIEW ─── */
        <motion.div
          key="wizard"
          initial={{ opacity: 1 }} exit={{ opacity: 0, scale: .97 }}
          className="fixed inset-0 overflow-hidden overscroll-none bg-[#020909] text-white"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(13,148,136,.22),transparent_42%),linear-gradient(180deg,#020909_0%,#031416_55%,#020909_100%)]" />
          <div className="pointer-events-none absolute inset-0 opacity-[.06] [background-image:linear-gradient(rgba(45,212,191,.4)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,.4)_1px,transparent_1px)] [background-size:34px_34px]" />

          <main className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-2.5"><img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs" className="h-9 w-9 object-contain"/><span className="text-xl font-black tracking-tight">medmacs</span></div>
              <button onClick={completeSetup} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-slate-400 transition hover:text-white">Skip</button>
            </header>

            <AnimatePresence mode="wait">
              <motion.section key={currentStep} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: .28 }} className="flex min-h-0 flex-1 flex-col">
                <div className="mx-auto max-w-sm px-2 pt-7 text-center">
                  <p className="text-[11px] font-black uppercase tracking-[.2em] text-teal-300/75">{STEPS[currentStep].eyebrow}</p>
                  <h1 className="mt-2 text-[clamp(1.75rem,7vw,2.45rem)] font-black leading-[1.02] tracking-[-.035em] text-white"><span className="bg-gradient-to-r from-white via-teal-100 to-teal-400 bg-clip-text text-transparent">{STEPS[currentStep].title}</span></h1>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-400">{STEPS[currentStep].description}</p>
                </div>

                <div className="relative mx-auto mt-4 min-h-0 w-full max-w-sm flex-1 overflow-hidden rounded-[2rem] border border-teal-300/15 bg-gradient-to-b from-teal-950/30 to-black/20 shadow-[0_24px_80px_rgba(0,0,0,.45),inset_0_1px_rgba(255,255,255,.04)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(20,184,166,.17),transparent_48%)]" />
                  <StepVisual kind={STEPS[currentStep].kind} mascot={STEPS[currentStep].mascot} />
                </div>
              </motion.section>
            </AnimatePresence>

            <footer className="mt-4 flex items-center justify-between">
              <button onClick={handleBack} disabled={currentStep === 0} aria-label="Previous step" className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition disabled:invisible"><ChevronLeft className="h-5 w-5"/></button>
              <div className="flex gap-2">{STEPS.map((_, idx) => <button key={idx} onClick={() => setCurrentStep(idx)} aria-label={`Go to step ${idx + 1}`} className={`h-2 rounded-full transition-all ${idx === currentStep ? "w-7 bg-teal-400" : "w-2 bg-slate-600"}`} />)}</div>
              <button onClick={handleNext} aria-label={currentStep === STEPS.length - 1 ? "Get started" : "Next step"} className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white shadow-[0_10px_30px_rgba(20,184,166,.35)] transition active:scale-95">{currentStep === STEPS.length - 1 ? <ArrowRight className="h-6 w-6"/> : <ChevronRight className="h-7 w-7"/>}</button>
            </footer>
          </main>
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
          className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#0a2e2e] via-[#0f172a] to-[#020617] overflow-hidden overscroll-none"
        >
          {/* Help/Revisit Button */}
          <button
            onClick={restartWizard}
            className="absolute top-8 right-8 z-50 text-cyan-100/40 hover:text-cyan-400 transition-colors p-2"
            title="Revisit App Tour"
          >
            <HelpCircle className="w-7 h-7" />
          </button>

          <div className="absolute top-[-10%] left-[-10%] w-72 h-72 bg-[#2dd4bf]/30 rounded-full blur-[80px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#0ea5e9]/20 rounded-full blur-[100px]" />

          <div className="relative z-10 flex flex-col items-center w-full max-w-sm px-8">
            <motion.img
              initial={{ y: 20 }} animate={{ y: 0 }}
              src={welcomeMascot} alt="Mascot" className="w-40 h-auto drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
            />
            <div className="text-center mt-8">
              <h1 className="text-4xl font-extrabold text-white">Medmacs<span className="text-[#2dd4bf]">.App</span></h1>
              <p className="text-cyan-100/70 text-sm uppercase mt-2 font-bold tracking-widest">Master the MBBS Journey</p>
            </div>
            <div className="mt-12 w-full flex flex-col gap-4">
              <button onClick={() => navigate("/signup")} className="w-full py-4 bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">Create Account</button>
              <button onClick={() => navigate("/login")} className="w-full py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl active:scale-95 transition-transform backdrop-blur-md">Login</button>
            </div>
          </div>
          <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-15px); } }`}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
