import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, Home, RefreshCw, XCircle, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Seo from '@/components/Seo';

const PaymentSuccess = () => {
    // New States for better control
    const [status, setStatus] = useState<'verifying' | 'confirmed' | 'delayed' | 'error'>('verifying');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Parameters from the PayFast Redirect URL
    const expectedPlan = searchParams.get('plan') || 'premium';
    const basketId = searchParams.get('basket_id');
    const errCode = searchParams.get('err_code');

    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 20; // 60 seconds total (20 * 3s)

        const checkStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Check if the profile is already updated
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('plan')
                    .eq('id', user.id)
                    .single();

                // 2. Check if the payment record is marked as success
                const { data: payment } = await supabase
                    .from('pending_payments')
                    .select('status')
                    .eq('order_id', basketId)
                    .single();

                const isProfileUpdated = profile?.plan?.toLowerCase() === expectedPlan.toLowerCase();
                const isPaymentSuccess = payment?.status === 'success';

                // STRICT CHECK: Only confirm if DB is actually updated
                if (isProfileUpdated || isPaymentSuccess) {
                    setStatus('confirmed');
                    clearInterval(polling);
                    return;
                }

                attempts++;

                // If taking more than 15 seconds, update UI to "Delayed"
                if (attempts > 5 && status === 'verifying') {
                    setStatus('delayed');
                }

                // If taking more than 60 seconds, stop and show error state
                if (attempts >= maxAttempts) {
                    setStatus('error');
                    clearInterval(polling);
                }
            } catch (error) {
                console.error("Verification error:", error);
            }
        };

        const polling = setInterval(checkStatus, 3000);
        checkStatus();

        return () => clearInterval(polling);
    }, [expectedPlan, basketId]);

    const handleWhatsAppSupport = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const message = `Hello Medmacs Support,\n\nI just completed my payment but my account isn't upgraded yet.\n\n*Details:*\n- Email: ${user?.email}\n- Order ID: ${basketId}\n- Plan: ${expectedPlan}\n- Error Code: ${errCode}\n\nPlease help me verify this manually.`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/923242456162?text=${encodedMessage}`, '_blank');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
            <Seo title="Payment Success | Medmacs" description="Payment verified successfully" />

            <div className="max-w-md w-full text-center space-y-6 p-8 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-purple-100 dark:border-purple-900">

                {/* STATE: VERIFYING OR DELAYED */}
                {(status === 'verifying' || status === 'delayed') && (
                    <div className="space-y-4">
                        <div className="relative flex justify-center">
                            <Loader2 className="h-16 w-16 animate-spin text-purple-600" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-purple-600">DB</span>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {status === 'delayed' ? "Finalizing Upgrade..." : "Verifying Transaction"}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {status === 'delayed'
                                ? "We've received the bank's signal, but your dashboard is still syncing. Please wait..."
                                : "We are currently receiving confirmation from your bank."}
                        </p>
                    </div>
                )}

                {/* STATE: CONFIRMED SUCCESS */}
                {status === 'confirmed' && (
                    <div className="space-y-4 animate-in zoom-in duration-500">
                        <div className="flex justify-center">
                            <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                                <CheckCircle2 className="h-16 w-16 text-green-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Success!</h1>
                            <p className="text-lg text-muted-foreground">
                                Your account has been upgraded to <span className="text-purple-600 font-bold capitalize">{expectedPlan}</span>.
                            </p>
                        </div>

                        <div className="pt-6 flex flex-col gap-3">
                            <Button
                                onClick={() => navigate('/dashboard')}
                                className="w-full bg-purple-600 hover:bg-purple-700 h-12 text-lg font-bold"
                            >
                                Enter Dashboard
                            </Button>
                        </div>
                    </div>
                )}

                {/* STATE: ERROR / TIMEOUT */}
                {status === 'error' && (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="flex justify-center">
                            <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full">
                                <XCircle className="h-16 w-16 text-amber-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Pending</h1>
                            <p className="text-sm text-muted-foreground px-2">
                                We haven't received the database update yet. Don't worry, your payment is likely safe, but our systems are slow to sync.
                            </p>
                        </div>

                        <div className="pt-6 flex flex-col gap-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full bg-slate-900 dark:bg-slate-100 dark:text-slate-900 h-12 text-lg font-bold"
                            >
                                <RefreshCw className="mr-2 h-4 w-4" /> Try Syncing Again
                            </Button>
                            <Button
                                onClick={handleWhatsAppSupport}
                                variant="outline"
                                className="w-full border-green-500 text-green-600 hover:bg-green-50 h-12 font-bold"
                            >
                                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp Support
                            </Button>
                            <Button variant="ghost" onClick={() => navigate('/contact-us')}>
                                Contact via Web
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER INFO */}
            <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-xs text-gray-400">
                    Order ID: {basketId || 'N/A'}
                </p>
                <Button
                    variant="link"
                    onClick={() => navigate('/dashboard')}
                    className="text-xs text-gray-500 flex items-center gap-2"
                >
                    <Home size={14} /> Back to Home
                </Button>
            </div>
        </div>
    );
};

export default PaymentSuccess;