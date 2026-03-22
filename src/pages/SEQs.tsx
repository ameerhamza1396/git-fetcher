import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Moon, Sun, FileText, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';
import PlanBadge from '@/components/PlanBadge';
import { motion } from 'framer-motion';

const SEQs = () => {
    const { user } = useAuth();

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

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/30 backdrop-blur-md border-b border-border/50 pt-[env(safe-area-inset-top)]">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link
                        to="/dashboard"
                        className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex items-center space-x-3">
                        <img
                            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                            alt="Medmacs Logo"
                            className="w-8 h-8 object-contain"
                        />
                        <span className="text-xl font-black tracking-tight text-foreground">
                            Practice <span className="text-primary text-shimmer">SEQs</span>
                        </span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 flex flex-col items-center justify-center min-h-screen pt-[calc(80px+env(safe-area-inset-top))]">
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

                {/* Footer Copyright */}
                <footer className="absolute bottom-8 text-center w-full px-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
                        © 2026 HMACS Studios all rights reserved
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default SEQs;
