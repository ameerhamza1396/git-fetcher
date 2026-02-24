import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Gift, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ElasticWrapper } from '@/components/ElasticWrapper'
import Seo from '@/components/Seo';
import PlanBadge from '@/components/PlanBadge';


const RedeemCode = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const successModalRef = useRef(null);
    const [activatedPlan, setActivatedPlan] = useState("");
    const [days, setDays] = useState(0);

    const { data: profile, refetch } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();
            return data;
        },
        enabled: !!user?.id
    });

    const handleRedeem = async () => {
        if (!code.trim()) {
            setErrorMsg("Enter a valid code");
            return;
        }

        // ⭐ ONLY CHANGE ADDED HERE ⭐
        if (profile?.plan && profile.plan.toLowerCase() !== "free") {
            setErrorMsg("You are already a paid user and cannot avail this offer now.");
            return;
        }
        // ⭐ END OF SINGLE CHANGE ⭐

        setErrorMsg('');
        setLoading(true);

        // Validate + update usage atomically
        const { data, error } = await supabase.rpc('use_redeem_code', {
            code_input: code.trim(),
            uid: user.id
        });

        if (error || !data?.[0]?.success) {
            setErrorMsg("Invalid, expired, or fully used code.");
            setLoading(false);
            return;
        }

        const { plan, duration_days } = data[0];

        // Extend expiry
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + duration_days);

        await supabase
            .from('profiles')
            .update({
                plan,
                plan_expiry_date: expiry.toISOString()
            })
            .eq('id', user.id);

        setActivatedPlan(plan);
        setDays(duration_days);
        successModalRef.current?.showModal();

        setCode('');
        setLoading(false);
        refetch();
    };

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
            <Seo title="Redeem Code" />

            <dialog ref={successModalRef} className="rounded-xl p-6 w-80 bg-white dark:bg-gray-800 shadow-xl">
                <h3 className="text-lg font-semibold text-green-600 dark:text-green-400">Congratulations 🎉</h3>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    Your <b>{activatedPlan}</b> plan is activated for <b>{days}</b> days!
                </p>
                <div className="mt-4 text-right">
                    <Button onClick={() => successModalRef.current.close()}>OK</Button>
                </div>
            </dialog>

    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
                    <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard" className="text-purple-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <span className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                        <Gift className="w-5 h-5 text-purple-500" /> Redeem Code
                    </span>
                    <div className="flex gap-2 items-center">
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <PlanBadge plan={profile?.plan} />
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

                  <ElasticWrapper>

            <div className="container mx-auto px-4 pt-10 pb-5 max-w-md text-center mt-[calc(50px+env(safe-area-inset-top))] overscroll-y-contain">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                    <Gift className="inline-block w-8 h-8 mr-2 text-purple-600 dark:text-purple-400" />
                    Redeem Your Gift Code
                </h1>
                <p className="text-md text-gray-600 dark:text-gray-400">
                    Enter your unique code below to instantly unlock exclusive access.
                </p>
            </div>

            <div className="container mx-auto px-4 py-10 max-w-md">
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-900 border-purple-300 dark:border-purple-700">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl text-purple-700 dark:text-purple-300">Enter Redeem Code</CardTitle>
                        <CardDescription>Unlock premium features</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Input
                            placeholder="Enter promo code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                        />

                        {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}

                        <Button onClick={handleRedeem} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                            {loading ? "Processing..." : "Redeem Code"}
                        </Button>
                    </CardContent>
                </Card>
            </div>
            </ElasticWrapper>
        </div>
    );
};

export default RedeemCode;
