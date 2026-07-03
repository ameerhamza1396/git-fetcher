// @ts-nocheck
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, Crown, Zap, Star, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';
import PageSkeleton from '@/components/skeletons/PageSkeleton';

interface SupabasePlan {
    id: string;
    name: string;
    display_name: string;
    type: 'monthly' | 'yearly';
    currency: 'PKR' | 'USD';
    price: number;
    original_price: number | null;
    features: string[];
    is_popular: boolean;
    order: number;
}

interface GroupedPlan {
    name: string;
    display: string;
    id: string;
    popular: boolean;
    monthly: {
        PKR: { price: string; originalPrice: string | null; features: string[] };
        USD: { price: string; originalPrice: string | null; features: string[] };
    };
    yearly: {
        PKR: { price: string; originalPrice: string | null; features: string[] };
        USD: { price: string; originalPrice: string | null; features: string[] };
    };
}

const planStyles: { [key: string]: { gradient: string; accent: string; icon: any; glow: string; ring: string } } = {
    free: {
        gradient: 'from-slate-700 via-slate-800 to-slate-950',
        accent: 'bg-slate-200',
        icon: <Shield className="w-8 h-8 text-slate-100" />,
        glow: 'bg-slate-300',
        ring: 'ring-slate-300/30',
    },
    premium: {
        gradient: 'from-[#2dd4bf] via-[#0ea5e9] to-[#155e75]',
        accent: 'bg-[#67e8f9]',
        icon: <Star className="w-8 h-8 text-[#cffafe]" />,
        glow: 'bg-[#2dd4bf]',
        ring: 'ring-[#2dd4bf]/35',
    },
    iconic: {
        gradient: 'from-[#0f766e] via-[#0e7490] to-[#1e3a8a]',
        accent: 'bg-amber-300',
        icon: <Crown className="w-8 h-8 text-amber-200" />,
        glow: 'bg-amber-400',
        ring: 'ring-amber-300/35',
    },
    pro: {
        gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
        accent: 'bg-emerald-200',
        icon: <Zap className="w-8 h-8 text-emerald-100" />,
        glow: 'bg-emerald-300',
        ring: 'ring-emerald-300/35',
    },
};

const Pricing = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const [isMonthly, setIsMonthly] = useState(true);
    const [activePlanId, setActivePlanId] = useState<string>('free');
    const [headerVisible, setHeaderVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setHeaderVisible(currentScrollY < lastScrollY.current || currentScrollY < 10);
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const { data: fetchedPlans, isLoading: arePlansLoading } = useQuery<SupabasePlan[]>({
        queryKey: ['pricingPlans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pricing_plans')
                .select('*')
                .order('order', { ascending: true });
            if (error) throw new Error('Could not load pricing plans.');
            return data || [];
        },
    });

    const { data: profile, isLoading: isProfileLoading } = useQuery<{ plan: string } | null>({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('plan')
                .eq('id', user.id)
                .maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!user?.id,
    });

    const currentUserPlan = profile?.plan?.toLowerCase() || 'free';

    const plans: GroupedPlan[] = useMemo(() => {
        if (!fetchedPlans) return [];
        const grouped: { [key: string]: GroupedPlan } = {};

        fetchedPlans.forEach((p) => {
            if (!grouped[p.name]) {
                grouped[p.name] = {
                    name: p.name,
                    display: p.display_name,
                    id: p.name,
                    popular: p.is_popular,
                    monthly: {
                        PKR: { price: '', originalPrice: null, features: [] },
                        USD: { price: '', originalPrice: null, features: [] },
                    },
                    yearly: {
                        PKR: { price: '', originalPrice: null, features: [] },
                        USD: { price: '', originalPrice: null, features: [] },
                    },
                };
            }

            const priceDetails = {
                price: p.name === 'free' ? '0' : p.price.toString(),
                originalPrice: p.original_price ? p.original_price.toString() : null,
                features: p.features,
            };

            if (p.type === 'monthly') {
                grouped[p.name].monthly[p.currency as 'PKR' | 'USD'] = priceDetails;
            } else if (p.type === 'yearly') {
                grouped[p.name].yearly[p.currency as 'PKR' | 'USD'] = priceDetails;
            }
        });

        return Object.values(grouped).sort((a, b) => {
            const orderA = fetchedPlans.find((p) => p.name === a.name)?.order || 99;
            const orderB = fetchedPlans.find((p) => p.name === b.name)?.order || 99;
            return orderA - orderB;
        });
    }, [fetchedPlans]);

    // IntersectionObserver: update activePlanId as user scrolls vertically
    useEffect(() => {
        if (!plans.length) return;

        const observers: IntersectionObserver[] = [];

        plans.forEach((plan) => {
            const el = cardRefs.current[plan.id];
            if (!el) return;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setActivePlanId(plan.id);
                    }
                },
                { threshold: 0.5 }
            );
            observer.observe(el);
            observers.push(observer);
        });

        return () => observers.forEach((o) => o.disconnect());
    }, [plans]);

    if (isAuthLoading || isProfileLoading || arePlansLoading) {
        return <PageSkeleton />;
    }

    const ActiveFallingIcon = activePlanId === 'premium' ? Star
        : activePlanId === 'iconic' ? Crown
            : activePlanId === 'pro' ? Zap
                : Shield;

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0a2e2e] via-[#0f172a] to-[#020617] relative overflow-x-hidden selection:bg-[#2dd4bf]/30 text-white">
            <Seo title="Pricing Plans" />

            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div 
                    animate={{ 
                        x: [0, 100, 0], 
                        y: [0, 50, 0],
                        rotate: [0, 120, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#2dd4bf]/15 blur-[120px]"
                />
                <motion.div 
                    animate={{ 
                        x: [0, -120, 0], 
                        y: [0, 80, 0],
                        rotate: [0, -90, 0]
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[#0ea5e9]/15 blur-[120px]"
                />

                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)`
                }} />
                
                {Array.from({ length: 8 }).map((_, i) => (
                    <motion.div
                        key={`icon-${i}`}
                        initial={{
                            y: -100,
                            x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
                            opacity: 0,
                            rotate: Math.random() * 360
                        }}
                        animate={{
                            y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                            opacity: [0, 0.15, 0.15, 0],
                            rotate: Math.random() * 360 + 360
                        }}
                        transition={{
                            duration: Math.random() * 12 + 18,
                            repeat: Infinity,
                            ease: 'linear',
                            delay: Math.random() * -25
                        }}
                        className="absolute text-white/10"
                    >
                        <ActiveFallingIcon size={Math.random() * 32 + 16} />
                    </motion.div>
                ))}
            </div>

            <div
                className={`fixed top-0 left-0 right-0 z-50 bg-[#07171f]/75 backdrop-blur-2xl border-b border-white/10 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="container mx-auto px-5 h-14 flex justify-between items-center max-w-2xl">
                    <Link to="/dashboard">
                        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 text-white/70 hover:text-white hover:bg-white/10">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
                        <span className="text-lg font-black text-white">Pricing</span>
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            <main className="relative z-10 container mx-auto px-5 lg:px-8 py-10 max-w-2xl mt-[var(--header-height)] pb-[env(safe-area-inset-bottom)]">
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md mb-5">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#2dd4bf]">Medmacs Plans</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4 leading-[0.95]">
                        Choose Your <br/><span className="text-[#2dd4bf]">Plan</span>
                    </h1>
                    <p className="text-white/50 font-medium max-w-xl mx-auto mb-8 text-sm">
                        High-performance tools for future medical professionals.
                    </p>

                    <div className="inline-flex items-center p-1.5 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl shadow-black/10">
                        <button
                            onClick={() => setIsMonthly(true)}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${isMonthly ? 'bg-white text-[#0f766e] shadow-xl scale-105' : 'text-white/50 hover:text-white'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsMonthly(false)}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${!isMonthly ? 'bg-white text-[#0f766e] shadow-xl scale-105' : 'text-white/50 hover:text-white'}`}
                        >
                            Yearly
                        </button>
                    </div>
                </motion.div>

                <div className="flex flex-col gap-6">
                    {plans.map((plan, index) => {
                        const style = planStyles[plan.id] || planStyles.free;
                        const currentPlanDetails = isMonthly ? plan.monthly.PKR : plan.yearly.PKR;
                        const displayPrice = plan.id === 'free' ? '0' : currentPlanDetails.price;
                        const originalPrice = plan.id === 'free' ? null : currentPlanDetails.originalPrice;
                        const isUserOnPaidPlan = currentUserPlan !== 'free';
                        const isFreePlanAndPaidUser = plan.id === 'free' && isUserOnPaidPlan;
                        const isActive = activePlanId === plan.id;

                        return (
                            <motion.div
                                key={plan.id}
                                ref={(el) => { cardRefs.current[plan.id] = el; }}
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: index * 0.1 }}
                                className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${style.gradient} text-white shadow-2xl flex flex-col p-2 ring-4 transition-all duration-500 ${isActive ? `${style.ring} scale-[1.01]` : 'ring-transparent scale-100'}`}
                            >
                                {/* Background texture */}
                                <div className="absolute inset-0 opacity-10" style={{
                                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                }} />

                                {/* Popular badge */}
                                {plan.popular && (
                                    <motion.div
                                        animate={{ boxShadow: ['0px 0px 0px rgba(255,255,255,0)', '0px 0px 20px rgba(255,255,255,0.4)', '0px 0px 0px rgba(255,255,255,0)'] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full"
                                    >
                                        <Badge className="bg-white/20 backdrop-blur-md text-white border-white/20 uppercase text-[10px] tracking-[0.2em] font-bold px-4 py-1.5 shadow-lg">
                                            Most Popular
                                        </Badge>
                                    </motion.div>
                                )}

                                <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-[2.3rem] border border-white/10 shadow-inner">
                                    {/* Header row */}
                                    <div className="flex items-center gap-5 p-6 pb-4">
                                        <div className="relative shrink-0">
                                            <div className={`absolute inset-0 ${style.glow} blur-2xl opacity-50 rounded-full`} />
                                            <motion.div
                                                animate={{ y: [0, -5, 0] }}
                                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                                                className="relative bg-white/15 p-3 rounded-2xl backdrop-blur-md border border-white/20"
                                            >
                                                {style.icon}
                                            </motion.div>
                                        </div>

                                        <div className="flex-1">
                                            <h2 className="text-2xl font-black italic uppercase tracking-tighter drop-shadow-md">
                                                {plan.display}
                                            </h2>
                                            <div className={`h-1 w-10 ${style.accent} rounded-full mt-1.5`} />
                                        </div>

                                        {/* Price */}
                                        <div className="text-right shrink-0">
                                            {originalPrice && (
                                                <span className="text-xs opacity-60 line-through font-bold block mb-0.5">
                                                    Rs.{originalPrice}
                                                </span>
                                            )}
                                            <div className="flex items-baseline gap-0.5 justify-end">
                                                <span className="text-base font-bold opacity-80">Rs.</span>
                                                <span className="text-4xl font-black tracking-tight">{displayPrice}</span>
                                            </div>
                                            <span className="text-[10px] opacity-60 font-bold uppercase tracking-widest">/{isMonthly ? 'mo' : 'yr'}</span>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="px-6 pb-2">
                                        <ul className="space-y-3">
                                            {currentPlanDetails.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3 text-sm font-semibold leading-snug">
                                                    <CheckCircle2 className={`h-5 w-5 shrink-0 ${style.accent.replace('bg-', 'text-')} opacity-90 mt-0.5`} />
                                                    <span className="text-white/90">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* CTA */}
                                    <div className="p-4 pt-5">
                                        {currentUserPlan === plan.id ? (
                                            <Button disabled className="w-full bg-white/10 border border-white/20 text-white rounded-2xl h-14 uppercase font-bold text-xs tracking-widest">
                                                Active Plan ✓
                                            </Button>
                                        ) : isFreePlanAndPaidUser ? (
                                            <Button disabled className="w-full bg-white/5 border border-white/10 text-white/40 rounded-2xl h-14 uppercase font-bold text-xs tracking-widest">
                                                You are on a paid plan
                                            </Button>
                                        ) : (
                                            <Link
                                                to={plan.id === 'free' ? '/dashboard' : '/checkout'}
                                                className="block"
                                                state={plan.id === 'free' ? undefined : {
                                                    planName: plan.display,
                                                    price: displayPrice,
                                                    duration: isMonthly ? 'Monthly' : 'Yearly',
                                                    validity: isMonthly ? 'monthly' : 'yearly',
                                                    currency: 'PKR',
                                                    planId: plan.id
                                                }}
                                            >
                                                <Button className="w-full bg-white text-slate-900 hover:bg-white/90 hover:scale-[1.02] transition-all duration-300 rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl">
                                                    {plan.id === 'free' ? 'Continue with Free' : 'Upgrade Now →'}
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="mt-14 space-y-4 pb-12 text-center">
                    <p className="text-[10px] text-white/35 uppercase tracking-[0.4em] font-black">
                        All prices in PKR · Secure checkout · Cancel anytime
                    </p>
                    <p className="mx-auto max-w-md text-xs font-semibold leading-relaxed text-white/45">
                        International payments are not yet supported. For further details contact us at{' '}
                        <a href="mailto:billing@medmacs.app" className="text-[#2dd4bf] underline underline-offset-4">
                            billing@medmacs.app
                        </a>
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Pricing;
