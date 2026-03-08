// @ts-nocheck
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, ArrowRight, ScrollText, Zap, Loader2, ChevronLeft, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import UpgradeAccountModal from "@/components/UpgradeAccountModal";
import FlpTestPage from "@/components/FLPs/FlpTestPage";
import { motion, AnimatePresence } from "framer-motion";

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  chapter_id: string;
}

interface Subject {
  id: string;
  name: string;
  year?: number;
  icon?: string;
  color?: string;
}

const FLP = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0); // 0=intro, 1=mcq count, 2=subject
  const [selectedMcqCount, setSelectedMcqCount] = useState<number | null>(null);
  const [isFetchingMcqs, setIsFetchingMcqs] = useState(false);
  const [fetchedMcqs, setFetchedMcqs] = useState<MCQ[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedSubjectName, setSelectedSubjectName] = useState('');

  // Subject loading
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Fetching messages
  const fetchMessages = [
    "Hold tight, preparing your test...",
    "This will only take a moment...",
    "Almost there, stay ready!",
    "Nearly done, loading questions!",
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (isFetchingMcqs) {
      const interval = setInterval(() => setMsgIdx((p) => (p + 1) % fetchMessages.length), 4000);
      return () => clearInterval(interval);
    }
  }, [isFetchingMcqs]);

  // Fetch subjects when reaching step 2
  useEffect(() => {
    if (wizardStep !== 2 || !user) return;
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      try {
        const { data: profile } = await supabase.from("profiles").select("year").eq("id", user.id).maybeSingle();
        if (!profile?.year) { setSubjects([]); setLoadingSubjects(false); return; }
        const { data } = await supabase.from("subjects").select("id, name, year, icon, color").eq("year", profile.year);
        setSubjects(data || []);
      } catch { setSubjects([]); }
      finally { setLoadingSubjects(false); }
    };
    fetchSubjects();
  }, [wizardStep, user]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const formatTime = (count: number) => {
    if (count === 100) return "2 hours";
    if (count === 50) return "1 hour";
    if (count === 30) return "45 minutes";
    return `${count} min`;
  };

  const handleStartTest = async () => {
    if (!user || !selectedSubject || selectedMcqCount === null) return;
    setIsFetchingMcqs(true);
    try {
      const { data: subjectData } = await supabase.from("subjects").select("name").eq("id", selectedSubject).single();
      if (subjectData) setSelectedSubjectName(subjectData.name);
      const { data: chapters, error: chaptersError } = await supabase.from("chapters").select("id").eq("subject_id", selectedSubject);
      if (chaptersError) throw chaptersError;
      const chapterIds = (chapters || []).map((c) => c.id);
      if (chapterIds.length === 0) { toast({ title: "No Questions", description: "No chapters found.", variant: "warning" }); setIsFetchingMcqs(false); return; }
      const { data: mcqsData, error: mcqsError } = await supabase.from("mcqs").select("*").in("chapter_id", chapterIds);
      if (mcqsError) throw mcqsError;
      if (!mcqsData || mcqsData.length === 0) { toast({ title: "No MCQs Found", variant: "warning" }); setIsFetchingMcqs(false); return; }
      const shuffled = shuffleArray(mcqsData as MCQ[]);
      if (shuffled.length < selectedMcqCount) { toast({ title: "Not Enough Questions", description: `Only ${shuffled.length} available.`, variant: "warning" }); setIsFetchingMcqs(false); return; }
      setFetchedMcqs(shuffled.slice(0, selectedMcqCount));
      setShowQuiz(true);
    } catch (err) {
      toast({ title: "Error", description: err?.message || "Failed to prepare test.", variant: "destructive" });
    } finally { setIsFetchingMcqs(false); }
  };

  const handleFLPQuizFinish = (score: number, totalQuestions: number) => {
    setShowQuiz(false);
    toast({ title: "FLP Quiz Finished!", description: `You scored ${score} out of ${totalQuestions}.`, duration: 5000 });
    setFetchedMcqs([]);
    setSelectedMcqCount(null);
    setWizardStep(0);
  };

  if (showQuiz && fetchedMcqs.length > 0) return <FlpTestPage mcqs={fetchedMcqs} onFinish={handleFLPQuizFinish} subjectName={selectedSubjectName} />;

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-32 h-32 object-contain animate-pulse" />
      </div>
    );
  }

  const TOTAL_STEPS = user ? 3 : 1;

  const stepGradients = [
    "from-indigo-600 via-violet-700 to-purple-900",
    "from-blue-600 via-indigo-700 to-violet-800",
    "from-violet-600 via-purple-700 to-fuchsia-800",
  ];

  return (
    <div className="fixed inset-0 overflow-hidden">
      <Seo title="Full-Length Papers (FLP)" description="Attempt full-length papers on Medmacs App." canonical="https://medmacs.app/flp" />
      <UpgradeAccountModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgradeClick={() => { setShowUpgradeModal(false); navigate("/pricing"); }} />

      {/* Fetching overlay */}
      <AnimatePresence>
        {isFetchingMcqs && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl"
          >
            <motion.img
              src="/mascots/Mascot1.png" alt="Mascot"
              className="w-40 h-40 object-contain mb-6"
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <Loader2 className="h-10 w-10 animate-spin text-white/80 mb-4" />
            <p className="text-white/80 text-lg font-semibold text-center px-8">{fetchMessages[msgIdx]}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard */}
      <motion.div
        className={`fixed inset-0 flex flex-col items-center justify-center overflow-hidden transition-colors duration-700 bg-gradient-to-br ${stepGradients[wizardStep] || stepGradients[0]}`}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)`
        }} />

        {/* Back button */}
        <button
          onClick={() => {
            if (wizardStep === 0) window.history.back();
            else { setWizardStep(w => w - 1); setSelectedSubject(null); }
          }}
          className="absolute top-8 left-6 z-50 text-white/50 hover:text-white transition-colors flex items-center gap-1 text-sm font-bold uppercase tracking-widest"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <ChevronLeft className="w-5 h-5" /> Back
        </button>

        {/* Visual area */}
        <div className="relative w-full flex-1 flex items-center justify-center max-h-[45vh]">
          <AnimatePresence mode="wait">
            <motion.div
              key={wizardStep}
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -20 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="relative flex items-center justify-center"
            >
              {/* Glow */}
              <div className="absolute w-64 h-64 bg-yellow-400/20 rounded-full blur-[80px]" />
              <img
                src="/mascots/Mascot1.png"
                alt="FLP Mascot"
                className="relative z-10 w-56 md:w-72 drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)]"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="relative z-40 w-full px-6 pb-10 max-w-lg mx-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)' }}>
          <AnimatePresence mode="wait">
            {/* STEP 0: Intro */}
            {wizardStep === 0 && (
              <motion.div
                key="intro"
                initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 mb-4">
                  <ScrollText className="w-4 h-4 text-yellow-300" />
                  <span className="text-white/80 text-xs font-bold uppercase tracking-widest">Full-Length Paper</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter italic mb-4">
                  Test Your<br />Knowledge
                </h1>
                <p className="text-white/60 text-base md:text-lg mb-10 font-medium leading-relaxed max-w-sm mx-auto">
                  Attempt a complete timed exam covering an entire subject. Track your progress and dominate the leaderboard.
                </p>

                {user ? (
                  <Button
                    onClick={() => setWizardStep(1)}
                    className="w-full max-w-xs mx-auto h-16 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-lg font-black shadow-2xl"
                  >
                    <span className="flex items-center gap-2">Get Started <ArrowRight className="h-5 w-5" /></span>
                  </Button>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Crown className="w-12 h-12 text-yellow-400 animate-pulse" />
                    <p className="text-white/70 text-sm">Sign in to access Full-Length Papers</p>
                    <div className="flex gap-3 w-full max-w-xs">
                      <Button onClick={() => setShowUpgradeModal(true)} className="flex-1 h-14 rounded-2xl bg-white text-slate-900 font-black text-xs tracking-widest shadow-2xl">
                        <Crown className="mr-2 h-4 w-4" /> Upgrade
                      </Button>
                      <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex-1 h-14 rounded-2xl border-white/30 text-white hover:bg-white/10 font-bold text-xs tracking-widest">
                        Dashboard
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 1: MCQ Count */}
            {wizardStep === 1 && (
              <motion.div
                key="mcq-count"
                initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
                className="text-center"
              >
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic mb-2">How Many MCQs?</h2>
                <p className="text-white/50 text-sm mb-8 uppercase tracking-widest font-bold">Choose your challenge</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[100, 50, 30].map((count) => (
                    <motion.button
                      key={count}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedMcqCount(count)}
                      className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${
                        selectedMcqCount === count
                          ? "border-yellow-400 bg-white/20 shadow-lg shadow-yellow-400/20 scale-105"
                          : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                      }`}
                    >
                      <span className={`text-4xl font-black ${selectedMcqCount === count ? "text-yellow-300" : "text-white/80"}`}>{count}</span>
                      <span className={`text-[10px] mt-1 font-bold uppercase tracking-widest ${selectedMcqCount === count ? "text-yellow-300/80" : "text-white/40"}`}>MCQs</span>
                    </motion.button>
                  ))}
                </div>

                <AnimatePresence>
                  {selectedMcqCount && (
                    <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-white/60 text-sm mb-6">
                      Duration: <span className="font-bold text-yellow-300">{formatTime(selectedMcqCount)}</span>
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button
                  onClick={() => setWizardStep(2)}
                  disabled={selectedMcqCount === null}
                  className="w-full max-w-xs mx-auto h-16 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-lg font-black shadow-2xl disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">Choose Subject <ArrowRight className="h-5 w-5" /></span>
                </Button>
              </motion.div>
            )}

            {/* STEP 2: Subject */}
            {wizardStep === 2 && (
              <motion.div
                key="subject"
                initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -40, opacity: 0 }}
                className="text-center"
              >
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter italic mb-2">Pick a Subject</h2>
                <p className="text-white/50 text-sm mb-6 uppercase tracking-widest font-bold">
                  {selectedMcqCount} MCQs · {formatTime(selectedMcqCount!)}
                </p>

                {loadingSubjects ? (
                  <div className="py-8">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-white/60" />
                    <p className="text-white/40 mt-3 text-sm">Loading subjects...</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <p className="text-white/50 py-8">No subjects found for your year.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 mb-6 max-h-[30vh] overflow-y-auto pr-1">
                    {subjects.map((subj) => {
                      const isActive = selectedSubject === subj.id;
                      return (
                        <motion.button
                          key={subj.id}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setSelectedSubject(subj.id)}
                          className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 ${
                            isActive
                              ? "border-yellow-400 bg-white/20 shadow-lg shadow-yellow-400/20"
                              : "border-white/15 bg-white/5 hover:border-white/30 hover:bg-white/10"
                          }`}
                        >
                          <span className="text-2xl mb-1">{subj.icon || "📘"}</span>
                          <span className={`font-bold text-sm ${isActive ? "text-yellow-300" : "text-white/80"}`}>{subj.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                <Button
                  onClick={handleStartTest}
                  disabled={!selectedSubject}
                  className="w-full max-w-xs mx-auto h-16 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-lg font-black shadow-2xl disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">
                    <Zap className="h-5 w-5" /> Start Test <Sparkles className="h-4 w-4 fill-slate-900" />
                  </span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step dots */}
          {user && (
            <div className="flex justify-center gap-3 mt-8">
              {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
                <div key={idx} className={`h-2 w-10 rounded-full transition-all duration-300 ${idx === wizardStep ? "bg-white" : "bg-white/20"}`} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FLP;
