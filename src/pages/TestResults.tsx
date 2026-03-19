// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client'; // Reverted to relative path
import { useAuth } from '@/hooks/useAuth'; // Reverted to relative path
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle, XCircle, MinusCircle, History, Trophy, ArrowLeft, Bot, Zap, Brain, FileText, Moon, Sun, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import { Link } from 'react-router-dom';
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown

type Profile = {
    avatar_url: string;
    created_at: string;
    full_name: string;
    id: string;
    medical_school: string;
    updated_at: string;
    username: string;
    year_of_study: number;
    plan?: string;
};

interface TestResultSummary {
    id: string;
    score: number;
    total_questions: number;
    completed_at: string;
}

interface QuestionAttemptDetail {
    id: string;
    question_id: string;
    user_answer: string | null;
    correct_answer: string;
    is_correct: boolean;
    is_skipped: boolean;
    mock_test_questions: {
        question: string;
        option_a: string;
        option_b: string;
        option_c: string;
        option_d: string;
        explanation: string;
    };
}

const MyTestResults = () => {
    const { user } = useAuth();
    const [selectedTestResultId, setSelectedTestResultId] = useState<string | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

    // Get user profile data for plan display
    const { data: profile } = useQuery<Profile | null>({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id
    });

    // Define plan color schemes
    const planColors = {
        'free': {
            light: 'bg-purple-100 text-purple-800 border-purple-300',
            dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
        },
        'premium': {
            light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
        },
        'pro': {
            light: 'bg-green-100 text-green-800 border-green-300',
            dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
        },
        'default': { // Fallback for unknown plans
            light: 'bg-gray-100 text-gray-800 border-gray-300',
            dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
        }
    };

    // Determine the user's plan and its display name
    const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

    // Get the color classes for the current plan
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

    // Fetch all test results for the current user
    const { data: testSummaries, isLoading: isLoadingSummaries, isError: isErrorSummaries, error: summariesError } = useQuery<TestResultSummary[]>({
        queryKey: ['userTestSummaries', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('user_test_results')
                .select('id, score, total_questions, completed_at')
                .eq('user_id', user.id)
                .order('completed_at', { ascending: true }); // Changed to ascending for older entries first
            if (error) throw new Error(error.message);
            return data;
        },
        enabled: !!user?.id,
    });

    // Fetch detailed question attempts for a specific test result
    const { data: questionAttempts, isLoading: isLoadingAttempts, isError: isErrorAttempts, error: attemptsError } = useQuery<QuestionAttemptDetail[]>({
        queryKey: ['detailedQuestionAttempts', selectedTestResultId],
        queryFn: async () => {
            if (!selectedTestResultId) return [];
            const { data, error } = await supabase
                .from('user_question_attempts')
                .select('id, user_answer, correct_answer, is_correct, is_skipped, mock_test_questions(question, option_a, option_b, option_c, option_d, explanation)')
                .eq('test_result_id', selectedTestResultId)
                .order('attempted_at', { ascending: true }); // Order for consistent display

            if (error) throw new Error(error.message);
            return data as QuestionAttemptDetail[]; // Cast to the correct type
        },
        enabled: !!selectedTestResultId && isDetailDialogOpen, // Only fetch when dialog is open and ID is set
    });


    const handleViewDetails = (testId: string) => {
        setSelectedTestResultId(testId);
        setIsDetailDialogOpen(true);
        setOpenAccordionItems([]);
    };

    const handleCloseDetailDialog = () => {
        setIsDetailDialogOpen(false);
        setSelectedTestResultId(null);
        setOpenAccordionItems([]);
    };

    // Function to determine complement message based on score percentage
    const getComplement = (score: number, total: number): { message: string; color: string } => {
        if (total === 0) return { message: "No questions!", color: "text-gray-500" };
        const percentage = (score / total) * 100;
        if (percentage >= 80) return { message: "Excellent!", color: "text-green-600 dark:text-green-400" };
        if (percentage >= 60) return { message: "Good job!", color: "text-blue-600 dark:text-blue-400" };
        return { message: "Keep practicing!", color: "text-yellow-600 dark:text-yellow-400" };
    };

    // Placeholder cards for UI balance
    const renderPlaceholderCards = (count: number) => {
        const placeholders = [];
        for (let i = 0; i < count; i++) {
            placeholders.push(
                <Card key={`placeholder-${i}`} className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400 min-h-[200px]">
                    <FileText className="w-12 h-12 mb-4" />
                    <CardTitle className="text-xl font-semibold mb-2">More Results Coming Soon!</CardTitle>
                    <CardDescription className="text-center">
                        Complete more tests to see your progress here.
                    </CardDescription>
                </Card>
            );
        }
        return placeholders;
    };

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            {/* Header - Copied from AI.tsx */}
            <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">My Test Results</span>
                    </div>

                    <div className="flex items-center space-x-3">
                            {/* NEW: Replaced hardcoded avatar with ProfileDropdown */}
                            <ProfileDropdown />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
                {/* Hero Section for Test Results */}
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        📊 Your Mock Test Performance
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Review your past mock test results and track your progress.
                    </p>
                </div>

                {isLoadingSummaries ? (
                    <div className="flex justify-center items-center h-48 text-gray-600 dark:text-gray-400">
                        Loading your test results...
                    </div>
                ) : isErrorSummaries ? (
                    <div className="flex justify-center items-center h-48 text-red-500">
                        Error fetching test summaries: {summariesError?.message}
                    </div>
                ) : (!testSummaries || testSummaries.length === 0) ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-700 dark:text-gray-300">
                        <History className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600" />
                        <p className="text-xl font-semibold mb-2">No mock test results found yet.</p>
                        <p className="text-lg">Complete a test to see your performance here!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {testSummaries.map((summary) => {
                            const percentage = (summary.score / summary.total_questions) * 100;
                            const complement = getComplement(summary.score, summary.total_questions);
                            return (
                                <Card key={summary.id} className="hover:shadow-lg transition-shadow duration-200 bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800 rounded-lg">
                                    <CardHeader>
                                        <CardTitle className="text-xl text-gray-900 dark:text-white">
                                            Test on {new Date(summary.completed_at).toLocaleDateString('en-PK', {
                                                year: 'numeric', month: 'short', day: 'numeric'
                                            })}
                                        </CardTitle>
                                        <CardDescription className="text-gray-600 dark:text-gray-400">
                                            Completed: {new Date(summary.completed_at).toLocaleTimeString('en-PK')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center">
                                        <p className="text-4xl font-bold mb-1">
                                            <span className="text-purple-600 dark:text-pink-400">{summary.score}</span> / {summary.total_questions}
                                        </p>
                                        <p className={`text-lg font-semibold mb-2 ${complement.color}`}>
                                            {complement.message}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                                            ({percentage.toFixed(1)}%)
                                        </p>
                                        <Button
                                            onClick={() => handleViewDetails(summary.id)}
                                            className="mt-4 w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 rounded-md"
                                        >
                                            View Details
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {/* Render placeholder cards for UI balance */}
                        {renderPlaceholderCards((3 - (testSummaries.length % 3)) % 3)}
                    </div>
                )}

                {/* Detailed Test Results Dialog */}
                <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                    <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-purple-200 dark:border-purple-800 rounded-lg shadow-xl overflow-hidden">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Test Details</DialogTitle>
                            <DialogDescription className="text-gray-700 dark:text-gray-300">
                                Review your answers for this test attempt.
                            </DialogDescription>
                        </DialogHeader>

                        {isLoadingAttempts ? (
                            <div className="flex-grow flex items-center justify-center p-8">
                                Loading detailed results...
                            </div>
                        ) : isErrorAttempts ? (
                            <div className="flex-grow flex items-center justify-center p-8 text-red-500">
                                Error fetching detailed attempts: {attemptsError?.message}
                            </div>
                        ) : (
                            <ScrollArea className="h-[60vh] pr-4">
                                {console.log('Number of question attempts fetched:', questionAttempts?.length)}
                                <div className="space-y-4 py-4">
                                    {questionAttempts && questionAttempts.length > 0 ? (
                                        <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems} className="w-full">
                                            {questionAttempts.map((attempt, index) => {
                                                const statusText = attempt.is_correct ? 'Correct' : attempt.is_skipped ? 'Skipped' : 'Incorrect';
                                                const statusColorClass = attempt.is_correct
                                                    ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
                                                    : attempt.is_skipped
                                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
                                                        : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700';

                                                const options = [
                                                    attempt.mock_test_questions.option_a,
                                                    attempt.mock_test_questions.option_b,
                                                    attempt.mock_test_questions.option_c,
                                                    attempt.mock_test_questions.option_d,
                                                ];

                                                return (
                                                    <AccordionItem value={`item-${index}`} key={attempt.id} className="border rounded-lg shadow-sm mb-2 px-4 bg-gray-50 dark:bg-gray-800 border-purple-100 dark:border-purple-700">
                                                        <AccordionTrigger className="flex justify-between items-center py-3 text-left text-base font-semibold text-gray-900 dark:text-white hover:no-underline">
                                                            <span className="flex-grow">
                                                                Q{index + 1}: {attempt.mock_test_questions.question}
                                                            </span>
                                                            <Badge className={`${statusColorClass} ml-4 py-1 px-3 rounded-full text-xs font-medium`}>
                                                                {statusText}
                                                            </Badge>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pt-2 pb-4 text-gray-700 dark:text-gray-300 border-t border-purple-100 dark:border-purple-700">
                                                            <div className="space-y-3 text-sm">
                                                                <p>
                                                                    <span className="font-semibold">Your Answer: </span>
                                                                    <span className={attempt.is_correct ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                                                        {attempt.user_answer || "N/A (Skipped)"}
                                                                    </span>
                                                                </p>
                                                                <p>
                                                                    <span className="font-semibold">Correct Answer: </span>
                                                                    <span className="text-green-600 dark:text-green-400">{attempt.correct_answer}</span>
                                                                </p>
                                                                {options.length > 0 && (
                                                                    <div>
                                                                        <p className="font-semibold mb-1">All Options:</p>
                                                                        <ul className="list-disc list-inside space-y-1">
                                                                            {options.map((option, optIdx) => (
                                                                                <li key={optIdx} className={`
                                                                                    ${option === attempt.correct_answer ? 'font-bold text-green-600 dark:text-green-400' : ''}
                                                                                    ${option === attempt.user_answer && !attempt.is_correct ? 'font-bold text-red-600 dark:text-red-400' : ''}
                                                                                `}>
                                                                                    {option}
                                                                                    {option === attempt.correct_answer && <span className="ml-2 text-xs">(Correct)</span>}
                                                                                    {option === attempt.user_answer && !attempt.is_correct && <span className="ml-2 text-xs">(Your Answer)</span>}
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                )}
                                                                {attempt.mock_test_questions.explanation && (
                                                                    <div>
                                                                        <p className="font-semibold mt-3 mb-1">Explanation:</p>
                                                                        <p className="italic text-gray-600 dark:text-gray-400">{attempt.mock_test_questions.explanation}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                );
                                            })}
                                        </Accordion>
                                    ) : (
                                        <p className="text-center text-gray-500">Questions-wise breakdown is not availiable after 72 hours of releasing results</p>
                                    )}
                                </div>
                            </ScrollArea>
                        )}

                        <DialogFooter className="mt-4">
                            <Button onClick={handleCloseDetailDialog} variant="outline" className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md">
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
};

export default MyTestResults;
