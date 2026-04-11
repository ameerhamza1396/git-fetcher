// @ts-nocheck
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
import { CheckCircle, XCircle, MinusCircle, History, Trophy, ArrowLeft, FileText, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ProfileDropdown } from '@/components/ProfileDropdown';

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

interface FLPResultSummary {
    id: string;
    score: number;
    total_questions: number;
    completed_at: string;
    username?: string;
}

interface QuestionAttemptDetail {
    id: string;
    question_id: string;
    user_answer: string | null;
    correct_answer: string;
    is_correct: boolean;
    is_skipped: boolean;
    mcqs?: {
        question: string;
        option_a: string;
        option_b: string;
        option_c: string;
        option_d: string;
        explanation: string;
    };
}

const FLPResultsPage = () => {
    const { user } = useAuth();
    const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [openAccordionItems, setOpenAccordionItems] = useState<string[]>([]);

    const { data: profile } = useQuery<Profile | null>({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            return data;
        },
        enabled: !!user?.id
    });

    const { data: flpResults, isLoading: isLoadingResults } = useQuery<FLPResultSummary[], Error>({
        queryKey: ['flpResults', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return [];
            }

            const { data, error } = await supabase
                .from('flp_user_attempts')
                .select('id, score, total_questions, completed_at, username')
                .eq('user_id', user.id)
                .order('completed_at', { ascending: false });

            if (error) {
                throw new Error(`Error fetching results: ${error.message}`);
            }

            return data || [];
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    const { data: selectedResultDetails, isLoading: isLoadingDetails } = useQuery<QuestionAttemptDetail[], Error>({
        queryKey: ['flpResultDetail', selectedResultId],
        queryFn: async () => {
            if (!selectedResultId) {
                return [];
            }

            const { data, error } = await supabase
                .from('flp_user_attempts')
                .select('id, score, total_questions, completed_at, question_attempts')
                .eq('id', selectedResultId)
                .single();

            if (error) {
                throw new Error(`Error fetching result details: ${error.message}`);
            }

            return data?.question_attempts || [];
        },
        enabled: !!selectedResultId,
        staleTime: Infinity,
    });

    const { data: mcqDetails } = useQuery<any[]>({
        queryKey: ['mcqDetails', selectedResultDetails],
        queryFn: async () => {
            if (!selectedResultDetails || selectedResultDetails.length === 0) {
                return [];
            }

            const mcqIds = selectedResultDetails.map((detail: any) => detail.question_id).filter(Boolean);

            if (mcqIds.length === 0) {
                return [];
            }

            const { data, error } = await supabase
                .from('mcqs')
                .select('id, question, option_a, option_b, option_c, option_d, explanation')
                .in('id', mcqIds);

            if (error) {
                throw new Error(`Error fetching MCQ details: ${error.message}`);
            }

            return data || [];
        },
        enabled: !!selectedResultDetails && selectedResultDetails.length > 0,
        staleTime: Infinity,
    });

    const handleViewDetails = (resultId: string) => {
        setSelectedResultId(resultId);
        setIsDetailDialogOpen(true);
    };

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

    const getOptionClass = (attempt: any, option: string) => {
        const isSelected = attempt.user_answer === option;
        const isCorrect = attempt.correct_answer === option;
        const isSkipped = !attempt.user_answer || attempt.user_answer === '';

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

    if (isLoadingResults) {
        return (
            <div className="min-h-screen w-full bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-16 h-16 object-contain animate-pulse" />
                    <p className="text-muted-foreground">Loading your results...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-background">
            <div className="container mx-auto px-4 lg:px-8 py-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] max-w-7xl flex justify-between items-center">
                <Link to="/dashboard" className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </Link>

                <div className="flex items-center space-x-3">
                    <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
                    <span className="text-xl font-bold text-foreground">FLP Results</span>
                </div>

                <div className="flex items-center space-x-3">
                    <ProfileDropdown />
                </div>
            </div>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                        📊 Your Full-Length Paper Results
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Review your performance and track your progress over time.
                    </p>
                </div>

                {flpResults && flpResults.length > 0 ? (
                    <div className="grid gap-4">
                        {flpResults.map((result) => {
                            const percentage = result.total_questions > 0
                                ? Math.round((result.score / result.total_questions) * 100)
                                : 0;
                            const remarks = getScoreRemark(percentage);

                            return (
                                <Card key={result.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${remarks.bg}`}>
                                                    <Trophy className={`w-8 h-8 ${remarks.color}`} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-foreground">
                                                        Score: {result.score}/{result.total_questions}
                                                    </h3>
                                                    <p className="text-sm text-muted-foreground">
                                                        {new Date(result.completed_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <Badge className={`${remarks.bg} ${remarks.color} border-0`}>
                                                    {percentage}% - {remarks.text}
                                                </Badge>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(result.id)}
                                                >
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                            <History className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">No Results Yet</h3>
                        <p className="text-muted-foreground mb-6">You haven't completed any Full-Length Papers yet.</p>
                        <Link to="/flp">
                            <Button>
                                Start a Full-Length Paper
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic">
                            Detailed <span className="text-primary">Results</span>
                        </DialogTitle>
                        <DialogDescription>
                            Review your answers and explanations for each question.
                        </DialogDescription>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="flex justify-center py-8">
                            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-12 h-12 object-contain animate-pulse" />
                        </div>
                    ) : (
                        <ScrollArea className="h-[60vh] pr-4">
                            <Accordion type="multiple" value={openAccordionItems} onValueChange={setOpenAccordionItems} className="space-y-2">
                                {selectedResultDetails?.map((attempt, index) => {
                                    const mcq = mcqDetails?.find(m => m.id === attempt.question_id);
                                    const options = mcq
                                        ? [mcq.option_a, mcq.option_b, mcq.option_c, mcq.option_d]
                                        : [];

                                    return (
                                        <AccordionItem key={attempt.id} value={attempt.id} className="border rounded-lg px-4">
                                            <AccordionTrigger className="hover:no-underline">
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${attempt.is_correct ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                                                        {attempt.is_correct ? (
                                                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                        )}
                                                    </div>
                                                    <span className="font-medium">Question {index + 1}</span>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <div className="space-y-4 pt-2">
                                                    <div>
                                                        <h4 className="font-semibold text-foreground mb-2">Question:</h4>
                                                        <p className="text-sm text-muted-foreground">{mcq?.question || 'Question not found'}</p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {options.map((option, optIdx) => {
                                                            const letter = String.fromCharCode(65 + optIdx);
                                                            return (
                                                                <div
                                                                    key={optIdx}
                                                                    className={`p-3 rounded-lg border-2 transition-colors ${getOptionClass(attempt, option)}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold">{letter}.</span>
                                                                        <span className="text-sm">{option}</span>
                                                                        {attempt.correct_answer === option && (
                                                                            <CheckCircle className="w-4 h-4 ml-auto text-green-600" />
                                                                        )}
                                                                        {attempt.user_answer === option && attempt.user_answer !== attempt.correct_answer && (
                                                                            <XCircle className="w-4 h-4 ml-auto text-red-600" />
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                        <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">Explanation:</h4>
                                                        <p className="text-sm text-blue-800 dark:text-blue-300">{mcq?.explanation || 'No explanation available'}</p>
                                                    </div>
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    );
                                })}
                            </Accordion>
                        </ScrollArea>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default FLPResultsPage;