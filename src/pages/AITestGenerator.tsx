// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Crown, ArrowLeft, X, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import Seo from '@/components/Seo';
import PlanBadge from '@/components/PlanBadge';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

const categorizedTopics = {
    "1st": ["FND1 (Foundation)", "HEM1 (Blood)", "LCM1 (Locomotor)", "RSP1 (Respiratory System)", "CVS1 (Cardiovascular System)"],
    "2nd": ["NEU1 (Nervous System)", "HNN1 (Head & Neck and Special Senses)", "END1 (Endocrinology)", "GIL1 (Gastrointestinal Tract and Liver)", "EXC1 (Renal and Excretory System)", "REP1 (Reproductive System)"],
    "3rd": ["FND2 (Foundation II)", "IDD1 (Infectious Diseases)", "HEM2 (Hematology)", "RSP2 (Respiratory System)", "CVS2 (Cardiovascular System)", "GIL2 (Gastrointestinal Tract and Liver)", "END2 (Endocrinology)", "EXC2 (Renal and Excretory System)"],
    "4th": ["ORT2 (Orthopedics, Rheumatology, Trauma)", "PMR (Physical Medicine & Rehabilitation)", "DPS (Dermatology, Plastic Surgery/Burns)", "GEN (Genetics)", "REP2 (Reproductive System)", "NEU2 (Neurosciences and Psychiatry)", "ENT (Ear, Nose, and Throat)", "Ophthalmology/Eye"],
    "5th": ["Medicine Rotation", "Surgery Rotation", "Gyneacology and Obstetrics Rotation", "Paediatrics Rotation"]
};

const topicMapping = (selectedTopic: string): string => {
    const map: { [key: string]: string } = {
        "FND1 (Foundation)": "Foundation", "HEM1 (Blood)": "Hematology", "LCM1 (Locomotor)": "Locomotion", "RSP1 (Respiratory System)": "Respiratory System", "CVS1 (Cardiovascular System)": "Cardiovascular System",
        "NEU1 (Nervous System)": "Neurosciences", "HNN1 (Head & Neck and Special Senses)": "Head, Neck, and Special Senses", "END1 (Endocrinology)": "Endocrinology", "GIL1 (Gastrointestinal Tract and Liver)": "Gastrointestinal Tract (GIT)", "EXC1 (Renal and Excretory System)": "Renal and Excretory System", "REP1 (Reproductive System)": "Reproductive System",
        "FND2 (Foundation II)": "Foundation II", "IDD1 (Infectious Diseases)": "Infectious Diseases", "HEM2 (Hematology)": "Hematology II", "RSP2 (Respiratory System)": "Respiratory System II", "CVS2 (Cardiovascular System)": "Cardiovascular System II", "GIL2 (Gastrointestinal Tract and Liver)": "GIT and Liver II", "END2 (Endocrinology)": "Endocrinology II", "EXC2 (Renal and Excretory System)": "Renal and Excretory System II",
        "ORT2 (Orthopedics, Rheumatology, Trauma)": "Orthopedics, Rheumatology, Trauma", "PMR (Physical Medicine & Rehabilitation)": "Physical Medicine & Rehabilitation", "DPS (Dermatology, Plastic Surgery/Burns)": "Dermatology, Plastic Surgery/Burns", "GEN (Genetics)": "Genetics", "REP2 (Reproductive System)": "Reproductive System II", "NEU2 (Neurosciences and Psychiatry)": "Neurosciences and Psychiatry", "ENT (Ear, Nose, and Throat)": "ENT (Otorhinolaryngology)", "Ophthalmology/Eye": "Ophthalmology",
        "Medicine Rotation": "Medicine Rotation", "Surgery Rotation": "Surgery Rotation", "Gyneacology and Obstetrics Rotation": "Gynecology and Obstetrics Rotation", "Paediatrics Rotation": "Pediatrics Rotation",
    };
    return map[selectedTopic] || selectedTopic;
};

const getTopicsForYear = (year: string): string[] => {
    const normalizedYear = year.toLowerCase().replace(/ professional year| year/g, '');
    const key = Object.keys(categorizedTopics).find(k => k === normalizedYear);
    return key ? categorizedTopics[key] : [];
};

const AITestGenerator: React.FC = () => {
    const { user, loading: authLoading } = useAuth();
    const headerRef = useRef(null);
    const lastScrollY = useRef(0);
    const [headerVisible, setHeaderVisible] = useState(true);

    const { data: profile, isLoading: planLoading } = useQuery({
        queryKey: ['plan_and_year', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase.from('profiles').select('plan, year, full_name, username').eq('id', user.id).single();
            return data;
        },
        enabled: !!user?.id, retry: false
    });

    const plan = profile?.plan?.toLowerCase() || 'free';
    const userYear = profile?.year || '1st';
    const hasAccess = plan === 'premium';
    const availableTopics = getTopicsForYear(userYear);

    const [currentStep, setCurrentStep] = useState(1);
    const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
    const [totalQ, setTotalQ] = useState(10);
    const [customPrompt, setCustomPrompt] = useState('');
    const [loading, setLoading] = useState(0);
    const [loadTime, setLoadTime] = useState(0);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [idx, setIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    // Fixed Capacitor back button handler
    useEffect(() => {
        let isMounted = true;

        const setupBackHandler = async () => {
            try {
                // Dynamic import only when needed
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform() && isMounted) {
                    const { App } = await import('@capacitor/app');
                    const backListener = App.addListener('backButton', () => {
                        if (currentStep === 4 && !submitted) {
                            setShowExitConfirm(true);
                            return;
                        }
                        // Default behavior for other steps
                        window.history.back();
                    });

                    // Cleanup function
                    return () => {
                        backListener.then(listener => listener.remove());
                    };
                }
            } catch (err) {
                // Capacitor not available in web environment - ignore
                console.debug('Capacitor not available, using web back button behavior');
            }
            return () => { };
        };

        const cleanup = setupBackHandler();
        return () => {
            isMounted = false;
            cleanup.then(fn => fn && fn());
        };
    }, [currentStep, submitted]);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setHeaderVisible(currentScrollY < lastScrollY.current || currentScrollY < 10);
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleChapterToggle = (chapter: string) => { setSelectedChapters(prev => prev.includes(chapter) ? [] : [chapter]); setError(null); };
    const handleConfirmChapters = () => { if (selectedChapters.length === 1) { setCurrentStep(2); setError(null); } else setError('Please select exactly one subject.'); };
    const handleConfirmQuestions = () => { if (totalQ > 0 && totalQ <= 20) setCurrentStep(3); else setError('Please enter 1-20 questions.'); };

    const fetchAll = async () => {
        setError(null); setLoading(1); setLoadTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setLoading(t => { setLoadTime(t + 1); return Math.min(99, t + 10); }), 1000);
        const apiTopic = topicMapping(selectedChapters[0]);
        try {
            const res = await fetch(`https://medmacs-ai-bot.vercel.app/generate-ai-test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: apiTopic, difficulty: 'medium', count: totalQ, prompt: `Strictly adhere to the syllabus for ${userYear} year and module: ${apiTopic}. ${customPrompt}` }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Status ${res.status}`);
            setQuestions(data.questions); setIdx(0); setAnswers({}); setRevealed({}); setSubmitted(false); setCurrentStep(4);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(0); if (timerRef.current) clearInterval(timerRef.current); }
    };

    const select = (i: number, a: string) => !revealed[i] && setAnswers(s => ({ ...s, [i]: a }));

    const revealAnswer = () => {
        if (answers[idx]) {
            setRevealed(s => ({ ...s, [idx]: true }));
        }
    };

    const next = () => idx < questions.length - 1 && setIdx(idx + 1);
    const prev = () => idx > 0 && setIdx(idx - 1);
    const submit = async () => {
        setSubmitted(true);
        setCurrentStep(5);
        if (user) {
            const finalScore = questions.reduce((acc, q, i) => answers[i] === q.answer ? acc + 1 : acc, 0);
            const accuracy = questions.length > 0 ? parseFloat(((finalScore / questions.length) * 100).toFixed(2)) : 0;
            try {
                await supabase.from('ai_generated_tests').insert({
                    user_id: user.id,
                    topic: topicMapping(selectedChapters[0]),
                    difficulty: 'medium',
                    questions: questions,
                    total_questions: questions.length,
                    test_taken: true,
                    score: finalScore,
                    accuracy,
                });
            } catch (e) { console.error('Failed to save AI test result:', e); }
        }
    };
    const score = questions.reduce((acc, q, i) => answers[i] === q.answer ? acc + 1 : acc, 0);

    const startNewTest = () => { setQuestions([]); setIdx(0); setAnswers({}); setRevealed({}); setSubmitted(false); setTotalQ(10); setCustomPrompt(''); setSelectedChapters([]); setError(null); setShowExitConfirm(false); setCurrentStep(1); };

    if (authLoading || planLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950"><img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-16 h-16 animate-pulse" /></div>;
    }
    if (!user) {
        return <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950"><Link to="/login"><Button>Sign In</Button></Link></div>;
    }

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden">
            <Seo title="AI Test Generator" description="Create custom AI practice tests on Medmacs App." canonical="https://medistics.app/ai/test-generator" />

            {/* Background decoration */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/5 rounded-full blur-[120px] pointer-events-none" />

            <header ref={headerRef} className={`fixed top-0 left-0 right-0 z-[110] bg-background/50 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard"><Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110"><ArrowLeft className="h-5 w-5" /></Button></Link>
                    <div className="flex items-center gap-2">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
                        <span className="text-lg font-black">Medmacs.App</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col items-center px-4 py-8 mt-20 pb-[env(safe-area-inset-bottom)] overflow-y-auto w-full relative z-10">
                <div className="w-full max-w-2xl">
                    {/* No Access */}
                    {!hasAccess && (
                        <div className="text-center py-16 space-y-6">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 rounded-full" />
                                <div className="relative bg-gradient-to-br from-blue-600 to-indigo-600 p-5 rounded-3xl shadow-xl">
                                    <Crown className="w-10 h-10 text-white" />
                                </div>
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Upgrade Required</h2>
                            <p className="text-sm text-muted-foreground">Upgrade to <span className="font-bold text-primary">Premium</span> to access AI Test Generator.</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link to="/pricing"><Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl h-11 px-8 font-black uppercase text-xs tracking-widest">Upgrade Plan</Button></Link>
                                <Link to="/dashboard"><Button variant="outline" className="rounded-2xl h-11 px-8 font-black uppercase text-xs tracking-widest">Dashboard</Button></Link>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Subject Selection */}
                    {hasAccess && questions.length === 0 && currentStep === 1 && (
                        <div>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-black text-foreground uppercase tracking-tight italic">Select <span className="text-blue-600">Subject</span></h1>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">{userYear.toUpperCase()} Professional Year</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {availableTopics.map(topic => (
                                    <div key={topic} onClick={() => handleChapterToggle(topic)}
                                        className={`relative overflow-hidden rounded-[1.5rem] p-4 shadow-xl cursor-pointer transition-all duration-300 ${selectedChapters.includes(topic)
                                            ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white'
                                            : 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white/90'
                                            }`}>
                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                                        <div className="relative z-10 flex items-center gap-3">
                                            <Checkbox checked={selectedChapters.includes(topic)} className="border-white data-[state=checked]:bg-white data-[state=checked]:text-slate-900" />
                                            <span className="font-bold text-sm">{topic}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {error && <p className="text-destructive text-sm text-center mt-4">{error}</p>}
                            <Button onClick={handleConfirmChapters} disabled={selectedChapters.length !== 1} className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl h-12 font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all">
                                Confirm Subject
                            </Button>
                        </div>
                    )}

                    {/* Step 2: Question Count */}
                    {hasAccess && questions.length === 0 && currentStep === 2 && (
                        <div>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-black text-foreground uppercase tracking-tight italic">How <span className="text-blue-600">Many</span>?</h1>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">Select number of questions</p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                {[2, 5, 10].map(num => (
                                    <div key={num} onClick={() => setTotalQ(num)}
                                        className={`relative overflow-hidden rounded-[1.5rem] p-4 shadow-xl cursor-pointer transition-all duration-300 text-center ${totalQ === num
                                            ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white'
                                            : 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white/90'
                                            }`}>
                                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                                        <span className="relative z-10 font-black text-lg">{num}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3 mt-6">
                                <Button onClick={() => setCurrentStep(1)} variant="outline" className="flex-1 rounded-2xl h-12 font-black uppercase text-xs tracking-widest">Back</Button>
                                <Button onClick={handleConfirmQuestions} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl h-12 font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all">Confirm</Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Custom Prompt */}
                    {hasAccess && questions.length === 0 && currentStep === 3 && (
                        <div>
                            <div className="text-center mb-8">
                                <h1 className="text-2xl font-black text-foreground uppercase tracking-tight italic">Custom <span className="text-blue-600">Prompt</span></h1>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">Optional instructions for AI</p>
                            </div>
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-2xl p-1 mb-6">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                                <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10">
                                    <textarea rows={5} placeholder="e.g., 'Focus on anatomy questions'..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                                        className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30" />
                                </div>
                            </div>
                            {loading > 0 && <Progress value={loading} className="h-2 mb-4 rounded-full" />}
                            {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}
                            <div className="flex gap-3">
                                <Button onClick={() => setCurrentStep(2)} variant="outline" className="flex-1 rounded-2xl h-12 font-black uppercase text-xs tracking-widest">Back</Button>
                                <Button onClick={fetchAll} disabled={loading > 0} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl h-12 font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 transition-all">
                                    {loading > 0 ? `Generating (${loadTime}s)…` : 'Start Test'}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Test Taking */}
                    {hasAccess && questions.length > 0 && currentStep === 4 && (
                        <div className="flex flex-col flex-1 w-full max-w-2xl">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="flex flex-col flex-1"
                                >
                                    {/* Question Header Info */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">Question {idx + 1} of {questions.length}</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                                                    <Sparkles className="w-3 h-3 text-blue-500" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500">AI Generated</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => setShowExitConfirm(true)} className="w-10 h-10 rounded-2xl bg-muted/40 backdrop-blur-md hover:bg-muted/60 text-muted-foreground">
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>

                                    {/* Question Text */}
                                    <h2 className="text-xl sm:text-2xl font-black text-foreground leading-[1.3] tracking-tight mb-8">
                                        {questions[idx].question}
                                    </h2>

                                    {/* Options List */}
                                    <div className="space-y-4 mb-8">
                                        {questions[idx].options.map((opt, i) => {
                                            const isSelected = answers[idx] === opt;
                                            const isCorrectOption = opt === questions[idx].answer;
                                            const isRevealed = revealed[idx];

                                            let state: 'default' | 'selected' | 'correct' | 'incorrect' = 'default';
                                            if (isRevealed) {
                                                if (isCorrectOption) state = 'correct';
                                                else if (isSelected) state = 'incorrect';
                                            } else if (isSelected) {
                                                state = 'selected';
                                            }

                                            // Bounce if correct, shake if selected and wrong
                                            let animation: any = {};
                                            if (isRevealed) {
                                                if (isCorrectOption) {
                                                    animation = { scale: [1, 1.08, 1], transition: { duration: 0.4 } };
                                                } else if (isSelected) {
                                                    animation = { x: [-6, 6, -6, 6, 0], transition: { duration: 0.4 } };
                                                }
                                            }

                                            return (
                                                <motion.button
                                                    key={i}
                                                    onClick={() => select(idx, opt)}
                                                    disabled={isRevealed}
                                                    animate={animation}
                                                    whileTap={{ scale: 0.98 }}
                                                    className={`group relative w-full p-5 rounded-[1.8rem] text-left border-2 transition-all duration-300 ${state === 'default'
                                                            ? 'bg-muted/10 border-transparent hover:bg-muted/20 hover:border-muted'
                                                            : state === 'selected'
                                                                ? 'bg-blue-500/10 border-blue-500 shadow-[0_10px_30px_rgba(59,130,246,0.1)]'
                                                                : state === 'correct'
                                                                    ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.15)] z-20 scale-[1.01]'
                                                                    : 'bg-destructive/10 border-destructive shadow-[0_10px_25px_rgba(239,68,68,0.15)]'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1 flex gap-4 items-start">
                                                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black transition-colors shrink-0 ${state === 'default' ? 'bg-muted/20 text-muted-foreground' :
                                                                    state === 'correct' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                                                                        state === 'incorrect' ? 'bg-destructive text-white shadow-lg shadow-destructive/30' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                                }`}>
                                                                {String.fromCharCode(65 + i)}
                                                            </span>
                                                            <span className={`text-base font-bold leading-snug transition-colors ${state === 'default' ? 'text-foreground/80' :
                                                                    state === 'correct' ? 'text-emerald-700 dark:text-emerald-300' :
                                                                        state === 'incorrect' ? 'text-destructive' : 'text-blue-600'
                                                                }`}>
                                                                {opt}
                                                            </span>
                                                        </div>
                                                        <div className="shrink-0">
                                                            {isRevealed && isCorrectOption && <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}><CheckCircle className="w-5 h-5 text-emerald-500" /></motion.div>}
                                                            {isRevealed && isSelected && !isCorrectOption && <motion.div initial={{ scale: 0, rotate: 20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring" }}><XCircle className="w-5 h-5 text-destructive" /></motion.div>}
                                                        </div>
                                                    </div>
                                                </motion.button>
                                            );
                                        })}
                                    </div>

                                    {/* Explanation / Result */}
                                    {revealed[idx] && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mb-8 p-6 rounded-[2rem] bg-muted/20 border border-border/40 backdrop-blur-md"
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${answers[idx] === questions[idx].answer ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                                                    {answers[idx] === questions[idx].answer ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                                                </div>
                                                <h4 className="text-xs font-black uppercase tracking-widest text-foreground">
                                                    {answers[idx] === questions[idx].answer ? 'Correct Answer' : 'Incorrect Answer'}
                                                </h4>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed font-medium mt-2">
                                                {questions[idx].explanation}
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Test Navigation Footer */}
                                    <div className="flex items-center gap-4 mt-auto pt-6 border-t border-border/20">
                                        <Button
                                            variant="ghost"
                                            onClick={prev}
                                            disabled={idx === 0}
                                            className="flex-1 max-w-[120px] rounded-2xl h-14 bg-muted/40 backdrop-blur-sm text-foreground font-bold hover:bg-muted/60 disabled:opacity-20"
                                        >
                                            Previous
                                        </Button>

                                        {!revealed[idx] ? (
                                            <Button
                                                onClick={revealAnswer}
                                                disabled={!answers[idx]}
                                                className="flex-1 rounded-2xl h-14 bg-blue-600 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                Submit Answer
                                            </Button>
                                        ) : (
                                            idx < questions.length - 1 ? (
                                                <Button
                                                    onClick={next}
                                                    className="flex-1 rounded-2xl h-14 bg-foreground text-background font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    Next Question
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={submit}
                                                    className="flex-1 rounded-2xl h-14 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    Finish Test
                                                </Button>
                                            )
                                        )}
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Best of Luck Wish */}
                            <div className="mt-12 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <h3 className="text-2xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
                                    Best of Luck, {profile?.username || 'Student'}!
                                </h3>
                                <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-400">
                                    Prepared specifically for {profile?.full_name}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Score */}
                    {hasAccess && currentStep === 5 && (
                        <div className="text-center py-8">
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-2xl p-1 mb-8">
                                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                                <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-8 border border-white/10">
                                    <h2 className="text-xl font-black uppercase tracking-tight mb-6">Test Completed! 🎉</h2>
                                    <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
                                        <span className="text-5xl font-black">{score}</span>
                                    </div>
                                    <p className="text-lg font-bold">out of {questions.length}</p>
                                    <p className="text-sm text-white/70 mt-1">Accuracy: {questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%</p>
                                </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Button onClick={startNewTest} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest">New Test</Button>
                                <Link to="/dashboard"><Button variant="outline" className="rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest">Dashboard</Button></Link>
                            </div>
                        </div>
                    )}

                    {/* Exit Modal */}
                    {showExitConfirm && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                                <h3 className="text-lg font-black text-foreground">Confirm Exit</h3>
                                <p className="text-sm text-muted-foreground">Your progress will be lost. Are you sure?</p>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowExitConfirm(false)}>Cancel</Button>
                                    <Button className="flex-1 rounded-xl bg-destructive text-destructive-foreground" onClick={startNewTest}>Exit Test</Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AITestGenerator;