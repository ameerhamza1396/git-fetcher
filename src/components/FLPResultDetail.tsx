import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Clock, Calendar, HelpCircle, ChevronDown, ChevronUp, BookOpen, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';

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
    const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

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
            console.log("FLP Result Loaded:", data);
            return data;
        },
        enabled: !!testResultId,
        staleTime: 5 * 60 * 1000,
    });

    const mcqIds = flpResult?.question_attempts?.map(attempt => {
        console.log("Mapping attempt:", attempt);
        return attempt.mcq_id;
    }) || [];
    console.log("Extracted MCQ IDs:", mcqIds);

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

    const toggleExpand = (id: string) => {
        setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const getScoreRemark = (percentage: number) => {
        if (percentage >= 90) {
            return { text: "Outstanding Pass", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800" };
        } else if (percentage >= 75) {
            return { text: "Excellent Pass", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/20", border: "border-cyan-200 dark:border-cyan-800" };
        } else if (percentage >= 60) {
            return { text: "Pass", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/20", border: "border-teal-200 dark:border-teal-800" };
        } else {
            return { text: "Needs Revision", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800" };
        }
    };

    const getOptionStyle = (attempt: QuestionAttempt, option: string, correctAnswer: string) => {
        const isSelected = attempt.selectedAnswer === option;
        const isCorrect = correctAnswer === option;
        
        if (isCorrect) {
            return "bg-emerald-50/75 dark:bg-emerald-950/30 border-emerald-500 text-emerald-900 dark:text-emerald-300 font-semibold shadow-sm";
        }
        if (isSelected && !isCorrect) {
            return "bg-rose-50/75 dark:bg-rose-950/30 border-rose-500 text-rose-900 dark:text-rose-300 line-through font-medium";
        }
        return "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300";
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
                <Card className="max-w-md border-rose-200 dark:border-rose-900">
                    <CardHeader>
                        <CardTitle className="text-rose-600 dark:text-rose-400">Error Loading Result</CardTitle>
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
                <Card className="max-w-md text-center border-slate-200 dark:border-slate-800">
                    <CardHeader>
                        <CardTitle className="text-2xl font-black">Report Not Found</CardTitle>
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

    const correctCount = flpResult.question_attempts.filter(a => a.isCorrect).length;
    const incorrectCount = flpResult.question_attempts.filter(a => !a.isCorrect && a.selectedAnswer).length;
    const unattemptedCount = flpResult.question_attempts.filter(a => !a.selectedAnswer).length;

    // Filter attempts
    const filteredAttempts = flpResult.question_attempts.map((attempt, index) => ({ attempt, index })).filter(({ attempt }) => {
        if (filterTab === 'correct') return attempt.isCorrect;
        if (filterTab === 'incorrect') return !attempt.isCorrect && attempt.selectedAnswer;
        if (filterTab === 'skipped') return !attempt.selectedAnswer;
        return true;
    });

    const radius = 52;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (scorePercentage / 100) * circumference;

    return (
        <div className="min-h-screen w-full bg-slate-50/50 dark:bg-slate-950 selection:bg-teal-500/20 text-slate-900 dark:text-white pb-12 transition-colors duration-300">
            <Seo title={`FLP Result - ${scorePercentage}%`} />
            
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/75 backdrop-blur-md border-b border-slate-200/60 dark:border-white/10 pt-[env(safe-area-inset-top)]">
                <div className="container mx-auto px-5 h-16 flex justify-between items-center max-w-4xl">
                    <Link to="/flp-result" className="flex items-center space-x-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center space-x-2">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-8 h-8 object-contain" />
                        <span className="text-lg font-black tracking-tight italic uppercase">FLP Report</span>
                    </div>
                    <ProfileDropdown />
                </div>
            </header>

            <main className="container mx-auto px-5 pt-8 max-w-4xl space-y-8">
                {/* Score Dashboard Card */}
                <Card className="overflow-hidden border-slate-200/70 dark:border-white/10 shadow-xl shadow-slate-100/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2rem]">
                    <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Left: Circular Graph */}
                        <div className="relative flex items-center justify-center shrink-0">
                            <svg className="w-36 h-36 transform -rotate-90">
                                <circle
                                    cx="72"
                                    cy="72"
                                    r={radius}
                                    className="stroke-slate-100 dark:stroke-slate-800"
                                    strokeWidth={strokeWidth}
                                    fill="transparent"
                                />
                                <circle
                                    cx="72"
                                    cy="72"
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
                                <span className="text-4xl font-black tracking-tighter">{scorePercentage}%</span>
                                <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Accuracy</p>
                            </div>
                        </div>

                        {/* Middle: Performance details */}
                        <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                <Badge className={`uppercase text-[10px] tracking-wider font-extrabold px-3 py-1 border shadow-sm ${remarks.bg} ${remarks.color} ${remarks.border}`}>
                                    {remarks.text}
                                </Badge>
                                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {new Date(flpResult.completed_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                                Exam Score: {flpResult.score} <span className="text-slate-400 font-semibold">/ {flpResult.total_questions}</span>
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                Review your breakdown below to target specific weak areas in subsequent mock exams.
                            </p>
                        </div>

                        {/* Right: Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 w-full md:w-auto shrink-0">
                            <div className="flex flex-col items-center justify-center p-4 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{correctCount}</span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-500 mt-0.5">Correct</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl">
                                <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{incorrectCount}</span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-500 mt-0.5">Wrong</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl">
                                <span className="text-2xl font-black text-slate-500 dark:text-slate-400">{unattemptedCount}</span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">Skipped</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 max-w-md mx-auto md:mx-0">
                    {(['all', 'correct', 'incorrect', 'skipped'] as const).map((tab) => {
                        const active = filterTab === tab;
                        const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                        return (
                            <button
                                key={tab}
                                onClick={() => setFilterTab(tab)}
                                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                    active
                                        ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* Detailed Questions List */}
                <div className="space-y-4">
                    {filteredAttempts.length > 0 ? (
                        filteredAttempts.map(({ attempt, index }) => {
                            const mcq = mcqMap.get(attempt.mcq_id);
                            const isExpanded = !!expandedQuestions[attempt.mcq_id];
                            const options = mcq
                                ? [mcq.option_a, mcq.option_b, mcq.option_c, mcq.option_d]
                                : [];

                            return (
                                <Card
                                    key={attempt.id || attempt.mcq_id}
                                    className={`overflow-hidden border-slate-200/60 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900 rounded-3xl transition-all duration-200 ${
                                        isExpanded ? "ring-1 ring-teal-500/30" : ""
                                    }`}
                                >
                                    <div
                                        onClick={() => toggleExpand(attempt.mcq_id)}
                                        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                                                attempt.isCorrect
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                                    : !attempt.selectedAnswer
                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                    : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                                            }`}>
                                                {attempt.isCorrect ? (
                                                    <CheckCircle2 className="w-4 h-4" />
                                                ) : !attempt.selectedAnswer ? (
                                                    <HelpCircle className="w-4 h-4" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Question {index + 1}</span>
                                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate pr-4">
                                                    {mcq?.question || 'Question Details Not Found'}
                                                </p>
                                            </div>
                                        </div>
                                        <button className="text-slate-400 dark:text-slate-600 shrink-0">
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>

                                    {isExpanded && mcq && (
                                        <div className="border-t border-slate-100 dark:border-white/5 p-6 space-y-6 animate-fade-in bg-slate-50/10 dark:bg-slate-950/5">
                                            {/* Question Body */}
                                            <div className="space-y-2">
                                                <span className="text-[10px] font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest">Clinical Scenario</span>
                                                <p className="text-sm font-bold leading-relaxed text-slate-900 dark:text-slate-100">
                                                    {mcq.question}
                                                </p>
                                            </div>

                                            {/* Options */}
                                            <div className="grid gap-2.5">
                                                {options.map((option, optIdx) => {
                                                    const letter = String.fromCharCode(65 + optIdx);
                                                    const optionStyle = getOptionStyle(attempt, option, mcq.correct_answer);
                                                    const isCorrectAns = mcq.correct_answer === option;
                                                    const isSelectedAns = attempt.selectedAnswer === option;

                                                    return (
                                                        <div
                                                            key={optIdx}
                                                            className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${optionStyle}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">{letter}</span>
                                                                <span className="text-sm">{option}</span>
                                                            </div>
                                                            {isCorrectAns && (
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                            )}
                                                            {isSelectedAns && !isCorrectAns && (
                                                                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Explanation */}
                                            <div className="p-5 bg-teal-50/30 dark:bg-teal-950/10 border border-teal-100/50 dark:border-teal-900/20 rounded-2xl space-y-2">
                                                <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                                                    <BookOpen className="w-4 h-4" />
                                                    <span className="text-xs font-extrabold uppercase tracking-wider">Clinical Explanation</span>
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                                    {mcq.explanation || 'No explanation configured for this MCQ.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </Card>
                            );
                        })
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-white/5">
                            <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No matching questions</h3>
                            <p className="text-xs text-slate-400 mt-1">There are no attempts that match your selected filter.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default FLPResultDetail;
