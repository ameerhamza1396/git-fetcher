import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Seo from "@/components/Seo";
import UpgradeAccountModal from "@/components/UpgradeAccountModal";
import FlpSettings from "@/components/FLPs/FlpSettings";
import FlpTestPage from "@/components/FLPs/FlpTestPage";

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

    // shuffle helper
    const shuffleArray = <T,>(array: T[]): T[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // handleStartTest receives subjectId from FlpSettings
    const handleStartTest = async (subjectId: string) => {
        if (!user) {
            toast({
                title: "Authentication Required",
                description: "Please log in to start the test.",
                variant: "destructive",
            });
            navigate("/login");
            return;
        }

        if (selectedMcqCount === null) {
            toast({
                title: "Selection Required",
                description: "Please select the number of MCQs to attempt.",
                variant: "destructive",
            });
            return;
        }

        if (!subjectId) {
            toast({
                title: "Selection Required",
                description: "Please select a subject.",
                variant: "destructive",
            });
            return;
        }

        setIsFetchingMcqs(true);

        try {
            // get all chapter ids for the chosen subject
            const { data: chapters, error: chaptersError } = await supabase
                .from("chapters")
                .select("id")
                .eq("subject_id", subjectId);

            if (chaptersError) throw chaptersError;

            const chapterIds: string[] = (chapters || []).map((c: any) => c.id);
            if (chapterIds.length === 0) {
                toast({
                    title: "No Questions",
                    description: "This subject has no chapters/questions yet.",
                    variant: "warning",
                });
                setIsFetchingMcqs(false);
                return;
            }

            // fetch mcqs for those chapter ids
            const { data: mcqsData, error: mcqsError } = await supabase
                .from("mcqs")
                .select("*")
                .in("chapter_id", chapterIds);

            if (mcqsError) throw mcqsError;

            if (!mcqsData || mcqsData.length === 0) {
                toast({
                    title: "No MCQs Found",
                    description: "This subject does not have any questions yet.",
                    variant: "warning",
                });
                setIsFetchingMcqs(false);
                return;
            }

            // shuffle and slice to match selectedMcqCount
            const shuffled = shuffleArray(mcqsData as MCQ[]);
            if (shuffled.length < selectedMcqCount) {
                toast({
                    title: "Not Enough Questions",
                    description: `Only ${shuffled.length} MCQs found in this subject. Please choose fewer MCQs or another subject.`,
                    variant: "warning",
                });
                setIsFetchingMcqs(false);
                return;
            }

            const finalMcqs = shuffled.slice(0, selectedMcqCount);
            setFetchedMcqs(finalMcqs);
            setShowQuiz(true);
        } catch (err: any) {
            console.error("Error preparing test:", err);
            toast({
                title: "Error",
                description: err?.message || "Failed to prepare test.",
                variant: "destructive",
            });
        } finally {
            setIsFetchingMcqs(false);
        }
    };

    const handleFLPQuizFinish = (score: number, totalQuestions: number) => {
        setShowQuiz(false);
        toast({
            title: "FLP Quiz Finished!",
            description: `You scored ${score} out of ${totalQuestions}.`,
            duration: 5000,
        });
        setFetchedMcqs([]);
        setSelectedMcqCount(null);
    };

    if (showQuiz && fetchedMcqs.length > 0) {
        return <FlpTestPage mcqs={fetchedMcqs} onFinish={handleFLPQuizFinish} />;
    }

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <img
                    src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                    alt="Loading Medmacs"
                    className="w-32 h-32 object-contain"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center relative">
            <Seo
                title="Full-Length Papers (FLP)"
                description="Attempt full-length papers (FLPs) on Medmacs App to simulate real MDCAT exams and thoroughly assess your preparation."
                canonical="https://medmacs.app/flp"
            />

            <Card className="w-full max-w-2xl bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm shadow-xl">
                <CardHeader className="text-center pb-6">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Full-Length Paper (FLP)
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Test your knowledge across all subjects with a timed exam.
                    </p>
                </CardHeader>
                <CardContent className="space-y-6">
                    {user ? (
                        <FlpSettings
                            selectedMcqCount={selectedMcqCount}
                            setSelectedMcqCount={setSelectedMcqCount}
                            isFetchingMcqs={isFetchingMcqs}
                            onStartTest={handleStartTest}
                        />
                    ) : (
                        <div className="text-center py-8">
                            <Crown className="w-16 h-16 mx-auto text-yellow-500 dark:text-yellow-400 mb-6 animate-pulse" />
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                Unlock Full-Length Papers!
                            </h3>
                            <p className="text-gray-700 dark:text-gray-300 mb-6 max-w-sm mx-auto">
                                Full-Length Papers are an exclusive feature for our Premium users. Upgrade
                                your plan to get unlimited access and boost your preparation!
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                                >
                                    <Crown className="mr-2 h-5 w-5" /> Upgrade Now
                                </Button>
                                <Button
                                    onClick={() => navigate("/dashboard")}
                                    variant="outline"
                                    className="border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-800 dark:text-gray-200 font-bold py-3 px-8 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 text-lg"
                                >
                                    Go to Dashboard
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <UpgradeAccountModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                onUpgradeClick={() => {
                    setShowUpgradeModal(false);
                    navigate("/pricing");
                }}
            />
        </div>
    );
};

export default FLP;
