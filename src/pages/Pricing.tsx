// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const Pricing = () => {
    const { user, isLoading: isAuthLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isMonthly, setIsMonthly] = useState(true);
    const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
    const [activePlanIndex, setActivePlanIndex] = useState(0);
    const mobileCarouselRef = useRef<HTMLDivElement | null>(null);
    const hasHintedScroll = useRef(false);

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

    const planStyles: { [key: string]: { gradient: string; accent: string; icon: any; glow: string } } = {
        free: {
            gradient: 'from-slate-500 via-slate-600 to-slate-700',
            accent: 'bg-slate-300',
            icon: <Shield className="w-8 h-8 text-slate-200" />,
            glow: 'bg-slate-400'
        },
        premium: {
            gradient: 'from-blue-600 via-indigo-600 to-violet-700',
            accent: 'bg-yellow-400',
            icon: <Star className="w-8 h-8 text-yellow-300" />,
            glow: 'bg-yellow-400'
        },
        iconic: {
            gradient: 'from-rose-600 via-red-600 to-orange-700',
            accent: 'bg-amber-400',
            icon: <Crown className="w-8 h-8 text-amber-300" />,
            glow: 'bg-amber-400'
        },
        pro: {
            gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
            accent: 'bg-emerald-300',
            icon: <Zap className="w-8 h-8 text-emerald-200" />,
            glow: 'bg-emerald-400'
        }
    };

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

    const activePlan = plans[activePlanIndex] || plans[0];

    const handleMobileScroll = () => {
        const container = mobileCarouselRef.current;
        if (!container || !plans.length) return;

        const containerCenter = container.scrollLeft + container.clientWidth / 2;
        let closestIndex = 0;
        let smallestDistance = Infinity;

        Array.from(container.children).forEach((child, index) => {
            const el = child as HTMLElement;
            const childCenter = el.offsetLeft + el.clientWidth / 2;
            const distance = Math.abs(childCenter - containerCenter);
            if (distance < smallestDistance) {
                smallestDistance = distance;
                closestIndex = index;
            }
        });

        if (closestIndex !== activePlanIndex) {
            setActivePlanIndex(closestIndex);
        }
    };

    // On first load on mobile, gently nudge the carousel to hint horizontal scroll
    useEffect(() => {
        if (hasHintedScroll.current) return;
        if (!plans.length || !mobileCarouselRef.current) return;
        if (typeof window !== 'undefined' && window.innerWidth >= 768) return;

        const container = mobileCarouselRef.current;
        if (!container) return;

        hasHintedScroll.current = true;

        const hintDistance = Math.min(container.clientWidth * 0.35, container.scrollWidth - container.clientWidth);
        if (hintDistance <= 0) return;

        const timeout1 = window.setTimeout(() => {
            container.scrollTo({ left: hintDistance, behavior: 'smooth' });
        }, 600);

        const timeout2 = window.setTimeout(() => {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        }, 1600);

        return () => {
            window.clearTimeout(timeout1);
            window.clearTimeout(timeout2);
        };
    }, [plans.length]);

    const scrollToPlan = (index: number) => {
        const container = mobileCarouselRef.current;
        if (!container || !plans.length) return;
        const clampedIndex = Math.min(Math.max(index, 0), plans.length - 1);
        const child = container.children[clampedIndex] as HTMLElement | undefined;
        if (!child) return;

        const targetLeft = child.offsetLeft - (container.clientWidth - child.clientWidth) / 2;
        container.scrollTo({ left: targetLeft, behavior: 'smooth' });
        setActivePlanIndex(clampedIndex);
    };

    if (isAuthLoading || isProfileLoading || arePlansLoading) {
        return <PageSkeleton />;
    }

    // Dynamic background colors and falling icons based on active plan
    const backgroundMapping: Record<string, { bgClass: string, icon: any, textClass: string }> = {
        free: { bgClass: 'bg-slate-900', icon: Shield, textClass: 'text-slate-500 dark:text-slate-300' },
        premium: { bgClass: 'bg-indigo-950', icon: Star, textClass: 'text-indigo-600 dark:text-indigo-400' },
        iconic: { bgClass: 'bg-rose-950', icon: Crown, textClass: 'text-rose-600 dark:text-rose-400' },
        pro: { bgClass: 'bg-teal-950', icon: Zap, textClass: 'text-teal-600 dark:text-teal-400' }
    };
    
    // Fallback securely in case activePlan or its mapping doesn't exist
    const activeMapping = activePlan && backgroundMapping[activePlan.id] 
        ? backgroundMapping[activePlan.id] 
        : { bgClass: 'bg-gray-950', icon: Star, textClass: 'text-blue-600' };
        
    const ActiveFallingIcon = activeMapping.icon;
    const activeTextClass = activeMapping.textClass;

    return (
        <div className="min-h-screen w-full overflow-hidden relative transition-colors duration-300 ease-in bg-[#F8FAFC] dark:bg-gray-950">
            <Seo title="Pricing Plans" />

            {/* Dynamic Animated Background Colors (Dark Mode Primarily) */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activePlan?.id || 'default'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeIn' }}
                    className={`absolute inset-0 hidden dark:block ${activeMapping.bgClass} z-0 transition-colors duration-300 ease-in`}
                />
            </AnimatePresence>

            {/* Animated Background Orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                {/* Falling Icons System */ }
                {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                        key={`falling-icon-${activePlan?.id}-${i}`}
                        initial={{ 
                            y: -100, 
                            x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
                            opacity: 1,
                            rotate: Math.random() * 360
                        }}
                        animate={{ 
                            y: typeof window !== 'undefined' ? window.innerHeight + 100 : 1000,
                            x: typeof window !== 'undefined' ? (Math.random() * window.innerWidth / 2) : 0,
                            opacity: [0, 0.4, 0.8, 0.4, 0],
                            rotate: Math.random() * 360 + 360
                        }}
                        transition={{ 
                            duration: Math.random() * 10 + 15, 
                            repeat: Infinity, 
                            ease: "linear",
                            delay: Math.random() * -20 // Start at different staggered times
                        }}
                        className="absolute text-white/10 dark:text-white/5"
                    >
                        <ActiveFallingIcon size={Math.random() * 40 + 20} className="drop-shadow-sm" />
                    </motion.div>
                ))}
                
                <motion.div 
                    animate={{ y: [0, -30, 0], scale: [1, 1.1, 1], opacity: [0.1, 0.25, 0.1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/30 rounded-full blur-[100px]"
                />
                <motion.div 
                    animate={{ y: [0, 40, 0], scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-1/3 -right-32 w-96 h-96 bg-purple-500/30 rounded-full blur-[100px]"
                />
                <motion.div 
                    animate={{ x: [0, 20, 0], y: [0, 20, 0], opacity: [0.05, 0.15, 0.05] }}
                    transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-2/3 left-1/3 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px]"
                />
            </div>

            <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110" onClick={() => window.history.back()}>
                            <ArrowLeft className={`h-5 w-5 ${activeTextClass} transition-colors duration-300 ease-in`} />
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
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ease-in ${currency === cur ? `bg-white dark:bg-gray-700 shadow-sm ${activeTextClass}` : 'text-slate-500'}`}
                                >
                                    {cur}
                                </button>
                            ))}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="w-9 h-9 p-0"
                        >
                            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        {user ? <ProfileDropdown /> : <Link to="/login"><Button size="sm">Sign In</Button></Link>}
                    </div>
                </div>
            </header>

            <main className="container relative z-10 mx-auto px-4 lg:px-8 py-12 lg:py-16 max-w-7xl">
                <motion.div
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 
                    dark:text-white mb-4 italic uppercase mt-[var(--header-height)]">
                        Choose Your <span className={`${activeTextClass} transition-colors duration-300 ease-in`}>Path</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto mb-6 uppercase text-xs tracking-[0.2em]">
                        High-performance plans for future medical professionals
                    </p>

                    <div className="inline-flex items-center p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setIsMonthly(true)}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ease-in ${isMonthly ? `bg-white dark:bg-gray-700 shadow-xl ${activeTextClass}` : 'text-slate-500'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsMonthly(false)}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ease-in ${!isMonthly ? `bg-white dark:bg-gray-700 shadow-xl ${activeTextClass}` : 'text-slate-500'}`}
                        >
                            Yearly
                        </button>
                    </div>

                    {/* Top layout indicator (mobile only) */}
                    {plans.length > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-4 md:hidden">
                            {plans.map((plan, index) => {
                                const isActive = index === activePlanIndex;
                                return (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => scrollToPlan(index)}
                                        className="focus:outline-none"
                                    >
                                        <span
                                            className={`block h-1.5 rounded-full transition-all duration-300 ${isActive
                                                ? 'w-6 bg-slate-900 dark:bg-slate-100'
                                                : 'w-2 bg-slate-300/70 dark:bg-slate-700/70'
                                                }`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </motion.div>

                {/* Mobile: horizontal scroll with focused center card and side peeks */}
                <div className="md:hidden">
                    <div
                        ref={mobileCarouselRef}
                        onScroll={handleMobileScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory gap-4 -mx-4 px-6 pb-6 scroll-smooth"
                    >
                        {plans.map((plan, index) => {
                            const style = planStyles[plan.id] || planStyles.free;
                            const currentPlanDetails = isMonthly ? plan.monthly[currency] : plan.yearly[currency];
                            const displayPrice = plan.id === 'free' ? '0' : currentPlanDetails.price;
                            const originalPrice = plan.id === 'free' ? null : currentPlanDetails.originalPrice;

                            const isUserOnPaidPlan = currentUserPlan !== 'free';
                            const isFreePlanAndPaidUser = plan.id === 'free' && isUserOnPaidPlan;

                            const isActive = index === activePlanIndex;

                            return (
                                <motion.div
                                    key={plan.id}
                                    className={`snap-center shrink-0 w-[95%] max-w-md transition-all duration-300 ease-out ${
                                        isActive ? 'scale-100 opacity-100 blur-0' : 'scale-95 opacity-50 blur-[2px]'
                                    }`}
                                    initial={{ opacity: 0, y: 32 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.45, delay: index * 0.08 }}
                                >
                                    <Card className={`relative h-full overflow-hidden border-none bg-gradient-to-br ${style.gradient} text-white shadow-2xl flex flex-col rounded-[2.5rem] p-2`}>

                                        <div className="absolute inset-0 opacity-10" style={{
                                            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`,
                                            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                        }} />

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

                                        <CardHeader className="relative z-10 text-center pt-12 pb-6">
                                            <div className="flex justify-center mb-4">
                                                <div className="relative">
                                                    <div className={`absolute inset-0 ${style.glow} blur-2xl opacity-40 rounded-full`} />
                                                    <motion.div 
                                                        animate={{ y: [0, -6, 0] }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                                                        className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20"
                                                    >
                                                        {style.icon}
                                                    </motion.div>
                                                </div>
                                            </div>

                                            <CardTitle className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">
                                                {plan.display}
                                            </CardTitle>
                                            <div className={`h-1.5 w-12 ${style.accent} rounded-full mx-auto mt-2 shadow-lg`} />

                                            <div className="mt-8 flex flex-col items-center">
                                                {originalPrice && (
                                                    <span className="text-sm opacity-60 line-through font-bold mb-1">
                                                        {currency === 'PKR' ? 'Rs.' : '$'}{originalPrice}
                                                    </span>
                                                )}
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-bold opacity-90">{currency === 'PKR' ? 'Rs.' : '$'}</span>
                                                    <span className="text-5xl font-black tracking-tight">{displayPrice}</span>
                                                    <span className="text-xs opacity-70 font-bold uppercase tracking-widest ml-1">/{isMonthly ? 'mo' : 'yr'}</span>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="relative z-10 flex flex-col flex-grow">
                                            <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 flex-grow flex flex-col shadow-inner">
                                                <ul className="space-y-4 mb-8 flex-grow">
                                                    {currentPlanDetails.features.map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-3 text-sm font-semibold leading-snug">
                                                            <CheckCircle2 className={`h-5 w-5 shrink-0 ${style.accent.replace('bg-', 'text-')} opacity-90`} />
                                                            <span className="text-white/90">{feature}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Mobile CTA for active plan */}
                    {activePlan && (
                        <div className="mt-2 px-1">
                            {(() => {
                                const style = planStyles[activePlan.id] || planStyles.free;
                                const currentPlanDetails = isMonthly ? activePlan.monthly[currency] : activePlan.yearly[currency];
                                const displayPrice = activePlan.id === 'free' ? '0' : currentPlanDetails.price;

                                const isUserOnPaidPlan = currentUserPlan !== 'free';
                                const isFreePlanAndPaidUser = activePlan.id === 'free' && isUserOnPaidPlan;

                                if (currentUserPlan === activePlan.id) {
                                    return (
                                        <Button disabled className="w-full bg-white/10 border border-white/20 text-slate-900 dark:text-white rounded-2xl h-14 uppercase font-bold text-xs tracking-widest">
                                            Active Plan
                                        </Button>
                                    );
                                }

                                if (isFreePlanAndPaidUser) {
                                    return (
                                        <Button disabled className="w-full bg-white/5 border border-white/10 text-slate-500 dark:text-white/40 rounded-2xl h-14 uppercase font-bold text-xs tracking-widest">
                                            You are paid user
                                        </Button>
                                    );
                                }

                                return (
                                    <Link
                                        to={activePlan.id === 'free' ? '/dashboard' : '/checkout'}
                                        className="block"
                                        state={activePlan.id === 'free' ? undefined : {
                                            planName: activePlan.display,
                                            price: displayPrice,
                                            duration: isMonthly ? 'Monthly' : 'Yearly',
                                            validity: isMonthly ? 'monthly' : 'yearly',
                                            currency: currency,
                                            planId: activePlan.id
                                        }}
                                    >
                                        <Button className="w-full bg-white text-slate-900 hover:scale-105 transition-all duration-300 rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl">
                                            {activePlan.id === 'free' ? 'Continue with Free Plan' : 'Proceed to Checkout'}
                                        </Button>
                                    </Link>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* Desktop grid */}
                <div className="hidden md:grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => {
                        const style = planStyles[plan.id] || planStyles.free;
                        const currentPlanDetails = isMonthly ? plan.monthly[currency] : plan.yearly[currency];
                        const displayPrice = plan.id === 'free' ? '0' : currentPlanDetails.price;
                        const originalPrice = plan.id === 'free' ? null : currentPlanDetails.originalPrice;

                        // Logic to disable Free plan if user is on a paid plan
                        const isUserOnPaidPlan = currentUserPlan !== 'free';
                        const isFreePlanAndPaidUser = plan.id === 'free' && isUserOnPaidPlan;

                        return (
                            <motion.div
                                key={plan.id}
                                className={`relative transition-all duration-500 ${plan.popular ? 'md:-mt-4 md:mb-4 scale-100' : ''}`}
                                initial={{ opacity: 0, y: 32 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: index * 0.08 }}
                                whileHover={{ y: -12, scale: 1.03 }}
                                onMouseEnter={() => setActivePlanIndex(index)}
                            >
                                <Card className={`relative h-full overflow-hidden border-none bg-gradient-to-br ${style.gradient} text-white shadow-2xl flex flex-col rounded-[2.5rem] p-2`}>

                                    <div className="absolute inset-0 opacity-10" style={{
                                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`,
                                        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                    }} />

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

                                    <CardHeader className="relative z-10 text-center pt-12 pb-6">
                                        <div className="flex justify-center mb-4">
                                            <div className="relative">
                                                <div className={`absolute inset-0 ${style.glow} blur-2xl opacity-40 rounded-full`} />
                                                <motion.div 
                                                    animate={{ y: [0, -6, 0] }}
                                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: index * 0.2 }}
                                                    className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20"
                                                >
                                                    {style.icon}
                                                </motion.div>
                                            </div>
                                        </div>

                                        <CardTitle className="text-3xl font-black italic uppercase tracking-tighter drop-shadow-md">
                                            {plan.display}
                                        </CardTitle>
                                        <div className={`h-1.5 w-12 ${style.accent} rounded-full mx-auto mt-2 shadow-lg`} />

                                        <div className="mt-8 flex flex-col items-center">
                                            {originalPrice && (
                                                <span className="text-sm opacity-60 line-through font-bold mb-1">
                                                    {currency === 'PKR' ? 'Rs.' : '$'}{originalPrice}
                                                </span>
                                            )}
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-xl font-bold opacity-90">{currency === 'PKR' ? 'Rs.' : '$'}</span>
                                                <span className="text-5xl font-black tracking-tight">{displayPrice}</span>
                                                <span className="text-xs opacity-70 font-bold uppercase tracking-widest ml-1">/{isMonthly ? 'mo' : 'yr'}</span>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="relative z-10 flex flex-col flex-grow">
                                        <div className="bg-white/10 backdrop-blur-xl rounded-[2rem] p-6 border border-white/10 flex-grow flex flex-col shadow-inner">
                                            <ul className="space-y-4 mb-8 flex-grow">
                                                {currentPlanDetails.features.map((feature, idx) => (
                                                    <li key={idx} className="flex items-start gap-3 text-sm font-semibold leading-snug">
                                                        <CheckCircle2 className={`h-5 w-5 shrink-0 ${style.accent.replace('bg-', 'text-')} opacity-90`} />
                                                        <span className="text-white/90">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            <div className="mt-auto">
                                                {currentUserPlan === plan.id ? (
                                                    <Button disabled className="w-full bg-white/10 border border-white/20 text-white rounded-2xl h-14 uppercase font-bold text-xs tracking-widest">
                                                        Active Plan
                                                    </Button>
                                                ) : isFreePlanAndPaidUser ? (
                                                    <Button disabled className="w-full bg-white/5 border border-white/10 text-white/40 rounded-2xl h-14 uppercase font-bold text-xs tracking-widest">
                                                        YOU ARE PAID USER
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
                                                            currency: currency,
                                                            planId: plan.id
                                                        }}
                                                    >
                                                        <Button className="w-full bg-white text-slate-900 hover:scale-105 transition-all duration-300 rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl">
                                                            {plan.id === 'free' ? 'Continue with Free Plan' : 'Upgrade Now'}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default Pricing;