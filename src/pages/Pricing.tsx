import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Moon, Sun, ArrowLeft, CheckCircle2, Crown, Zap, Star, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';
import { Skeleton } from '@/components/ui/skeleton';

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

    const currentUserPlan = profile?.plan?.toLowerCase();

    // Style Mapping to match Purchase History
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

    if (isAuthLoading || isProfileLoading || arePlansLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
                <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-32 h-32 object-contain animate-pulse" />
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
            <Seo title="Pricing Plans" />

    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <div className="flex items-center space-x-3">
                        <Link to="/dashboard">
                            <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110">
                                <ArrowLeft className="h-5 w-5 text-blue-600" />
                            </Button>
                        </Link>
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-8 h-8" />
                        <span className="text-xl font-bold">Pricing</span>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            {['PKR', 'USD'].map((cur) => (
                                <button
                                    key={cur}
                                    onClick={() => setCurrency(cur as 'PKR' | 'USD')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${currency === cur ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600' : 'text-slate-500'}`}
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

            <main className="container mx-auto px-4 lg:px-8 py-12 lg:py-16 max-w-7xl">
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 
                    dark:text-white mb-4 italic uppercase mt-[calc(env(safe-area-inset-top)+40px)]">
                        Choose Your <span className="text-blue-600">Path</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto mb-10 uppercase text-xs tracking-[0.2em]">
                        High-performance plans for future medical professionals
                    </p>

                    <div className="inline-flex items-center p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setIsMonthly(true)}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${isMonthly ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xl' : 'text-slate-500'}`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsMonthly(false)}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${!isMonthly ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-xl' : 'text-slate-500'}`}
                        >
                            Yearly
                        </button>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan) => {
                        const style = planStyles[plan.id] || planStyles.free;
                        const currentPlanDetails = isMonthly ? plan.monthly[currency] : plan.yearly[currency];
                        const displayPrice = plan.id === 'free' ? '0' : currentPlanDetails.price;
                        const originalPrice = plan.id === 'free' ? null : currentPlanDetails.originalPrice;

                        return (
                            <div key={plan.id} className={`relative transition-all duration-500 ${plan.popular ? 'md:-mt-4 md:mb-4 scale-100' : ''}`}>
                                <Card className={`relative h-full overflow-hidden border-none bg-gradient-to-br ${style.gradient} text-white shadow-2xl flex flex-col rounded-[2.5rem] p-2`}>

                                    {/* Pattern Overlay */}
                                    <div className="absolute inset-0 opacity-10" style={{
                                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255, 255, 255, 0.4) 20px, rgba(255, 255, 255, 0.4) 40px)`,
                                        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                    }} />

                                    {plan.popular && (
                                        <Badge className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md text-white border-white/20 uppercase text-[10px] tracking-[0.2em] font-bold px-4">
                                            Most Popular
                                        </Badge>
                                    )}

                                    <CardHeader className="relative z-10 text-center pt-12 pb-6">
                                        <div className="flex justify-center mb-4">
                                            <div className="relative">
                                                <div className={`absolute inset-0 ${style.glow} blur-2xl opacity-40 rounded-full`} />
                                                <div className="relative bg-white/10 p-3 rounded-2xl backdrop-blur-md border border-white/20">
                                                    {style.icon}
                                                </div>
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
                                        {/* Features Glass Box */}
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
                                                ) : (
                                                    <Link
                                                        to="/checkout"
                                                        className="block"
                                                        state={{
                                                            planName: plan.display,
                                                            price: displayPrice,
                                                            duration: isMonthly ? 'Monthly' : 'Yearly',
                                                            validity: isMonthly ? 'monthly' : 'yearly',
                                                            currency: currency,
                                                            planId: plan.id
                                                        }}
                                                    >
                                                        <Button className="w-full bg-white text-slate-900 hover:scale-105 transition-all duration-300 rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl">
                                                            {plan.id === 'free' ? 'Get Started' : 'Upgrade Now'}
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            </main>
        </div>
    );
};

export default Pricing;