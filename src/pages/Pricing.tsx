// @ts-nocheck
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, ArrowLeft, CheckCircle2, Crown, Zap, Star, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
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
        gradient: 'from-slate-500 via-slate-600 to-slate-700',
        accent: 'bg-slate-300',
        icon: <Shield className="w-8 h-8 text-slate-200" />,
        glow: 'bg-slate-400',
        ring: 'ring-slate-400/40',
    },
    premium: {
        gradient: 'from-blue-600 via-indigo-600 to-violet-700',
        accent: 'bg-yellow-400',
        icon: <Star className="w-8 h-8 text-yellow-300" />,
        glow: 'bg-yellow-400',
        ring: 'ring-blue-500/40',
    },
    iconic: {
        gradient: 'from-rose-600 via-red-600 to-orange-700',
        accent: 'bg-amber-400',
        icon: <Crown className="w-8 h-8 text-amber-300" />,
        glow: 'bg-amber-400',
        ring: 'ring-rose-500/40',
    },
    pro: {
        gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
        accent: 'bg-emerald-300',
        icon: <Zap className="w-8 h-8 text-emerald-200" />,
        glow: 'bg-emerald-400',
        ring: 'ring-emerald-500/40',
    },
};

const Pricing = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isMonthly, setIsMonthly] = useState(true);
    const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
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

    const activeStyle = planStyles[activePlanId] || planStyles.free;
    const ActiveFallingIcon = activePlanId === 'premium' ? Star
        : activePlanId === 'iconic' ? Crown
        : activePlanId === 'pro' ? Zap
        : Shield;

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950 relative overflow-x-hidden">
            <Seo title="Pricing Plans" />

            {/* Subtle animated orbs — fixed, no color changes */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                {/* Falling Icons */}
                {Array.from({ length: 10 }).map((_, i) => (
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
                        className="absolute text-slate-400/20 dark:text-white/5"
                    >
                        <ActiveFallingIcon size={Math.random() * 32 + 16} />
                    </motion.div>
                ))}
                <motion.div
                    animate={{ y: [0, -30, 0], scale: [1, 1.1, 1], opacity: [0.08, 0.2, 0.08] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{ y: [0, 40, 0], scale: [1, 1.2, 1], opacity: [0.08, 0.2, 0.08] }}
                    transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="absolute bottom-1/3 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]"
                />
            </div>

            {/* Header */}
            <header className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110" onClick={() => window.history.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-8 h-8" />
                        <span className="text-xl font-bold">Pricing</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {['PKR', 'USD'].map((cur) => (
                                <button
                                    key={cur}
                                    onClick={() => setCurrency(cur as 'PKR' | 'USD')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${currency === cur ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
                                >
                                    {cur}
                                </button>
                            ))}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-9 h-9 p-0">
                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        {user ? <ProfileDropdown /> : <Link to="/login"><Button size="sm">Sign In</Button></Link>}
                    </div>
                </div>
            </header>

            <main className="relative z-10 container mx-auto px-4 lg:px-8 py-10 max-w-2xl mt-[var(--header-height)]">
                {/* Hero Title */}
                <motion.div
                    className="text-center mb-10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white mb-3 italic uppercase">
                        Choose Your <span className="text-blue-600 dark:text-blue-400">Path</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto mb-6 uppercase text-xs tracking-[0.2em]">
                        High-performance plans for future medical professionals
                    </p>

                    {/* Monthly / Yearly Toggle */}
                    <div className="inline-flex items-center p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setIsMonthly(true)}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${isMonthly ? 'bg-white dark:bg-gray-700 shadow-xl text-blue-600' : 'text-slate-500'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsMonthly(false)}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${!isMonthly ? 'bg-white dark:bg-gray-700 shadow-xl text-blue-600' : 'text-slate-500'}`}
                        >
                            Yearly
                        </button>
                    </div>
                </motion.div>

                {/* Vertically stacked plan cards */}
                <div className="flex flex-col gap-6">
                    {plans.map((plan, index) => {
                        const style = planStyles[plan.id] || planStyles.free;
                        const currentPlanDetails = isMonthly ? plan.monthly[currency] : plan.yearly[currency];
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
                                                    {currency === 'PKR' ? 'Rs.' : '$'}{originalPrice}
                                                </span>
                                            )}
                                            <div className="flex items-baseline gap-0.5 justify-end">
                                                <span className="text-base font-bold opacity-80">{currency === 'PKR' ? 'Rs.' : '$'}</span>
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
                                            <Button disabled className="w-full bg-white/10 border border-white/20 text-white rounded-2xl h-13 uppercase font-bold text-xs tracking-widest">
                                                Active Plan ✓
                                            </Button>
                                        ) : isFreePlanAndPaidUser ? (
                                            <Button disabled className="w-full bg-white/5 border border-white/10 text-white/40 rounded-2xl h-13 uppercase font-bold text-xs tracking-widest">
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
                                                    currency,
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

                <p className="text-center text-xs text-slate-400 dark:text-slate-600 mt-10 pb-8 uppercase tracking-widest">
                    All prices in {currency} · Secure checkout
                </p>
            </main>
        </div>
    );
};

export default Pricing;