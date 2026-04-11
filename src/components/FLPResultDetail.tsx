// @ts-nocheck
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, XCircle, Trophy, Calendar, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { ProfileDropdown } from '@/components/ProfileDropdown';

interface MCQ {
    id: string;
    question: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    explanation: string;
}

interface QuestionAttempt {
    mcq_id: string;
    selectedAnswer: string | null;
    isCorrect: boolean;
    timeTaken: number;
}

interface FLPAttempt {
    id: string;
    user_id: string;
    username: string;
    score: number;
    total_questions: number;
    completed_at: string;
    question_attempts: QuestionAttempt[];
    test_config_id: string;
}

const FLPResultDetail = () => {
    const { id: testResultId } = useParams<{ id: string }>();

    const {
        data: flpResult,
        isLoading: isLoadingResult,
        isError: isErrorResult,
        error: errorResult
    } = useQuery<FLPAttempt, Error>({
        queryKey: ['flpResultDetail', testResultId],
        queryFn: async () => {
            if (!testResultId) {
                throw new Error("Test Result ID is missing in the URL.");
            }
            const { data, error } = await supabase
                .from('flp_user_attempts')
                .select('*')
                .eq('id', testResultId)
                .single();

            if (error) {
                throw new Error(`Error fetching FLP result: ${error.message}`);
            }
            return data;
        },
        enabled: !!testResultId,
        staleTime: 5 * 60 * 1000,
    });

    const mcqIds = flpResult?.question_attempts.map(attempt => attempt.mcq_id) || [];

    const {
        data: mcqsData,
        isLoading: isLoadingMcqs,
        isError: isErrorMcqs,
        error: errorMcqs
    } = useQuery<MCQ[], Error>({
        queryKey: ['flpMcqsDetail', mcqIds],
        queryFn: async () => {
            if (mcqIds.length === 0) {
                return [];
            }
            const { data, error } = await supabase
                .from('mcqs')
                .select('id, question, option_a, option_b, option_c, option_d, correct_answer, explanation')
                .in('id', mcqIds);

            if (error) {
                throw new Error(`Error fetching MCQs: ${error.message}`);
            }
            return data as MCQ[];
        },
        enabled: !!flpResult && flpResult.question_attempts.length > 0 && mcqIds.length > 0,
        staleTime: Infinity,
    });

    const getScoreRemark = (percentage: number) => {
        if (percentage >= 90) {
            return { text: "Outstanding!", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" };
        } else if (percentage >= 75) {
            return { text: "Excellent!", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" };
        } else if (percentage >= 50) {
            return { text: "Good effort!", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" };
        } else {
            return { text: "Keep practicing!", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" };
        }
    };

    const getOptionClass = (attempt: QuestionAttempt, option: string, correctAnswer: string) => {
        const isSelected = attempt.selectedAnswer === option;
        const isCorrect = correctAnswer === option;
        const isSkipped = !attempt.selectedAnswer || attempt.selectedAnswer === '';

        if (isCorrect) {
            return "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-300";
        }
        if (isSelected && !isCorrect) {
            return "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 line-through";
        }
        if (isSkipped && !isCorrect) {
            return "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400";
        }
        return "bg-transparent border-gray-200 dark:border-gray-700";
    };

    if (isLoadingResult || isLoadingMcqs) {
        return (
            <div className="min-h-screen w-full bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-16 h-16 object-contain animate-pulse" />
                    <p className="text-muted-foreground">Loading detailed report...</p>
                </div>
            </div>
        );
    }

    if (isErrorResult) {
        return (
            <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
                <Card className="max-w-md">
                    <CardHeader>
                        <CardTitle className="text-red-500">Error Loading Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">{errorResult?.message}</p>
                        <div className="flex gap-4">
                            <Link to="/flp-result">
                                <Button>View All Results</Button>
                            </Link>
                            <Link to="/dashboard">
                                <Button variant="outline">Go to Dashboard</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!flpResult) {
        return (
            <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4">
                <Card className="max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold">Report Not Found</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">
                            The Full-Length Paper result could not be found. The ID may be incorrect or the record was deleted.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link to="/flp-result">
                                <Button>View All Results</Button>
                            </Link>
                            <Link to="/dashboard">
                                <Button variant="outline">Go to Dashboard</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const mcqMap = new Map(mcqsData?.map(mcq => [mcq.id, mcq]) || []);
    const scorePercentage = flpResult.total_questions > 0
        ? parseFloat(((flpResult.score / flpResult.total_questions) * 100).toFixed(2))
        : 0;
    const remarks = getScoreRemark(scorePercentage);

    const correctCount = flpResult.question_attempts.filter(a => a.isCorrect).length;
    const incorrectCount = flpResult.question_attempts.filter(a => !a.isCorrect && a.selectedAnswer).length;
    const unattemptedCount = flpResult.question_attempts.filter(a => !a.selectedAnswer).length;

    return (
        <div className="min-h-screen w-full bg-background">
            <div className="container mx-auto px-4 lg:px-8 py-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] max-w-7xl flex justify-between items-center">
                <Link to="/flp-result" className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="flex items-center space-x-3">
                    <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold text-foreground">FLP Detailed Results</span>
                </div>

                <div className="flex items-center space-x-3">
                    <ProfileDropdown />
                </div>
            </div>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
                <Card className="mb-8">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-black italic">
                            Your <span className="text-primary">Performance</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex flex-col items-center">
                            <div className={`w-32 h-32 rounded-full flex items-center justify-center ${remarks.bg} mb-4`}>
                                <Trophy className={`w-16 h-16 ${remarks.color}`} />
                            </div>
                            <p className="text-5xl font-black text-foreground">
                                {flpResult.score}
                                <span className="text-2xl text-muted-foreground">/{flpResult.total_questions}</span>
                            </p>
                            <Badge className={`mt-2 ${remarks.bg} ${remarks.color} border-0 text-lg`}>
                                {scorePercentage}% - {remarks.text}
                            </Badge>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(flpResult.completed_at).toLocaleString()}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                            <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{correctCount}</p>
                                <p className="text-xs text-green-600 dark:text-green-400">Correct</p>
                            </div>
                            <div className="text-center p-4 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <XCircle className="w-6 h-6 mx-auto mb-2 text-red-600 dark:text-red-400" />
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{incorrectCount}</p>
                                <p className="text-xs text-red-600 dark:text-red-400">Incorrect</p>
                            </div>
                            <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <HelpCircle className="w-6 h-6 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">{unattemptedCount}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Skipped</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-foreground">
                        Question-by-Question Breakdown
                    </h2>
                    <p className="text-muted-foreground">Tap on any question to view details</p>
                </div>

                <ScrollArea className="h-[calc(100vh-450px)]">
                    <Accordion type="multiple" className="space-y-2">
                        {flpResult.question_attempts.map((attempt, index) => {
                            const originalMcq = mcqMap.get(attempt.mcq_id);
                            const options = originalMcq
                                ? [originalMcq.option_a, originalMcq.option_b, originalMcq.option_c, originalMcq.option_d]
                                : [];

                            return (
                                <AccordionItem key={attempt.id} value={attempt.id} className="border rounded-lg px-4">
                                    <AccordionTrigger className="hover:no-underline">
                                        <div className="flex items-center gap-3 text-left">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${attempt.isCorrect ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                                {attempt.isCorrect ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                )}
                                            </div>
                                            <div>
                                                <span className="font-medium">Question {index + 1}</span>
                                                <p className="text-xs text-muted-foreground line-clamp-1">
                                                    {originalMcq?.question || 'Question details not found'}
                                                </p>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 pt-2">
                                            <div>
                                                <h4 className="font-semibold text-foreground mb-2">Question:</h4>
                                                <p className="text-sm text-muted-foreground">{originalMcq?.question || 'Question not found'}</p>
                                            </div>

                                            <div className="space-y-2">
                                                {options.map((option, optIdx) => {
                                                    const letter = String.fromCharCode(65 + optIdx);
                                                    return (
                                                        <div
                                                            key={optIdx}
                                                            className={`p-3 rounded-lg border-2 transition-colors ${getOptionClass(attempt, option, originalMcq?.correct_answer || '')}`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold">{letter}.</span>
                                                                <span className="text-sm">{option}</span>
                                                                {originalMcq?.correct_answer === option && (
                                                                    <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                                                                )}
                                                                {attempt.selectedAnswer === option && attempt.selectedAnswer !== originalMcq?.correct_answer && (
                                                                    <XCircle className="w-4 h-4 ml-auto text-red-600" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {originalMcq?.explanation && (
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">Explanation:</h4>
                                                    <p className="text-sm text-blue-800 dark:text-blue-300">{originalMcq.explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </ScrollArea>
            </div>
        </div>
    );
};

export default FLPResultDetail;