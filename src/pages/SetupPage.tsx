import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight, ChevronLeft, Zap, BarChart3,
    Trophy, Swords, Bot, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
    {
        title: "Largest MCQ Collection",
        description: "Attempt the MCQs from the largest collection in Pakistan, tailored for your success.",
        mascot: "/mascots/Mascot1.png",
        screen: "/screenMedia/screen7.png",
        icon: <Zap className="w-20 h-20 text-yellow-400/80" />,
        gradient: "from-blue-600 via-indigo-700 to-purple-800"
    },
    {
        title: "Track Performance",
        description: "Monitor your progress and identify weak spots through deep in-app Analysis.",
        mascot: "/mascots/Mascot10.png",
        screen: "/screenMedia/screen17.png",
        icon: <BarChart3 className="w-20 h-20 text-green-400/80" />,
        gradient: "from-emerald-600 via-teal-700 to-cyan-800"
    },
    {
        title: "Rise to the Top",
        description: "Compete with thousands and claim your spot at the top of the National Leaderboard.",
        mascot: "/mascots/Mascot5.png",
        screen: "/screenMedia/screen16.png",
        icon: <Trophy className="w-20 h-20 text-orange-400/80" />,
        gradient: "from-orange-600 via-red-700 to-rose-800"
    },
    {
        title: "Battle Mode",
        description: "Challenge your friends or random opponents in real-time MCQ battles.",
        mascot: "/mascots/Mascot3.png",
        screen: "/screenMedia/screen18.png",
        icon: <Swords className="w-20 h-20 text-purple-400/80" />,
        gradient: "from-violet-600 via-purple-700 to-fuchsia-800"
    },
    {
        title: "Meet Dr. Ahroid",
        description: "Your personal AI companion, ready to solve doubts and guide your study path.",
        mascot: "/mascots/Mascot6.png",
        screen: "/screenMedia/screen11.png",
        icon: <Bot className="w-20 h-20 text-blue-300/80" />,
        gradient: "from-slate-800 via-blue-900 to-indigo-950"
    }
];

const SetupWizard = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const navigate = useNavigate();

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) setCurrentStep(prev => prev + 1);
        else completeSetup();
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const completeSetup = () => {
        localStorage.setItem('hasSeenWizard', 'true');
        navigate('/');
    };

    const step = STEPS[currentStep];

    return (
        <div className={`relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden transition-colors duration-700 bg-gradient-to-br ${step.gradient}`}>

            {/* Skip Button */}
            <button
                onClick={completeSetup}
                className="absolute top-8 right-8 z-50 text-white/50 hover:text-white transition-opacity text-sm font-bold uppercase tracking-widest"
            >
                Skip
            </button>

            {/* Visual Composition */}
            <div className="relative w-full max-w-5xl h-[45vh] flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-full h-full flex items-center justify-center"
                    >
                        {/* 1. Mobile Screen (Tilted to the other side) */}
                        <motion.div
                            initial={{ x: -100, opacity: 0, rotate: -5 }}
                            animate={{ x: -80, opacity: 0.4, rotate: 15 }}
                            exit={{ x: -150, opacity: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="absolute left-[15%] md:left-[20%] z-10 w-48 md:w-72"
                        >
                            <img src={step.screen} alt="" className="rounded-[2.5rem] shadow-2xl border-8 border-white/5" />
                        </motion.div>

                        {/* 2. Larger Icon (Positioned at bottom) */}
                        <motion.div
                            initial={{ y: 50, scale: 0.5, opacity: 0 }}
                            animate={{ y: 120, scale: 1.2, opacity: 0.3 }}
                            exit={{ y: 100, opacity: 0 }}
                            transition={{ delay: 0.1, duration: 0.3, type: "spring" }}
                            className="absolute z-0"
                        >
                            {step.icon}
                        </motion.div>

                        {/* 3. Mascot (Front & Central) */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 1.1, opacity: 0 }}
                            transition={{ duration: 0.35, ease: "backOut" }}
                            className="absolute z-30 w-64 md:w-96"
                        >
                            <img src={step.mascot} alt="Mascot" className="drop-shadow-[0_25px_50px_rgba(0,0,0,0.6)]" />
                        </motion.div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Content Area */}
            <div className="relative z-40 text-center px-8 max-w-3xl mt-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -30, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter italic">
                            {step.title}
                        </h2>
                        <p className="text-white/70 text-lg md:text-2xl mb-12 font-medium leading-tight max-w-xl mx-auto">
                            {step.description}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-8">
                    <div className={`flex items-center gap-4 w-full max-w-md transition-all duration-300 ${currentStep > 0 ? 'justify-between' : 'justify-center'}`}>

                        {/* Back Button (Only shows from screen 2) */}
                        <AnimatePresence>
                            {currentStep > 0 && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0, x: -20 }}
                                    animate={{ width: "48%", opacity: 1, x: 0 }}
                                    exit={{ width: 0, opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <Button
                                        onClick={handleBack}
                                        variant="outline"
                                        className="w-full h-16 rounded-2xl border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 text-lg font-bold"
                                    >
                                        <ChevronLeft className="mr-2 h-5 w-5" /> Back
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Next/Finish Button */}
                        <motion.div
                            layout
                            className={currentStep > 0 ? "w-[48%]" : "w-full"}
                            transition={{ duration: 0.3 }}
                        >
                            <Button
                                onClick={handleNext}
                                className="w-full h-16 rounded-2xl bg-white text-black hover:bg-slate-100 text-lg font-black shadow-2xl transition-transform active:scale-95"
                            >
                                {currentStep === STEPS.length - 1 ? (
                                    <span className="flex items-center gap-2">Finish <Sparkles className="h-5 w-5 fill-black" /></span>
                                ) : (
                                    <span className="flex items-center gap-2">Next <ChevronRight className="h-6 w-6" /></span>
                                )}
                            </Button>
                        </motion.div>
                    </div>

                    {/* Stepper Dots */}
                    <div className="flex gap-3">
                        {STEPS.map((_, idx) => (
                            <motion.div
                                key={idx}
                                animate={{
                                    scale: idx === currentStep ? 1.2 : 1,
                                    backgroundColor: idx === currentStep ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.2)"
                                }}
                                className="h-2 w-10 rounded-full"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SetupWizard;