import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Moon, Sun, FileText, Sparkles, Crown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';
import PlanBadge from '@/components/PlanBadge';
import { motion } from 'framer-motion';

const SEQs = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const { data: profile } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('id, plan, year')
                .eq('id', user.id)
                .maybeSingle();
            if (error) throw error;
            return data;
        },
        enabled: !!user?.id
    });

    const plan = profile?.plan?.toLowerCase() || 'free';
    const hasAccess = plan === 'premium';

    // Capacitor back button handler for exit confirmation
    useEffect(() => {
        let isMounted = true;

        const setupBackHandler = async () => {
            try {
                const { Capacitor } = await import('@capacitor/core');
                if (Capacitor.isNativePlatform() && isMounted) {
                    const { App } = await import('@capacitor/app');
                    const backListener = await App.addListener('backButton', () => {
                        setShowExitConfirm(true);
                    });

                    return () => {
                        backListener.remove();
                    };
                }
            } catch (err) {
                console.debug('Capacitor not available');
            }
            return () => { };
        };

        const cleanup = setupBackHandler();
        return () => {
            isMounted = false;
            cleanup.then(fn => fn && fn());
        };
    }, []);

    const handleExit = () => {
        setShowExitConfirm(false);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen w-full bg-background overflow-hidden relative">
            <Seo
                title="Practice SEQs"
                description="Practice Short Essay Questions curated for your medical exams."
                canonical="https://medmacs.app/seqs"
            />

            {/* Background Decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse-slow-reverse" />

            <main className="container mx-auto px-4 flex flex-col items-center justify-center min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
                {/* Premium Lock - Show upgrade prompt instead of Coming Soon */}
                {!hasAccess ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-2xl"
                    >
                        <div className="relative inline-block mb-8">
                            <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 rounded-full animate-pulse" />
                            <div className="relative bg-gradient-to-br from-amber-500 to-yellow-500 p-6 rounded-[2.5rem] shadow-2xl">
                                <Crown className="w-16 h-16 text-white" />
                            </div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight italic">
                            Premium <span className="text-amber-500">Content</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 font-medium">
                            SEQs are available exclusively for <span className="text-foreground font-bold">Premium</span> users. Upgrade your plan to access our curated short essay questions!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link to="/pricing">
                                <Button size="lg" className="rounded-2xl px-12 h-14 font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
                                    Upgrade Plan
                                </Button>
                            </Link>
                            <Link to="/dashboard">
                                <Button size="lg" variant="outline" className="rounded-2xl px-12 h-14 font-black uppercase tracking-widest text-xs">
                                    Dashboard
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="text-center max-w-2xl"
                    >
                        <div className="relative inline-block mb-8">
                            <div className="absolute inset-0 bg-primary blur-2xl opacity-20 rounded-full animate-pulse" />
                            <div className="relative bg-gradient-to-br from-primary to-accent p-6 rounded-[2.5rem] shadow-2xl">
                                <FileText className="w-16 h-16 text-white" />
                            </div>
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute -top-2 -right-2 bg-yellow-400 p-2 rounded-full shadow-lg"
                            >
                                <Sparkles className="w-4 h-4 text-white" />
                            </motion.div>
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black text-foreground mb-6 tracking-tight italic">
                            Coming <span className="text-primary">Soon</span>
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 font-medium">
                            We are curating a high-yield collection of <span className="text-foreground font-bold underline decoration-primary decoration-4 underline-offset-4">SEQs</span> for your institute. Stay tuned!
                        </p>

                        <Link to="/dashboard">
                            <Button size="lg" className="rounded-2xl px-12 h-14 font-black uppercase tracking-widest text-xs shadow-xl hover:scale-105 transition-all bg-gradient-to-r from-primary to-accent">
                                Back to Dashboard
                            </Button>
                        </Link>
                    </motion.div>
                )}

                {/* Footer Copyright */}
                <footer className="absolute bottom-8 text-center w-full px-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
                        © 2026 HMACS Studios all rights reserved
                    </p>
                </footer>
            </main>

            {/* Exit Confirmation Modal */}
            {showExitConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pb-[env(safe-area-inset-bottom)]">
                    <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <h3 className="text-lg font-black text-foreground">Confirm Exit</h3>
                        <p className="text-sm text-muted-foreground">Are you sure you want to leave SEQs?</p>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowExitConfirm(false)}>Cancel</Button>
                            <Button className="flex-1 rounded-xl bg-amber-500 text-white" onClick={handleExit}>Exit</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SEQs;
