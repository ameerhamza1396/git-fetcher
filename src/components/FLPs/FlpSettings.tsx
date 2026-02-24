// @ts-nocheck
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";

interface FlpSettingsProps {
  selectedMcqCount: number | null;
  setSelectedMcqCount: (count: number | null) => void;
  isFetchingMcqs: boolean;
  onStartTest: (subjectId: string) => void;
}

interface Subject {
  id: string;
  name: string;
  year?: number;
  icon?: string;
  color?: string;
}

const FlpSettings: React.FC<FlpSettingsProps> = ({ selectedMcqCount, setSelectedMcqCount, isFetchingMcqs, onStartTest }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"mcq" | "subject">("mcq");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const messages = [
    "Hold tight, we are preparing the test for you.",
    "This will only take a few moments...",
    "Just a little longer!",
    "Almost there, stay ready!",
    "Nearly done, preparing your questions!",
  ];
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (isFetchingMcqs) {
      const interval = setInterval(() => { setMessageIndex((prev) => (prev + 1) % messages.length); }, 5000);
      return () => clearInterval(interval);
    }
  }, [isFetchingMcqs]);

  const formatTime = (count: number) => {
    if (count === 100) return "2 hours";
    if (count === 50) return "1 hour";
    if (count === 30) return "45 minutes";
    return `${count} minutes`;
  };

  useEffect(() => {
    const fetchSubjectsForUserYear = async () => {
      setLoadingSubjects(true);
      try {
        if (!user) { setSubjects([]); setLoadingSubjects(false); return; }
        const { data: profile, error: profileError } = await supabase.from("profiles").select("year").eq("id", user.id).maybeSingle();
        if (profileError) throw profileError;
        const userYear = profile?.year;
        if (!userYear) { setSubjects([]); setLoadingSubjects(false); return; }
        const { data: subjectsData, error: subjectsError } = await supabase.from("subjects").select("id, name, year, icon, color").eq("year", userYear);
        if (subjectsError) throw subjectsError;
        setSubjects(subjectsData || []);
      } catch (err) { setSubjects([]); }
      finally { setLoadingSubjects(false); }
    };
    if (step === "subject") fetchSubjectsForUserYear();
  }, [step, user]);

  if (isFetchingMcqs) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-12 w-12 animate-spin text-white/80 mb-4" />
        <h3 className="text-lg font-semibold text-white/90 mb-4">{messages[messageIndex]}</h3>
      </div>
    );
  }

  return (
    <div className="text-center">
      {step === "mcq" && (
        <>
          <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">Select MCQs</h3>
          <div className="grid grid-cols-3 gap-3">
            {[100, 50, 30].map((count) => (
              <button
                key={count}
                onClick={() => setSelectedMcqCount(count)}
                className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 ${
                  selectedMcqCount === count
                    ? "border-yellow-400 bg-white/20 shadow-lg shadow-yellow-400/20 scale-105"
                    : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                }`}
              >
                <span className={`text-3xl font-black ${selectedMcqCount === count ? "text-yellow-300" : "text-white/80"}`}>{count}</span>
                <span className={`text-xs mt-1 font-bold uppercase tracking-wider ${selectedMcqCount === count ? "text-yellow-300/80" : "text-white/50"}`}>MCQs</span>
              </button>
            ))}
          </div>

          {selectedMcqCount && (
            <p className="mt-5 text-sm text-white/70 font-medium">
              Duration: <span className="font-bold text-yellow-300">{formatTime(selectedMcqCount)}</span>
            </p>
          )}

          <div className="pt-5">
            <Button
              onClick={() => setStep("subject")}
              className="bg-white text-slate-900 hover:scale-105 transition-all rounded-2xl h-12 uppercase font-black text-xs tracking-widest shadow-2xl px-8"
              disabled={selectedMcqCount === null}
            >
              <ArrowRight className="mr-2 h-4 w-4" /> Choose Subject
            </Button>
          </div>
        </>
      )}

      {step === "subject" && (
        <>
          <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-wider">Select Subject</h3>

          {loadingSubjects ? (
            <div className="py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-white/60" />
              <p className="text-white/50 mt-3 text-sm">Loading subjects...</p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/60 mb-4 text-sm">No subjects found for your year.</p>
              <Button variant="outline" onClick={() => setStep("mcq")} className="border-white/30 text-white hover:bg-white/10 rounded-xl">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map((subj) => {
                  const isActive = selectedSubject === subj.id;
                  return (
                    <motion.button
                      key={subj.id}
                      onClick={() => setSelectedSubject(subj.id)}
                      whileTap={{ scale: 0.97 }}
                      className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all duration-300 ${
                        isActive
                          ? "border-yellow-400 bg-white/20 shadow-lg shadow-yellow-400/20"
                          : "border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-2xl mb-1">{subj.icon || "📘"}</span>
                      <span className={`font-bold text-sm break-words w-full ${isActive ? "text-yellow-300" : "text-white/80"}`}>{subj.name}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-5 gap-3">
                <Button onClick={() => { setSelectedSubject(null); setStep("mcq"); }} variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button onClick={() => onStartTest(selectedSubject!)} className="bg-white text-slate-900 hover:scale-105 transition-all rounded-2xl h-12 uppercase font-black text-xs tracking-widest shadow-2xl px-6" disabled={!selectedSubject}>
                  <Zap className="mr-2 h-4 w-4" /> Start Test
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default FlpSettings;
