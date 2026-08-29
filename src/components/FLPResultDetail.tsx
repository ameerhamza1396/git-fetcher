import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, Calendar, HelpCircle, ChevronRight, BookOpen, Sparkles, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface MCQ {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
}

interface QuestionAttempt {
    id?: string;
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
    const [filterTab, setFilterTab] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
    const [selectedMcqId, setSelectedMcqId] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

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

    const mcqIds = flpResult?.question_attempts?.map(attempt => attempt.mcq_id) || [];

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
                .select('id, question, options, correct_answer, explanation')
                .in('id', mcqIds);

            if (error) {
                throw new Error(`Error fetching MCQs: ${error.message}`);
            }
            return data as MCQ[];
        },
        enabled: !!flpResult && !!flpResult.question_attempts && flpResult.question_attempts.length > 0 && mcqIds.length > 0,
        staleTime: Infinity,
    });

    const getScoreRemark = (percentage: number) => {
        if (percentage >= 90) {
            return { text: "Outstanding Pass", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50/50 dark:bg-emerald-950/20", border: "border-emerald-200/40 dark:border-emerald-800/40" };
        } else if (percentage >= 75) {
            return { text: "Excellent Pass", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50/50 dark:bg-cyan-950/20", border: "border-cyan-200/40 dark:border-cyan-800/40" };
        } else if (percentage >= 60) {
            return { text: "Pass", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50/50 dark:bg-teal-950/20", border: "border-teal-200/40 dark:border-teal-800/40" };
        } else {
            return { text: "Needs Revision", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50/50 dark:bg-rose-950/20", border: "border-rose-200/40 dark:border-rose-800/40" };
        }
    };

    const getOptionStyle = (attempt: QuestionAttempt, option: string, correctAnswer: string) => {
        const isSelected = attempt.selectedAnswer === option;
        const isCorrect = correctAnswer === option;
        
        if (isCorrect) {
            return "bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-sm";
        }
        if (isSelected && !isCorrect) {
            return "bg-rose-500/10 dark:bg-rose-950/30 border-rose-500 text-rose-800 dark:text-rose-300 line-through font-bold";
        }
        return "bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/40 dark:border-white/5 text-slate-700 dark:text-slate-300";
    };

    if (isLoadingResult || isLoadingMcqs) {
        return (
            <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-20 h-20 object-contain animate-pulse" />
                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs animate-pulse">Loading Detailed Report...</p>
                </div>
            </div>
        );
    }

    if (isErrorResult) {
        return (
            <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <Card className="max-w-md border-rose-200/40 dark:border-rose-900/40 bg-white/10 dark:bg-white/[0.02] backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-rose-600 dark:text-rose-400 font-black italic uppercase">Error Loading Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{errorResult?.message}</p>
                        <div className="flex gap-3">
                            <Link to="/flp-result">
                                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl">View All Results</Button>
                            </Link>
                            <Link to="/dashboard">
                                <Button variant="outline" className="border-slate-200 dark:border-slate-800 rounded-xl">Dashboard</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!flpResult) {
        return (
            <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
                <Card className="max-w-md text-center border-slate-200/40 dark:border-slate-800/40 bg-white/10 dark:bg-white/[0.02] backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="text-2xl font-black italic uppercase">Report Not Found</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            The requested Full-Length Paper attempt record is missing or expired.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link to="/flp-result">
                                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl">View All Results</Button>
                            </Link>
                            <Link to="/dashboard">
                                <Button variant="outline" className="border-slate-200 dark:border-slate-800 rounded-xl">Dashboard</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const mcqMap = new Map(mcqsData?.map(mcq => [mcq.id, mcq]) || []);
    const scorePercentage = flpResult.total_questions > 0
        ? Math.round((flpResult.score / flpResult.total_questions) * 100)
        : 0;
    const remarks = getScoreRemark(scorePercentage);

    const correctCount = flpResult?.question_attempts?.filter(a => a.isCorrect).length || 0;
    const incorrectCount = flpResult?.question_attempts?.filter(a => !a.isCorrect && a.selectedAnswer).length || 0;
    const unattemptedCount = flpResult?.question_attempts?.filter(a => !a.selectedAnswer).length || 0;

    // Filter attempts
    const filteredAttempts = (flpResult?.question_attempts || []).map((attempt, index) => ({ attempt, index })).filter(({ attempt }) => {
        if (filterTab === 'correct') return attempt.isCorrect;
        if (filterTab === 'incorrect') return !attempt.isCorrect && attempt.selectedAnswer;
        if (filterTab === 'skipped') return !attempt.selectedAnswer;
        return true;
    });

    const activeMcqAttempt = flpResult?.question_attempts?.find(a => a.mcq_id === selectedMcqId);
    const activeMcq = selectedMcqId ? mcqMap.get(selectedMcqId) : null;

    const radius = 52;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

    const handleOpenDetail = (id: string) => {
        setSelectedMcqId(id);
        setIsSheetOpen(true);
    };

    return (
        <div className="fixed inset-0 flex flex-col bg-background text-foreground transition-colors duration-300 overflow-hidden">
            <Seo title={`FLP Result - ${scorePercentage}%`} />
            
            {/* Mesh Background Blurs */}
            <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/15" />
            
            {/* Header */}
            <header className="shrink-0 bg-background/88 backdrop-blur-2xl border-b border-border/60 pt-[env(safe-area-inset-top)] z-40">
                <div className="container mx-auto px-5 h-16 flex justify-between items-center max-w-4xl">
                    <Link to="/flp-result" className="flex shrink-0 items-center justify-center bg-muted text-foreground transition active:scale-95 h-11 w-11 rounded-2xl border border-border/40">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="min-w-0 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">FLP Report</p>
                        <h1 className="truncate text-base font-black tracking-tight uppercase italic">Detailed Results</h1>
                    </div>
                    <ProfileDropdown />
                </div>
            </header>

            <main className="relative z-10 flex-1 flex flex-col min-h-0 w-full max-w-4xl mx-auto px-4 pt-6 pb-6 overflow-hidden gap-5">
                {/* Score Dashboard Card (Glassmorphic) */}
                <div className="overflow-hidden border border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl rounded-[2rem] shadow-sm">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Circular Graph */}
                        <div className="relative flex items-center justify-center shrink-0">
                            <svg className="w-32 h-32 transform -rotate-90">
                                <circle
                                    cx="64"
                                    cy="64"
                                    r={radius}
                                    className="stroke-slate-100/50 dark:stroke-slate-800/40"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                />
                                <circle
                                    cx="64"
                                    cy="64"
                                    r={radius}
                                    className={scorePercentage >= 60 ? "stroke-teal-500" : "stroke-rose-500"}
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute text-center">
                                <span className="text-3xl font-black tracking-tighter">{scorePercentage}%</span>
                                <p className="text-[9px] uppercase font-bold text-muted-foreground">Accuracy</p>
                            </div>
                        </div>

                        {/* Performance details */}
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <Badge className={`uppercase text-[9px] tracking-wider font-extrabold px-2.5 py-1 border shadow-sm ${remarks.bg} ${remarks.color} ${remarks.border}`}>
                                    {remarks.text}
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(flpResult.completed_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-foreground leading-tight uppercase italic">
                                Exam Score: {flpResult.score} <span className="text-muted-foreground font-semibold">/ {flpResult.total_questions}</span>
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                Review your results breakdown below to identify concepts and subjects needing additional focus.
                            </p>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0">
                            <div className="flex flex-col items-center justify-center p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                <span className="text-xl font-black text-emerald-500">{correctCount}</span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-500/80 mt-0.5">Correct</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                                <span className="text-xl font-black text-rose-500">{incorrectCount}</span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500/80 mt-0.5">Wrong</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 bg-slate-500/5 border border-border/40 rounded-2xl">
                                <span className="text-xl font-black text-muted-foreground">{unattemptedCount}</span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground mt-0.5">Skipped</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-white/5 dark:bg-white/[0.02] backdrop-blur-md rounded-2xl border border-border/40 max-w-md mx-auto md:mx-0">
                    {(['all', 'correct', 'incorrect', 'skipped'] as const).map((tab) => {
                        const active = filterTab === tab;
                        const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                        return (
                            <button
                                key={tab}
                                onClick={() => setFilterTab(tab)}
                                className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                    active
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Detailed Questions List (Glassmorphic List) */}
                <div className="flex-1 overflow-y-auto rounded-3xl border border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl divide-y divide-border/40 shadow-sm pr-1">
                    {filteredAttempts.length > 0 ? (
                        filteredAttempts.map(({ attempt, index }) => {
                            const mcq = mcqMap.get(attempt.mcq_id);

                            return (
                                <div
                                    key={attempt.id || attempt.mcq_id}
                                    onClick={() => handleOpenDetail(attempt.mcq_id)}
                                    className="group relative flex items-center justify-between gap-4 p-5 transition-all duration-200 hover:bg-primary/5 cursor-pointer"
                                >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border ${
                                            attempt.isCorrect
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                : !attempt.selectedAnswer
                                                ? 'bg-slate-500/10 border-border/40 text-slate-400'
                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                        }`}>
                                            {attempt.isCorrect ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : !attempt.selectedAnswer ? (
                                                <HelpCircle className="w-5 h-5" />
                                            ) : (
                                                <XCircle className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">Question {index + 1}</span>
                                            <p className="text-sm font-bold text-foreground leading-snug group-hover:text-primary transition-colors truncate mt-0.5">
                                                {mcq?.question || 'Question Details Not Found'}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="h-8 w-8 rounded-full flex items-center justify-center bg-muted/50 text-foreground/75 transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center py-16">
                            <AlertCircle className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">No matching questions</h3>
                            <p className="text-xs text-muted-foreground mt-1">There are no attempts matching the selected filter.</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Pinned Sheet Modal for Question Details */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetContent side="bottom" className="h-[80vh] sm:h-[75vh] border-t border-border/60 bg-background/95 backdrop-blur-2xl rounded-t-[2.5rem] p-0 overflow-hidden shadow-2xl flex flex-col">
                    {activeMcq && activeMcqAttempt && (
                        <>
                            <div className="px-6 pt-8 pb-4 border-b border-border/40 shrink-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge className={`uppercase text-[9px] tracking-wider font-extrabold border ${
                                        activeMcqAttempt.isCorrect
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                            : !activeMcqAttempt.selectedAnswer
                                            ? 'bg-slate-500/10 border-border/40 text-slate-400'
                                            : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                                    }`}>
                                        {activeMcqAttempt.isCorrect ? 'Correct' : !activeMcqAttempt.selectedAnswer ? 'Skipped' : 'Incorrect'}
                                    </Badge>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Detailed Review</span>
                                </div>
                                <SheetTitle className="text-lg font-black tracking-tight text-foreground leading-[1.3] text-left">
                                    Clinical Scenario
                                </SheetTitle>
                                <SheetDescription className="text-xs font-semibold text-muted-foreground mt-1 text-left">
                                    Review the clinical presentation, options, and explanations.
                                </SheetDescription>
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                                {/* Question Scenario */}
                                <p className="text-base font-bold leading-relaxed text-foreground text-left">
                                    {activeMcq.question}
                                </p>

                                {/* Options */}
                                <div className="grid gap-2.5">
                                    {activeMcq.options.map((option, optIdx) => {
                                        const letter = String.fromCharCode(65 + optIdx);
                                        const optionStyle = getOptionStyle(activeMcqAttempt, option, activeMcq.correct_answer);
                                        const isCorrectAns = activeMcq.correct_answer === option;
                                        const isSelectedAns = activeMcqAttempt.selectedAnswer === option;

                                        return (
                                            <div
                                                key={optIdx}
                                                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${optionStyle}`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">{letter}</span>
                                                    <span className="text-sm font-medium leading-snug">{option}</span>
                                                </div>
                                                {isCorrectAns && (
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                                )}
                                                {isSelectedAns && !isCorrectAns && (
                                                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-2 text-left">
                                    <div className="flex items-center gap-2 text-primary">
                                        <BookOpen className="w-4.5 h-4.5" />
                                        <span className="text-xs font-black uppercase tracking-wider">Clinical Explanation</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
                                        {activeMcq.explanation || 'No explanation configured for this MCQ.'}
                                    </p>
                                </div>
                            </div>

                            {/* Sticky Sheet Footer */}
                            <div className="p-4 bg-muted/20 border-t border-border/40 shrink-0 flex justify-end">
                                <Button
                                    onClick={() => setIsSheetOpen(false)}
                                    className="rounded-2xl px-6 py-4 font-black uppercase text-xs tracking-widest bg-foreground text-background"
                                >
                                    Close Review
                                </Button>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

export default FLPResultDetail;
