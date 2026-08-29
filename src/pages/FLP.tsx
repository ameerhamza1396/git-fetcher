import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, ArrowRight, ScrollText, Zap, Loader2, ChevronLeft, Sparkles, RotateCcw, History } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Seo from "@/components/Seo";
import UpgradeAccountModal from "@/components/UpgradeAccountModal";
import { motion, AnimatePresence } from "framer-motion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fetchMCQsBySubject, fetchSubjects } from "@/utils/mcqData";
import { CollaborateModal } from "@/components/CollaborateModal";
import { supabase } from "@/integrations/supabase/client";

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
  year?: string;
  icon?: string;
  color?: string;
  institutes?: string[] | null;
}

interface FLPSessionData {
  shuffledMcqs: any[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string | null>;
  totalTimeLeft: number;
  subjectName?: string;
  savedAt: number;
}

const FLP_STORAGE_KEY = 'flp_session';

const FLP = () => {
  const { user, loading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0); // 0=intro, 1=mcq count, 2=subject
  const [selectedMcqCount, setSelectedMcqCount] = useState<number | null>(null);
  const [isFetchingMcqs, setIsFetchingMcqs] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedSubjectName, setSelectedSubjectName] = useState('');

  // Subject loading
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showCollaborateModal, setShowCollaborateModal] = useState(false);

  const [savedSession, setSavedSession] = useState<FLPSessionData | null>(null);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // DB Config State
  const [bypassSubject, setBypassSubject] = useState(false);
  const [customMcqCounts, setCustomMcqCounts] = useState<number[]>([100, 50, 30]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Fetch FLP configuration based on user's institute
  useEffect(() => {
    if (!user) return;
    const fetchFlpConfig = async () => {
      setLoadingConfig(true);
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('institute')
          .eq('id', user.id)
          .maybeSingle();
        
        if (profile?.institute) {
          const { data: inst } = await supabase
            .from('institutes')
            .select('flp_config')
            .eq('code', profile.institute)
            .maybeSingle();
            
          if (inst?.flp_config) {
            const config = inst.flp_config as any;
            if (typeof config.bypass_subject === 'boolean') {
              setBypassSubject(config.bypass_subject);
            }
            if (Array.isArray(config.mcq_counts) && config.mcq_counts.length > 0) {
              setCustomMcqCounts(config.mcq_counts);
            }
          }
        }
      } catch (err) {
        console.error("Error loading FLP config", err);
      } finally {
        setLoadingConfig(false);
      }
    };
    fetchFlpConfig();
  }, [user]);

  useEffect(() => {
    if (user && wizardStep === 0) {
      try {
        const saved = localStorage.getItem(FLP_STORAGE_KEY);
        if (saved) {
          const sessionData: FLPSessionData = JSON.parse(saved);
          const hoursSinceSaved = (Date.now() - sessionData.savedAt) / (1000 * 60 * 60);
          if (hoursSinceSaved < 24) {
            setSavedSession(sessionData);
            setShowResumeDialog(true);
          } else {
            localStorage.removeItem(FLP_STORAGE_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to load FLP session", e);
        localStorage.removeItem(FLP_STORAGE_KEY);
      }
    }
  }, [user, wizardStep]);

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
    if (wizardStep !== 2 || !user || bypassSubject) return;
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      try {
        setSubjects(await fetchSubjects());
      } catch { setSubjects([]); }
      finally { setLoadingSubjects(false); }
    };
    loadSubjects();
  }, [wizardStep, user, bypassSubject]);

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

  const handleResumeSession = () => {
    if (!savedSession) return;
    setShowResumeDialog(false);
    navigate('/flp/test');
  };

  const handleStartFresh = () => {
    try {
      localStorage.removeItem(FLP_STORAGE_KEY);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    setSavedSession(null);
    setShowResumeDialog(false);
    setWizardStep(1);
  };

  const handleStartTest = async () => {
    if (!user || selectedMcqCount === null) return;
    if (!bypassSubject && !selectedSubject) return;
    setIsFetchingMcqs(true);
    try {
      // Check limits and register session in database first
      const { data: sessionResult, error: sessionError } = await supabase.rpc(
        'initialize_flp_session',
        {
          p_subject_id: selectedSubject || null,
          p_mcq_count: selectedMcqCount,
          p_test_config_id: 'flp_weekly_test_id',
        }
      );

      if (sessionError) throw sessionError;

      const result = sessionResult as { allowed: boolean; error?: string; session_id?: string; resumed?: boolean } | null;
      if (result && !result.allowed) {
        toast({
          title: "Limit Reached",
          description: result.error || "You have reached your daily/monthly limit for Full-Length Papers.",
          variant: "destructive",
        });
        setShowUpgradeModal(true);
        setIsFetchingMcqs(false);
        return;
      }

      let mcqsData: MCQ[] = [];
      let subjectName = '';

      if (bypassSubject) {
        subjectName = 'All Subjects';
        const subjectsList = await fetchSubjects();
        if (subjectsList && subjectsList.length > 0) {
          const allMcqsPromises = subjectsList.map(subj => fetchMCQsBySubject(subj.id));
          const mcqsBySubjectArrays = await Promise.all(allMcqsPromises);
          mcqsData = mcqsBySubjectArrays.flat();
        }
      } else {
        const selectedSubjectRecord = subjects.find(subject => subject.id === selectedSubject);
        subjectName = selectedSubjectRecord?.name || '';
        mcqsData = await fetchMCQsBySubject(selectedSubject!);
      }

      if (!mcqsData || mcqsData.length === 0) { toast({ title: "No MCQs Found" }); setIsFetchingMcqs(false); return; }
      const shuffled = shuffleArray(mcqsData as MCQ[]);
      if (shuffled.length < selectedMcqCount) { toast({ title: "Not Enough Questions", description: `Only ${shuffled.length} available.` }); setIsFetchingMcqs(false); return; }
      const selectedMcqs = shuffled.slice(0, selectedMcqCount);
      navigate('/flp/test', { state: { mcqs: selectedMcqs, subjectName, sessionId: result?.session_id } });
    } catch (err) {
      toast({ title: "Error", description: (err as any)?.message || "Failed to prepare test.", variant: "destructive" });
    } finally { setIsFetchingMcqs(false); }
  };

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-32 h-32 object-contain animate-pulse" />
      </div>
    );
  }

  const TOTAL_STEPS = user ? (bypassSubject ? 2 : 3) : 1;

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-white dark:bg-slate-950 text-slate-950 dark:text-white">
      <Seo title="Full-Length Papers (FLP)" description="Attempt full-length papers on Medmacs App." canonical="https://medmacs.app/flp" />
      <UpgradeAccountModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgradeClick={() => { setShowUpgradeModal(false); navigate("/pricing"); }} />

      <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <AlertDialogContent className="rounded-[2.5rem] p-8 border-border/40 bg-background/80 dark:bg-slate-900/90 backdrop-blur-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black italic tracking-tight text-slate-950 dark:text-white">Resume <span className="text-teal-500">Session?</span></AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium py-2">
              You have an unfinished test session. Would you like to continue where you left off?
            </AlertDialogDescription>
            {savedSession && (
              <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  <span className="font-bold">{savedSession.shuffledMcqs.length}</span> MCQs - {savedSession.subjectName || 'Subject'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Question {savedSession.currentQuestionIndex + 1} of {savedSession.shuffledMcqs.length} |
                  Time remaining: {Math.floor(savedSession.totalTimeLeft / 60)}:{String(savedSession.totalTimeLeft % 60).padStart(2, '0')}
                </p>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 sm:gap-3 mt-4">
            <AlertDialogCancel onClick={handleStartFresh} className="flex-1 rounded-2xl h-12 font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-transparent uppercase text-xs tracking-widest">
              <RotateCcw className="w-4 h-4 mr-2" /> Start Fresh
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleResumeSession} className="flex-1 rounded-2xl h-12 font-black bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] text-white shadow-lg shadow-[#0ea5e9]/20 uppercase text-xs tracking-widest">
              <ArrowRight className="w-4 h-4 mr-2" /> Resume
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fetching overlay */}
      <AnimatePresence>
        {isFetchingMcqs && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl"
          >
            <motion.img
              src="/mascots/Mascot1.png" alt="Mascot"
              className="w-40 h-40 object-contain mb-6"
              animate={{ y: [0, -12, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            <Loader2 className="h-10 w-10 animate-spin text-[#2dd4bf] mb-4" />
            <p className="text-white/80 text-lg font-semibold text-center px-8">{fetchMessages[msgIdx]}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main
        className="relative z-10 mx-auto flex h-full w-full max-w-md flex-col px-5 pt-[max(18px,env(safe-area-inset-top))]"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
      >
        <header className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <span className="font-['Syne'] text-lg font-extrabold tracking-[-.045em]">
              <span className="bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] bg-clip-text text-transparent">Medmacs</span>
              <span className="text-slate-950 dark:text-white">.app</span>
            </span>
          </div>
          {wizardStep > 0 && (
            <button
              onClick={() => {
                setWizardStep(w => w - 1);
                setSelectedSubject(null);
              }}
              className="cursor-pointer rounded-full px-3 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 transition-colors hover:text-slate-950 dark:hover:text-white flex items-center gap-0.5"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          <motion.section
            key={wizardStep}
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -28 }}
            transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex min-h-0 flex-1 flex-col"
          >
            {/* STEP 0: Intro */}
            {wizardStep === 0 && (
              <div className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                <div className="mx-auto max-w-sm px-2 pt-7 text-center">
                  <motion.h1
                    initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    className="font-['Syne'] text-[clamp(1.7rem,6.4vw,2.2rem)] font-extrabold leading-[1.02] tracking-[-.05em] text-slate-950 dark:text-white"
                  >
                    Full-Length Papers
                  </motion.h1>
                  <motion.p
                    initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400"
                  >
                    Attempt complete timed exams covering your year's material. Analyze performance and study smarter.
                  </motion.p>
                </div>

                <div className="relative mx-auto mt-2 min-h-0 w-full max-w-sm flex-1 overflow-hidden flex items-center justify-center">
                  <img
                    src="/mascots/Mascot1.png"
                    alt="Dr Ahroid Intro"
                    className="h-56 w-auto object-contain drop-shadow-2xl animate-[float_4s_ease-in-out_infinite]"
                  />
                </div>

                {user ? (
                  <div className="mt-auto w-full flex flex-col gap-3">
                    <button
                      onClick={() => navigate('/flp-result')}
                      className="w-full cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <History className="w-4 h-4 text-slate-500" /> View Past Attempts
                    </button>
                    <button
                      onClick={() => setWizardStep(1)}
                      className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] px-10 py-4 text-base font-extrabold text-white shadow-[0_12px_32px_rgba(14,165,233,.25)] transition-transform hover:scale-[1.01] active:scale-95 focus-visible:outline-none"
                    >
                      Get Started
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto w-full flex flex-col gap-3">
                    <button
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full py-4 bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform"
                    >
                      Upgrade Plan
                    </button>
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-4 text-sm font-semibold text-slate-950 dark:text-white shadow-sm transition-transform active:scale-95"
                    >
                      Dashboard
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 1: MCQ Count */}
            {wizardStep === 1 && (
              <div className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                <div className="mx-auto max-w-sm px-2 pt-7 text-center">
                  <h1 className="font-['Syne'] text-[clamp(1.7rem,6.4vw,2.2rem)] font-extrabold leading-[1.02] tracking-[-.05em] text-slate-950 dark:text-white">
                    How Many MCQs?
                  </h1>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Choose the size of your mock test to configure duration.
                  </p>
                </div>

                <div className="relative mx-auto mt-2 min-h-0 w-full max-w-sm flex-1 overflow-hidden flex flex-col items-center justify-end pb-4">
                  <div className={`grid ${customMcqCounts.length === 1 ? 'grid-cols-1 max-w-[150px]' : customMcqCounts.length === 2 ? 'grid-cols-2 w-full max-w-xs' : 'grid-cols-3 w-full'} gap-3 mb-6`}>
                    {customMcqCounts.map((count) => {
                      const isSelected = selectedMcqCount === count;
                      return (
                        <motion.button
                          key={count}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedMcqCount(count)}
                          className={`flex flex-col items-center justify-center py-5 rounded-2xl border transition-all ${
                            isSelected
                              ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 font-extrabold shadow-sm scale-105"
                              : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900"
                          }`}
                        >
                          <span className="text-3xl font-black">{count}</span>
                          <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">MCQs</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {selectedMcqCount && (
                      <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-slate-500 dark:text-slate-400 text-sm">
                        Duration: <span className="font-bold text-teal-500">{formatTime(selectedMcqCount)}</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={bypassSubject ? () => handleStartTest() : () => setWizardStep(2)}
                  disabled={selectedMcqCount === null}
                  className="mt-auto w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] px-10 py-4 text-base font-extrabold text-white shadow-[0_12px_32px_rgba(14,165,233,.25)] transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {bypassSubject ? "Start Test" : "Choose Subject"}
                </button>
              </div>
            )}

            {/* STEP 2: Subject */}
            {wizardStep === 2 && !bypassSubject && (
              <div className="relative flex min-w-0 flex-1 flex-col items-center text-center">
                <div className="mx-auto max-w-sm px-2 pt-7 text-center">
                  <h1 className="font-['Syne'] text-[clamp(1.7rem,6.4vw,2.2rem)] font-extrabold leading-[1.02] tracking-[-.05em] text-slate-950 dark:text-white">
                    Pick a Subject
                  </h1>
                  <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {selectedMcqCount} MCQs · {formatTime(selectedMcqCount!)}
                  </p>
                </div>

                <div className="relative mx-auto mt-2 min-h-0 w-full max-w-sm flex-1 overflow-hidden flex flex-col justify-end pb-4">
                  {loadingSubjects ? (
                    <div className="py-8">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-teal-500" />
                      <p className="text-slate-400 mt-3 text-sm">Loading subjects...</p>
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <p className="text-slate-800 dark:text-slate-200 text-sm font-bold">We are not fully available in your institute yet.</p>
                      <p className="text-slate-400 mt-2 mb-4 text-xs">Help us bring Medmacs to your campus.</p>
                      <div className="flex flex-col gap-2 max-w-xs mx-auto">
                        <Button onClick={() => setShowCollaborateModal(true)} variant="outline" className="border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl">
                          Request campus collaboration
                        </Button>
                      </div>
                      <CollaborateModal open={showCollaborateModal} onOpenChange={setShowCollaborateModal} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 my-4 max-h-[30vh] overflow-y-auto pr-1">
                      {subjects.map((subj) => {
                        const isActive = selectedSubject === subj.id;
                        return (
                          <motion.button
                            key={subj.id}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => setSelectedSubject(subj.id)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${
                              isActive
                                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 font-extrabold shadow-sm scale-105"
                                : "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900"
                            }`}
                          >
                            <span className="text-2xl mb-1">{subj.icon || "📘"}</span>
                            <span className="font-bold text-xs truncate max-w-full">{subj.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStartTest}
                  disabled={!selectedSubject}
                  className="mt-auto w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] px-10 py-4 text-base font-extrabold text-white shadow-[0_12px_32px_rgba(14,165,233,.25)] transition-transform hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Start Test
                </button>
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        {/* Step dots */}
        {user && (
          <div className="flex justify-center gap-2.5 mt-4">
            {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (idx <= wizardStep) {
                    setWizardStep(idx);
                    if (idx < 2) setSelectedSubject(null);
                  }
                }}
                className={`cursor-pointer rounded-full transition-all duration-300 ${
                  idx === wizardStep
                    ? "h-3.5 w-3.5 bg-teal-500"
                    : idx < wizardStep
                      ? "h-2.5 w-2.5 bg-teal-300 hover:bg-teal-400"
                      : "h-2.5 w-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
                }`}
              />
            ))}
          </div>
        )}
      </main>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
};

export default FLP;
