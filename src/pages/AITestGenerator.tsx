// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Crown, ArrowLeft, ArrowRight, X, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { Checkbox } from '@/components/ui/checkbox';
import Seo from '@/components/Seo';
import PlanBadge from '@/components/PlanBadge';
import { AIProgressTracker } from '@/components/ai/AIProgressTracker';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
    question: string;
    options: string[];
    answer: string;
    explanation: string;
}

const topicMapping = (subjectCode: string): string => {
    const map: { [key: string]: string } = {
        "FND1": "Foundation", "HEM1": "Hematology", "LCM1": "Locomotion", "RSP1": "Respiratory System", "CVS1": "Cardiovascular System",
        "NEU1": "Neurosciences", "HNN1": "Head, Neck, and Special Senses", "END1": "Endocrinology", "GIL1": "Gastrointestinal Tract (GIT)", "EXC1": "Renal and Excretory System", "REP1": "Reproductive System",
        "FND2": "Foundation II", "IDD1": "Infectious Diseases", "HEM2": "Hematology II", "RSP2": "Respiratory System II", "CVS2": "Cardiovascular System II", "GIL2": "GIT and Liver II", "END2": "Endocrinology II", "EXC2": "Renal and Excretory System II",
        "ORT2": "Orthopedics, Rheumatology, Trauma", "PMR": "Physical Medicine & Rehabilitation", "DPS": "Dermatology, Plastic Surgery/Burns", "GEN": "Genetics", "REP2": "Reproductive System II", "NEU2": "Neurosciences and Psychiatry", "ENT": "ENT (Otorhinolaryngology)", "OPH": "Ophthalmology",
        "MED": "Medicine Rotation", "SUR": "Surgery Rotation", "GYO": "Gynecology and Obstetrics Rotation", "PAE": "Pediatrics Rotation",
    };
    return map[subjectCode] || subjectCode;
};

const AITestGenerator: React.FC = () => {
    const { user, loading: authLoading } = useAuth();

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

    // Backend subjects from Supabase
    const [aiSubjects, setAiSubjects] = useState<{id: string; subject_code: string; subject_name: string; year: string}[]>([]);
    const [loadingSubjects, setLoadingSubjects] = useState(true);

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
                        // Show exit confirmation if any progress has been made
                        if (currentStep === 4 && !submitted) {
                            setShowExitConfirm(true);
                            return;
                        }
                        if (currentStep === 1 && selectedChapters.length > 0) {
                            setShowExitConfirm(true);
                            return;
                        }
                        if (currentStep === 2 && totalQ > 0) {
                            setShowExitConfirm(true);
                            return;
                        }
                        if (currentStep === 3 && (customPrompt || loading > 0)) {
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

    // Load AI test subjects from Supabase
    useEffect(() => {
        const loadSubjects = async () => {
            setLoadingSubjects(true);
            const { data, error } = await supabase
                .from('ai_test_subjects')
                .select('id, subject_code, subject_name, year')
                .eq('is_active', true)
                .eq('year', userYear)
                .order('subject_name');
            
            if (!error && data) {
                setAiSubjects(data);
            }
            setLoadingSubjects(false);
        };
        if (userYear) loadSubjects();
    }, [userYear]);

    const handleChapterToggle = (chapter: string) => { setSelectedChapters(prev => prev.includes(chapter) ? [] : [chapter]); setError(null); };
    const handleConfirmChapters = () => { if (selectedChapters.length === 1) { setCurrentStep(2); setError(null); } else setError('Please select exactly one subject.'); };
    const handleConfirmQuestions = () => { if (totalQ > 0 && totalQ <= 20) setCurrentStep(3); else setError('Please enter 1-20 questions.'); };

    const fetchAll = async () => {
        setError(null); setLoading(1); setLoadTime(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setLoading(t => { setLoadTime(t + 1); return Math.min(99, t + 10); }), 1000);
        const apiTopic = topicMapping(selectedChapters[0]);
        try {
            const res = await fetch(`https://medmacs.app/api/ai/generate-test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: apiTopic, difficulty: 'medium', count: totalQ, prompt: `Strictly adhere to the syllabus for ${userYear} year and module: ${apiTopic}. ${customPrompt}` }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Status ${res.status}`);
            setQuestions(data.questions); setIdx(0); setAnswers({}); setRevealed({}); setSubmitted(false); setCurrentStep(4);
        } catch (e: any) {
            console.error('AI Test Generation Error:', e);
            let errorMessage = 'Something went wrong. Please try again.';
            if (e.message.includes('network') || e.message.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (e.message.includes('429') || e.message.includes('rate limit')) {
                errorMessage = 'Too many requests. Please wait a moment and try again.';
            } else if (e.message.includes('500') || e.message.includes('server')) {
                errorMessage = 'Server error. Please try again later or contact support.';
            } else if (e.message.includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
            } else if (e.message) {
                errorMessage = e.message;
            }
            setError(errorMessage);
        }
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

            <main className="flex-grow flex flex-col items-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] overflow-y-auto w-full relative z-10">
                <div className="w-full max-w-2xl">
                    {/* No Access */}
                    {!hasAccess && (
                        <div className="text-center py-16 space-y-6">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 rounded-full" />
                                <div className="relative bg-gradient-to-br from-amber-500 to-yellow-500 p-5 rounded-3xl shadow-xl">
                                    <Crown className="w-10 h-10 text-white" />
                                </div>
                            </div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-foreground">Upgrade Required</h2>
                            <p className="text-sm text-muted-foreground">Upgrade to <span className="font-bold text-primary">Premium</span> to access AI Test Generator.</p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <Link to="/pricing"><Button className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl h-11 px-8 font-black uppercase text-xs tracking-widest">Upgrade Plan</Button></Link>
                                <Link to="/dashboard"><Button variant="outline" className="rounded-2xl h-11 px-8 font-black uppercase text-xs tracking-widest">Dashboard</Button></Link>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Subject Selection */}
                    {hasAccess && questions.length === 0 && currentStep === 1 && (
                        <div>
                            {/* Main Title Section */}
                            <div className="text-center mb-6 sm:mb-8 animate-fade-in px-4">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic mb-3">
                                    🧠 AI <span className="text-amber-500">Test</span> Generator
                                </h1>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] max-w-2xl mx-auto">
                                    Create custom AI-powered practice tests on any medical topic
                                </p>
                            </div>

                            {/* AI Test Stats Peek */}
                            <div className="max-w-4xl mx-auto px-4 sm:px-0 mb-6">
                                <AIProgressTracker userId={user?.id} />
                            </div>

                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-4 px-4"
                            >
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-3 block">Step 1 of 3</span>
                            </motion.div>

                            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md -mx-3 sm:mx-0 px-3 sm:px-0">
                                <div className="max-w-4xl mx-auto px-4 sm:px-0">
                                    <div className="pt-4 pb-3">
                                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none text-center">
                                            Select <span className="text-amber-500">Subject</span>
                                        </h2>
                                        <p className="text-muted-foreground text-sm font-medium mt-2 max-w-lg mx-auto text-center">
                                            Choose a subject to generate your AI-powered test
                                        </p>
                                    </div>
                                </div>
                                <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
                            </div>

                            <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {loadingSubjects ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="relative overflow-hidden rounded-3xl bg-muted/20 p-6 animate-pulse border border-border/40">
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl bg-muted" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-5 w-1/3 bg-muted rounded-full" />
                                                    <div className="h-3 w-2/3 bg-muted rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    aiSubjects.map((subject, index) => {
                                        const isSelected = selectedChapters.includes(subject.subject_code);
                                        return (
                                            <motion.div
                                                key={subject.id}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                whileHover={{ scale: 1.02, y: -4 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => handleChapterToggle(subject.subject_code)}
                                                className={`group cursor-pointer relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 ${
                                                    isSelected 
                                                        ? 'border-amber-500 bg-amber-500/5 shadow-2xl shadow-amber-500/10' 
                                                        : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-amber-500/30 hover:bg-amber-500/5'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
                                                )}

                                                <div className="flex items-center gap-5 relative z-10">
                                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl transition-transform duration-300 group-hover:scale-110 ${
                                                        isSelected ? 'bg-amber-500 text-white' : 'bg-muted/50 text-foreground/70'
                                                    }`}>
                                                        📚
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className={`text-xl font-black uppercase italic tracking-tight transition-colors ${
                                                                isSelected ? 'text-amber-500' : 'text-foreground'
                                                            }`}>
                                                                {subject.subject_name}
                                                            </h3>
                                                            {isSelected && (
                                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                            )}
                                                        </div>
                                                        <p className="text-muted-foreground text-xs font-medium leading-relaxed line-clamp-2">
                                                            {subject.subject_code} • AI Generated Test
                                                        </p>
                                                    </div>

                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                        isSelected ? 'bg-amber-500 text-white' : 'bg-muted opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>

                            <AnimatePresence>
                                {selectedChapters.length === 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 100 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 100 }}
                                        className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
                                    >
                                        <div className="w-full max-w-md pointer-events-auto">
                                            <Button
                                                onClick={handleConfirmChapters}
                                                className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-2xl shadow-amber-500/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
                                                size="lg"
                                            >
                                                    Continue to Questions
                                                <motion.div
                                                    animate={{ x: [0, 5, 0] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                >
                                                    <ArrowRight className="w-5 h-5 ml-2" />
                                                </motion.div>
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="text-center pt-20 pb-10 opacity-40">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • AI Test Generator</p>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Question Count */}
                    {hasAccess && questions.length === 0 && currentStep === 2 && (
                        <div>
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-4 px-4"
                            >
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-3 block">Step 2 of 3</span>
                            </motion.div>

                            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md -mx-3 sm:mx-0 px-3 sm:px-0">
                                <div className="max-w-4xl mx-auto px-4 sm:px-0">
                                    <div className="pt-4 pb-3">
                                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none text-center">
                                            Select <span className="text-amber-500">Questions</span>
                                        </h2>
                                        <div className="mt-2 flex flex-col items-center gap-1">
                                            <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">{topicMapping(selectedChapters[0])}</p>
                                            <p className="text-muted-foreground/60 text-[10px] font-medium uppercase tracking-[0.2em]">
                                                {profile?.plan === 'free' ? 'Free daily limits apply' : 'Unlimited Premium Access'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
                            </div>

                            <div className="max-w-4xl mx-auto px-4 sm:px-0">
                                {/* Subject Preview Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.05 }}
                                    className="relative overflow-hidden rounded-3xl border-2 border-amber-500/20 bg-amber-500/5 p-5 mb-8"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 text-2xl">
                                            🧠
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Ready to Start</p>
                                            <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">{topicMapping(selectedChapters[0])}</h3>
                                            <p className="text-muted-foreground text-xs font-medium truncate">
                                                AI Generated Test
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Question Count Options */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {[
                                        { num: 2, label: 'Quick Review', desc: 'Fast practice session' },
                                        { num: 5, label: 'Short Test', desc: 'Brief assessment' },
                                        { num: 10, label: 'Full Practice', desc: 'Comprehensive test' }
                                    ].map((item, idx) => {
                                        const isSelected = totalQ === item.num;
                                        return (
                                            <motion.div
                                                key={item.num}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.1 + idx * 0.04 }}
                                                whileHover={{ scale: 1.02, x: 5 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setTotalQ(item.num)}
                                                className={`group cursor-pointer relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 ${
                                                    isSelected 
                                                        ? 'border-amber-500 bg-amber-500/5 shadow-xl shadow-amber-500/10' 
                                                        : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-amber-500/30 hover:bg-amber-500/5'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/20 blur-[50px] -mr-12 -mt-12 pointer-events-none" />
                                                )}

                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                                        isSelected ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'bg-muted/50 text-foreground/70'
                                                    }`}>
                                                        <span className="font-black text-lg">{item.num}</span>
                                                    </div>
                                                    
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h3 className={`text-sm font-black uppercase italic tracking-tight transition-colors ${
                                                                isSelected ? 'text-amber-500' : 'text-foreground'
                                                            }`}>
                                                                {item.label}
                                                            </h3>
                                                            {isSelected && (
                                                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                                            )}
                                                        </div>
                                                        <p className="text-muted-foreground text-xs font-medium leading-relaxed line-clamp-1">
                                                            {item.desc}
                                                        </p>
                                                    </div>

                                                    <div className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        isSelected ? 'bg-amber-500/10 text-amber-500' : 'bg-muted/50 text-muted-foreground/60 opacity-0 group-hover:opacity-100'
                                                    }`}>
                                                        Qs
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            <AnimatePresence>
                                {totalQ > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 100 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 100 }}
                                        className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
                                    >
                                        <div className="w-full max-w-md pointer-events-auto flex gap-3">
                                            <Button onClick={() => setCurrentStep(1)} variant="outline" className="flex-1 rounded-2xl h-16 font-black uppercase text-sm tracking-[0.2em]">Back</Button>
                                            <Button onClick={handleConfirmQuestions} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl h-16 font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-amber-500/30 group transition-all">
                                                Confirm
                                                <motion.div
                                                    animate={{ x: [0, 5, 0] }}
                                                    transition={{ duration: 1.5, repeat: Infinity }}
                                                >
                                                    <ArrowRight className="w-5 h-5 ml-2" />
                                                </motion.div>
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="text-center pt-20 pb-10 opacity-40">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • AI Test Generator</p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Custom Prompt */}
                    {hasAccess && questions.length === 0 && currentStep === 3 && (
                        <div className="max-w-4xl mx-auto px-4 sm:px-0">
                            <motion.div 
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-4 px-4"
                            >
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-3 block">Step 3 of 3</span>
                            </motion.div>

                            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md -mx-3 sm:mx-0 px-3 sm:px-0">
                                <div className="max-w-4xl mx-auto px-4 sm:px-0">
                                    <div className="pt-4 pb-3">
                                        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none text-center">
                                            Custom <span className="text-amber-500">Prompt</span>
                                        </h2>
                                        <p className="text-muted-foreground text-sm font-medium mt-2 max-w-lg mx-auto text-center">
                                            Optional instructions for AI
                                        </p>
                                    </div>
                                </div>
                                <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
                            </div>

                            {/* Subject Preview Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.05 }}
                                className="relative overflow-hidden rounded-3xl border-2 border-amber-500/20 bg-amber-500/5 p-5 mb-8 mt-4"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-xl shadow-amber-500/30 text-2xl">
                                        🧠
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Generating Test</p>
                                        <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">{topicMapping(selectedChapters[0])}</h3>
                                        <p className="text-muted-foreground text-xs font-medium truncate">
                                            {totalQ} AI Generated Questions
                                        </p>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                                        <ArrowRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Prompt Input */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="mb-6"
                            >
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add Custom Instructions (Optional)</p>
                                </div>
                                <textarea 
                                    rows={4} 
                                    placeholder="e.g., Focus on clinical scenarios, include more diagrams..." 
                                    value={customPrompt} 
                                    onChange={e => setCustomPrompt(e.target.value)}
                                    className="w-full p-4 rounded-2xl border-2 border-border/40 bg-muted/20 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                                />
                            </motion.div>

                            {loading > 0 && <Progress value={loading} className="h-2 mb-4 rounded-full" />}
                            {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}

                            <AnimatePresence>
                                <motion.div
                                    initial={{ opacity: 0, y: 100 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 100 }}
                                    className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
                                >
                                    <div className="w-full max-w-md pointer-events-auto flex gap-3">
                                        <Button onClick={() => setCurrentStep(2)} variant="outline" className="flex-1 rounded-2xl h-16 font-black uppercase text-sm tracking-[0.2em]">Back</Button>
                                        <Button onClick={fetchAll} disabled={loading > 0} className="flex-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl h-16 font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-amber-500/30 group transition-all">
                                            {loading > 0 ? `Generating (${loadTime}s)…` : 'Start Test'}
                                            <motion.div
                                                animate={{ x: [0, 5, 0] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            >
                                                <ArrowRight className="w-5 h-5 ml-2" />
                                            </motion.div>
                                        </Button>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
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
                                                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                                                    <Sparkles className="w-3 h-3 text-amber-500" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500">AI Generated</span>
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
                                                            ? 'bg-amber-500/10 border-amber-500 shadow-[0_10px_30px_rgba(20,184,166,0.1)]'
                                                            : state === 'correct'
                                                                ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.15)] z-20 scale-[1.01]'
                                                                : 'bg-destructive/10 border-destructive shadow-[0_10px_25px_rgba(239,68,68,0.15)]'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex-1 flex gap-4 items-start">
                                                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black transition-colors shrink-0 ${state === 'default' ? 'bg-muted/20 text-muted-foreground' :
                                                                state === 'correct' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' :
                                                                    state === 'incorrect' ? 'bg-destructive text-white shadow-lg shadow-destructive/30' : 'bg-amber-600 text-white shadow-lg shadow-amber-500/30'
                                                                }`}>
                                                                {String.fromCharCode(65 + i)}
                                                            </span>
                                                            <span className={`text-base font-bold leading-snug transition-colors ${state === 'default' ? 'text-foreground/80' :
                                                                state === 'correct' ? 'text-emerald-700 dark:text-emerald-300' :
                                                                    state === 'incorrect' ? 'text-destructive' : 'text-amber-500'
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

                                    {/* Best of Luck Wish */}
                                    <div className="mt-12 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                        <h3 className="text-2xl font-black italic tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
                                            Best of Luck, {profile?.username || 'Student'}!
                                        </h3>
                                        <p className="text-[10px] uppercase tracking-[0.4em] font-bold text-slate-400">
                                            Prepared specifically for {profile?.full_name}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Floating Buttons - appear based on state */}
                                <AnimatePresence>
                                    {!revealed[idx] && answers[idx] && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 100 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 100 }}
                                            className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
                                        >
                                            <div className="w-full max-w-md pointer-events-auto flex gap-3">
                                                <Button
                                                    onClick={revealAnswer}
                                                    className="flex-1 rounded-2xl h-16 bg-amber-600 text-white font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    Submit Answer
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {revealed[idx] && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 100 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 100 }}
                                            className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
                                        >
                                            <div className="w-full max-w-md pointer-events-auto flex gap-3">
                                                <Button
                                                    variant="outline"
                                                    onClick={prev}
                                                    disabled={idx === 0}
                                                    className="flex-1 rounded-2xl h-16 font-black uppercase text-sm tracking-[0.2em]"
                                                >
                                                    Previous
                                                </Button>
                                                {idx < questions.length - 1 ? (
                                                    <Button
                                                        onClick={next}
                                                        className="flex-1 rounded-2xl h-16 bg-foreground text-background font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                    >
                                                        Next Question
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={submit}
                                                        className="flex-1 rounded-2xl h-16 bg-gradient-to-r from-amber-500 to-emerald-500 text-white font-black uppercase text-sm tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                    >
                                                        Finish Test
                                                    </Button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </AnimatePresence>
                        </div>
                    )}

                    {/* Step 5: Score */}
                    {hasAccess && currentStep === 5 && (
                        <div className="text-center py-8">
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 text-white shadow-2xl p-1 mb-8">
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
                                <Button onClick={startNewTest} className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest">New Test</Button>
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