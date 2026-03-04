// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Crown, ArrowLeft, ScrollText, Shield } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import UpgradeAccountModal from "@/components/UpgradeAccountModal";
import FlpSettings from "@/components/FLPs/FlpSettings";
import FlpTestPage from "@/components/FLPs/FlpTestPage";
import { motion } from "framer-motion";

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
  chapter_id: string;
}

const FLP = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedMcqCount, setSelectedMcqCount] = useState<number | null>(null);
  const [isFetchingMcqs, setIsFetchingMcqs] = useState(false);
  const [fetchedMcqs, setFetchedMcqs] = useState<MCQ[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedSubjectName, setSelectedSubjectName] = useState('');

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleStartTest = async (subjectId: string) => {
    if (!user) { toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" }); navigate("/login"); return; }
    if (selectedMcqCount === null) { toast({ title: "Selection Required", description: "Please select MCQ count.", variant: "destructive" }); return; }
    if (!subjectId) { toast({ title: "Selection Required", description: "Please select a subject.", variant: "destructive" }); return; }

    setIsFetchingMcqs(true);
    try {
      // Get subject name
      const { data: subjectData } = await supabase.from("subjects").select("name").eq("id", subjectId).single();
      if (subjectData) setSelectedSubjectName(subjectData.name);
      const { data: chapters, error: chaptersError } = await supabase.from("chapters").select("id").eq("subject_id", subjectId);
      if (chaptersError) throw chaptersError;
      const chapterIds = (chapters || []).map((c) => c.id);
      if (chapterIds.length === 0) { toast({ title: "No Questions", description: "No chapters found.", variant: "warning" }); setIsFetchingMcqs(false); return; }

      const { data: mcqsData, error: mcqsError } = await supabase.from("mcqs").select("*").in("chapter_id", chapterIds);
      if (mcqsError) throw mcqsError;
      if (!mcqsData || mcqsData.length === 0) { toast({ title: "No MCQs Found", description: "No questions yet.", variant: "warning" }); setIsFetchingMcqs(false); return; }

      const shuffled = shuffleArray(mcqsData as MCQ[]);
      if (shuffled.length < selectedMcqCount) { toast({ title: "Not Enough Questions", description: `Only ${shuffled.length} MCQs found.`, variant: "warning" }); setIsFetchingMcqs(false); return; }

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
  };

  if (showQuiz && fetchedMcqs.length > 0) return <FlpTestPage mcqs={fetchedMcqs} onFinish={handleFLPQuizFinish} subjectName={selectedSubjectName} />;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-32 h-32 object-contain animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
      <Seo title="Full-Length Papers (FLP)" description="Attempt full-length papers on Medmacs App." canonical="https://medmacs.app/flp" />

      <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110" onClick={() => window.history.back()}><ArrowLeft className="h-5 w-5 text-primary" /></Button>
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-8 h-8" />
            <span className="text-xl font-bold">Full-Length Paper</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-3xl pt-[calc(env(safe-area-inset-top))] pb-12">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="relative overflow-hidden border-none bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-2xl rounded-[2.5rem] p-2">
            {/* Pattern */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`,
              maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
            }} />

            <div className="relative z-10 text-center pt-10 pb-4 px-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-40 rounded-full" />
                  <div className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                    <ScrollText className="w-8 h-8 text-yellow-300" />
                  </div>
                </div>
              </div>
              <h1 className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">Full-Length Paper</h1>
              <div className="h-1.5 w-12 bg-yellow-400 rounded-full mx-auto mt-2 shadow-lg" />
              <p className="text-white/70 text-sm mt-3 font-medium uppercase tracking-[0.15em]">Test your knowledge with a timed exam</p>
            </div>

            <div className="relative z-10 px-2 pb-2">
              <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 shadow-inner">
                {user ? (
                  <FlpSettings
                    selectedMcqCount={selectedMcqCount}
                    setSelectedMcqCount={setSelectedMcqCount}
                    isFetchingMcqs={isFetchingMcqs}
                    onStartTest={handleStartTest}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Crown className="w-16 h-16 mx-auto text-yellow-400 mb-6 animate-pulse" />
                    <h3 className="text-2xl font-black text-white mb-3 uppercase">Unlock Full-Length Papers!</h3>
                    <p className="text-white/70 mb-6 max-w-sm mx-auto text-sm">
                      Full-Length Papers are an exclusive feature for Premium users.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <Button onClick={() => setShowUpgradeModal(true)} className="bg-white text-slate-900 hover:scale-105 transition-all rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl">
                        <Crown className="mr-2 h-5 w-5" /> Upgrade Now
                      </Button>
                      <Button onClick={() => navigate("/dashboard")} variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-2xl h-14 uppercase font-bold text-xs tracking-widest">
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      <UpgradeAccountModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgradeClick={() => { setShowUpgradeModal(false); navigate("/pricing"); }} />
    </div>
  );
};

export default FLP;
