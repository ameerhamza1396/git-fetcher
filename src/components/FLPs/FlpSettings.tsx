// src/components/FlpSettings.tsx
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

const FlpSettings: React.FC<FlpSettingsProps> = ({
    selectedMcqCount,
    setSelectedMcqCount,
    isFetchingMcqs,
    onStartTest,
}) => {
    const { user } = useAuth();

    const [step, setStep] = useState<"mcq" | "subject">("mcq");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    // rotating loading messages
    const messages = [
        "Hold tight, we are preparing the test for you.",
        "This will only take a few moments...",
        "Just a little longer!",
        "Almost there, stay ready!",
        "Just a moment",
        "Its taking longer than expected, hang tight!",
        "Nearly done, preparing your questions!",
        "Just a sec, fetching the best questions for you!",
        "Almost ready, setting things up!",
        "Still working on it, please wait!",
    ];
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        if (isFetchingMcqs) {
            const interval = setInterval(() => {
                setMessageIndex((prev) => (prev + 1) % messages.length);
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [isFetchingMcqs]);

    const formatTime = (count: number) => {
        if (count === 100) return "2 hours";
        if (count === 50) return "1 hour";
        if (count === 30) return "45 minutes";
        return `${count} minutes`;
    };

    // fetch subjects filtered by profiles.year when moving to subject step
    useEffect(() => {
        const fetchSubjectsForUserYear = async () => {
            console.log("Starting to fetch subjects for user year...");
            setLoadingSubjects(true);
            try {
                if (!user) {
                    console.warn("User not logged in, cannot fetch subjects.");
                    setSubjects([]);
                    setLoadingSubjects(false);
                    return;
                }

                console.log("Fetching user profile to determine academic year...");
                // get profile.year
                const { data: profile, error: profileError } = await supabase
                    .from("profiles")
                    .select("year")
                    .eq("id", user.id)
                    .maybeSingle();

                if (profileError) {
                    console.error("Error fetching profile:", profileError.message);
                    throw profileError;
                }

                const userYear = profile?.year;
                console.log("User year fetched:", userYear);

                if (userYear === undefined || userYear === null) {
                    console.warn("User year is not defined. No subjects to fetch.");
                    setSubjects([]);
                    setLoadingSubjects(false);
                    return;
                }

                console.log(`Fetching subjects for year: ${userYear}`);
                // fetch subjects for the user's year
                const { data: subjectsData, error: subjectsError } = await supabase
                    .from("subjects")
                    .select("id, name, year, icon, color")
                    .eq("year", userYear);

                if (subjectsError) {
                    console.error("Error fetching subjects:", subjectsError.message);
                    throw subjectsError;
                }

                setSubjects(subjectsData || []);
                console.log("Subjects fetched successfully:", subjectsData);
            } catch (err) {
                console.error("Error fetching subjects by year:", err);
                setSubjects([]);
            } finally {
                setLoadingSubjects(false);
            }
        };

        if (step === "subject") {
            fetchSubjectsForUserYear();
        }
    }, [step, user]);

    // This is a hypothetical location for the `onStartTest` logic,
    // as it's passed as a prop from the parent component.
    const handleStartTestClick = async (subjectId: string) => {
        console.log(`User wants to start a test with ${selectedMcqCount} MCQs from subject ID: ${subjectId}`);
        // Log before the parent function is called
        onStartTest(subjectId);
        // The parent component should have the actual fetching logic.
        // For example, in the parent component:
        // const handleStartTest = async (subjectId) => {
        //   setIsFetchingMcqs(true);
        //   console.log(`Parent component: Fetching ${selectedMcqCount} MCQs for subject ID ${subjectId}...`);
        //   try {
        //     const { data, error } = await supabase
        //       .from('mcqs')
        //       .select('*')
        //       .eq('subject_id', subjectId)
        //       .limit(selectedMcqCount);
        //
        //     if (error) {
        //       console.error("Supabase fetch error:", error.message);
        //       throw error;
        //     }
        //
        //     console.log(`Successfully fetched ${data.length} MCQs.`);
        //     setMcqs(data);
        //   } catch (error) {
        //     console.error("Failed to fetch MCQs:", error.message);
        //   } finally {
        //     setIsFetchingMcqs(false);
        //   }
        // };
    };

    // immersive preparing screen
    if (isFetchingMcqs) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                    {messages[messageIndex]}
                </h3>
            </div>
        );
    }

    return (
        <div className="text-center">
            {/* Step 1: Select MCQ Count */}
            {step === "mcq" && (
                <>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        Select Number of MCQs
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[100, 50, 30].map((count) => (
                            <button
                                key={count}
                                onClick={() => setSelectedMcqCount(count)}
                                className={`
                    flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all duration-300
                    ${selectedMcqCount === count
                                        ? "border-purple-600 bg-gradient-to-br from-purple-100 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/20 shadow-md transform scale-105"
                                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-sm"
                                    }
                `}
                            >
                                <span
                                    className={`text-3xl font-bold ${selectedMcqCount === count
                                        ? "text-purple-700 dark:text-purple-300"
                                        : "text-gray-800 dark:text-gray-200"
                                        }`}
                                >
                                    {count}
                                </span>
                                <span
                                    className={`text-sm mt-1 ${selectedMcqCount === count
                                        ? "text-purple-600 dark:text-purple-400"
                                        : "text-gray-600 dark:text-gray-400"
                                        }`}
                                >
                                    MCQs
                                </span>
                            </button>
                        ))}
                    </div>

                    {selectedMcqCount && (
                        <p className="mt-6 text-md text-gray-700 dark:text-gray-300 font-medium">
                            You will have approximately{" "}
                            <span className="font-bold text-purple-600 dark:text-pink-400">
                                {formatTime(selectedMcqCount)}
                            </span>{" "}
                            to complete this test.
                        </p>
                    )}

                    <div className="text-center pt-4">
                        <Button
                            onClick={() => setStep("subject")}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                            disabled={selectedMcqCount === null}
                        >
                            <ArrowRight className="mr-2 h-5 w-5" />
                            Confirm & Choose Subject
                        </Button>
                    </div>
                </>
            )}

            {/* Step 2: Select Subject */}
            {step === "subject" && (
                <>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        Select Subject
                    </h3>

                    {loadingSubjects ? (
                        <div className="py-8">
                            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-600" />
                            <p className="text-gray-600 dark:text-gray-400 mt-3">
                                Loading subjects...
                            </p>
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600 dark:text-gray-400 mb-4">
                                No subjects found for your profile year. Please contact admin or
                                check your profile.
                            </p>
                            <div className="flex justify-center gap-4">
                                <Button variant="outline" onClick={() => setStep("mcq")}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {subjects.map((subj) => {
                                    const isActive = selectedSubject === subj.id;

                                    return (
                                        <motion.button
                                            key={subj.id}
                                            onClick={() => setSelectedSubject(subj.id)}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.97 }}
                                            className={`
                        flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 shadow-sm
                        ${isActive
                                                    ? "ring-2 ring-offset-2 border-purple-600 bg-gradient-to-br from-purple-100 to-pink-50 dark:from-purple-900/50 dark:to-pink-900/20"
                                                    : "hover:shadow-md bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                                }
                    `}
                                        >
                                            <span className="text-3xl mb-2">{subj.icon || "📘"}</span>
                                            <span
                                                className={`font-semibold ${isActive
                                                    ? "text-purple-700 dark:text-purple-300"
                                                    : "text-gray-800 dark:text-gray-200"
                                                    }`}
                                            >
                                                {subj.name}
                                            </span>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between pt-6">
                                <Button
                                    onClick={() => {
                                        setSelectedSubject(null);
                                        setStep("mcq");
                                    }}
                                    variant="outline"
                                    className="flex items-center"
                                >
                                    <ArrowLeft className="mr-2 h-5 w-5" />
                                    Back
                                </Button>

                                <Button
                                    onClick={() =>
                                        handleStartTestClick(selectedSubject!)
                                    }
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
                                    disabled={!selectedSubject}
                                >
                                    <Zap className="mr-2 h-5 w-5" />
                                    Start Test
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