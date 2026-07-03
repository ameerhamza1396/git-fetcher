// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Gift, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

const RedeemCode = () => {
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const successModalRef = useRef(null);
    const [activatedPlan, setActivatedPlan] = useState("");
    const [days, setDays] = useState(0);
    const headerRef = useRef<HTMLElement>(null);
    const lastScrollY = useRef(0);
    const [headerVisible, setHeaderVisible] = useState(true);

    const { data: profile, refetch } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
            return data;
        },
        enabled: !!user?.id
    });

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setHeaderVisible(currentScrollY < lastScrollY.current || currentScrollY < 10);
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleRedeem = async () => {
        if (!code.trim()) { setErrorMsg("Enter a valid code"); return; }
        if (profile?.plan && profile.plan.toLowerCase() !== "free") {
            setErrorMsg("You are already a paid user and cannot avail this offer now.");
            return;
        }
        setErrorMsg('');
        setLoading(true);
        const { data, error } = await supabase.rpc('use_redeem_code', { code_input: code.trim(), uid: user.id });
        if (error || !data?.[0]?.success) { setErrorMsg("Invalid, expired, or fully used code."); setLoading(false); return; }
        const { plan, duration_days } = data[0];
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + duration_days);
        await supabase.from('profiles').update({ plan, plan_expiry_date: expiry.toISOString() }).eq('id', user.id);
        setActivatedPlan(plan);
        setDays(duration_days);
        successModalRef.current?.showModal();
        setCode('');
        setLoading(false);
        refetch();
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#0a2e2e] via-[#0f172a] to-[#020617] text-white relative overflow-x-hidden">
            <Seo title="Redeem Code" />

            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#2dd4bf]/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 -right-32 w-80 h-80 bg-[#0ea5e9]/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-24 left-1/3 w-72 h-72 bg-[#67e8f9]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.5) 20px, rgba(255,255,255,0.5) 21px)`
                }} />
            </div>

            <dialog ref={successModalRef} className="rounded-[2rem] p-8 w-80 bg-gradient-to-br from-[#2dd4bf] to-[#0ea5e9] text-white shadow-2xl border-0 backdrop:bg-slate-950/70">
                <h3 className="text-xl font-black uppercase">Congratulations</h3>
                <p className="mt-3 text-sm text-white/80">
                    Your <b className="text-white">{activatedPlan}</b> plan is activated for <b className="text-white">{days}</b> days!
                </p>
                <div className="mt-5">
                    <Button onClick={() => successModalRef.current.close()} className="w-full bg-white text-[#0f766e] hover:bg-white/90 font-black uppercase tracking-widest rounded-xl h-11">OK</Button>
                </div>
            </dialog>

            <div
                ref={headerRef}
                className={`fixed top-0 left-0 right-0 z-50 bg-[#07171f]/75 backdrop-blur-2xl border-b border-white/10 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="container mx-auto px-5 h-14 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard">
                        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 text-white/70 hover:text-white hover:bg-white/10">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
                        <span className="text-lg font-black text-white">Redeem Code</span>
                    </div>
                    <div className="w-9" />
                </div>
            </div>

            <main className="relative z-10 container mx-auto px-5 py-8 max-w-md mt-[var(--header-height)]">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 mb-4 border border-white/10">
                        <Sparkles className="w-3.5 h-3.5 text-[#2dd4bf]" />
                        <span className="text-[#2dd4bf] text-xs font-semibold uppercase tracking-widest">Premium gift</span>
                    </div>
                    <div className="relative inline-flex mb-5">
                        <div className="absolute inset-0 bg-[#2dd4bf] blur-2xl opacity-30 rounded-full" />
                        <div className="relative bg-gradient-to-br from-[#2dd4bf] to-[#0ea5e9] p-5 rounded-3xl shadow-2xl shadow-[#0ea5e9]/20">
                            <Gift className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">
                        Redeem Your Gift Code
                    </h1>
                    <p className="text-white/50 text-sm mt-2">Enter your code to unlock premium access.</p>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2dd4bf] via-[#0ea5e9] to-[#155e75] text-white shadow-2xl shadow-[#0ea5e9]/20 p-1">
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                    }} />
                    <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10 space-y-5">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Enter Promo Code</p>
                            <Input
                                placeholder="ABCD-1234"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-12 text-center text-lg font-mono tracking-widest"
                            />
                        </div>
                        {errorMsg && <p className="text-red-300 text-sm text-center font-medium">{errorMsg}</p>}
                        <Button onClick={handleRedeem} disabled={loading}
                            className="w-full bg-white text-[#0f766e] hover:bg-white/90 hover:scale-[1.02] transition-all rounded-xl h-12 uppercase font-black text-xs tracking-widest shadow-2xl">
                            {loading ? "Processing..." : "Redeem Code"}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RedeemCode;
