import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    CheckCircle,
    XCircle,
    BadgePercent,
    CreditCard,
    ArrowLeft,
    Loader2,
    Wallet,
    RefreshCw
} from 'lucide-react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const MDR_RATE = 0.025;
const EASYPAISA_API_URL = "https://mobile-payment-medmacs.vercel.app/paypaisa";

const Checkout = () => {
    const { user } = useAuth();
    const location = useLocation();

    const [isLoading, setIsLoading] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [paymentMethod, setPaymentMethod] = useState<'easypaisa' | 'payfast'>('easypaisa');
    const [mobileNumber, setMobileNumber] = useState('');
    const [modalState, setModalState] = useState<'idle' | 'processing' | 'success' | 'failure'>('idle');
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    const [promoCode, setPromoCode] = useState('');
    const [promoCodeError, setPromoCodeError] = useState<string | null>(null);
    const [discountedPrice, setDiscountedPrice] = useState<number | null>(null);
    const [isPromoApplied, setIsPromoApplied] = useState(false);
    const [promoDiscountDisplay, setPromoDiscountDisplay] = useState<string | null>(null);

    const checkPaymentStatus = async () => {
        if (!user) return;
        try {
            const { data, error: fetchError } = await supabase
                .from('pending_payments')
                .select('status, error_message')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (data) {
                if (data.status === 'success') { setModalState('success'); setIsLoading(false); return true; }
                else if (data.status === 'failed') { setError(data.error_message || "Transaction failed."); setModalState('failure'); setIsLoading(false); return true; }
            }
        } catch (e) { console.error("Status check failed", e); }
        return false;
    };

    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel('payment-tracking')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pending_payments', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.new.status === 'success') { setModalState('success'); setIsLoading(false); }
                    else if (payload.new.status === 'failed') { setError(payload.new.error_message || "Transaction failed."); setModalState('failure'); setIsLoading(false); }
                }
            ).subscribe();

        let pollInterval: NodeJS.Timeout;
        if (modalState === 'processing') {
            pollInterval = setInterval(() => { checkPaymentStatus(); }, 4000);
        }
        return () => { supabase.removeChannel(channel); if (pollInterval) clearInterval(pollInterval); };
    }, [user, modalState]);

    if (!location.state) return <Navigate to="/pricing" replace />;

    const { planName = 'Premium', price: basePriceStr, duration = 'Monthly', currency = 'PKR', validity = 'monthly' } = location.state;
    const basePrice = basePriceStr ? parseFloat(basePriceStr) : 0;
    const validityDisplay = validity.toLowerCase() === 'yearly' ? 'Validity: 365 Days' : 'Validity: 30 Days';
    const priceAfterPromo = discountedPrice !== null ? discountedPrice : basePrice;
    const mdrTax = paymentMethod === 'payfast' ? priceAfterPromo * MDR_RATE : 0;
    const grandTotal = priceAfterPromo + mdrTax;
    const isPayFastDisabled = grandTotal < 20;

    useEffect(() => {
        if (isPayFastDisabled && paymentMethod === 'payfast') setPaymentMethod('easypaisa');
    }, [isPayFastDisabled, paymentMethod]);

    const handleApplyPromoCode = async () => {
        setPromoCodeError(null);
        if (!promoCode) return;
        setIsLoading(true);
        try {
            const { data, error: rpcError } = await supabase.rpc('validate_promo_code', {
                p_code: promoCode, p_plan_name: planName, p_duration: duration, p_currency: currency, p_current_price: basePrice,
            });
            if (rpcError) throw rpcError;
            const result = data[0];
            if (result.valid) {
                setDiscountedPrice(result.adjusted_price); setIsPromoApplied(true);
                setPromoDiscountDisplay(result.discount_type === 'percentage' ? `${result.discount_value}% OFF` : `Discount Applied`);
            } else { setPromoCodeError(result.error_message || 'Invalid code'); }
        } catch (err: any) { setPromoCodeError('Failed to validate promo code.'); }
        finally { setIsLoading(false); }
    };

    const handleEasypaisaPayment = async () => {
        if (!mobileNumber || mobileNumber.length !== 11 || !mobileNumber.startsWith('03')) {
            setError("Please enter a valid 11-digit Easypaisa number starting with 03."); return;
        }
        setError(null); setIsLoading(true); setModalState('processing');
        const orderRefNum = `EP-${Date.now()}`;
        const amountFormatted = grandTotal.toFixed(2);
        const { data: { session } } = await supabase.auth.getSession();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch(EASYPAISA_API_URL, {
                method: 'POST', signal: controller.signal,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ amount: amountFormatted, mobileNo: mobileNumber, orderRefNum, email: user?.email || 'customer@medmacs.app', userId: user?.id, validity, planName })
            });
            clearTimeout(timeoutId);
            if (!response.ok && response.status !== 202) {
                const errorData = await response.json().catch(() => ({ message: "Server error occurred." }));
                throw new Error(errorData.message || "Gateway unreachable.");
            }
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setError(err.message || "An unexpected error occurred."); setModalState('failure'); setIsLoading(false);
        }
    };

    const handlePayFastPayment = async () => {
        setIsLoading(true); setError(null);
        const basketId = `ORD-${Date.now()}`;
        const finalAmount = grandTotal.toFixed(2);
        try {
            const { error: insertError } = await supabase.from('pending_payments').insert([{
                user_id: user?.id, amount: finalAmount, order_id: basketId, status: 'initiated', validity, email: user?.email, plan_name: planName
            }]);
            if (insertError) throw new Error("Could not initialize transaction.");
            const response = await fetch('https://mobile-payment-medmacs.vercel.app/checkout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: finalAmount, basketId })
            });
            const text = await response.text();
            let data;
            try { data = text ? JSON.parse(text) : null; } catch (e) { throw new Error("Payment server returned invalid response."); }
            if (!response.ok || !data?.ACCESS_TOKEN) throw new Error(data?.message || "Failed to get payment token.");
            setIsRedirecting(true);
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = "https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction";
            const fields = {
                MERCHANT_ID: "248744", Merchant_Name: "MEMACS Pakistan", MERCHANT_USERAGENT: navigator.userAgent,
                TOKEN: data.ACCESS_TOKEN, PROCCODE: "00", TXNAMT: finalAmount, CUSTOMER_MOBILE_NO: mobileNumber || "03000000000",
                CUSTOMER_EMAIL_ADDRESS: user?.email || "",
                SUCCESS_URL: `${window.location.origin}/payment-success?plan=${planName}&validity=${validity}`,
                FAILURE_URL: `${window.location.origin}/payment-failure`,
                CHECKOUT_URL: `https://mobile-payment-medmacs.vercel.app/pqyment-webhook`,
                BASKET_ID: basketId, ORDER_DATE: new Date().toISOString().slice(0, 10),
                SIGNATURE: "PAYMENT_REQ", VERSION: "V1.2", TXNDESC: `Upgrade to ${planName} (${duration})`,
                CURRENCY_CODE: "PKR", P1: user?.id || "", P2: planName, P3: duration
            };
            Object.entries(fields).forEach(([key, value]) => {
                const input = document.createElement('input'); input.type = 'hidden'; input.name = key; input.value = value as string; form.appendChild(input);
            });
            document.body.appendChild(form); form.submit();
        } catch (err: any) { setError(err.message || "An error occurred."); setIsLoading(false); }
    };

    const processPayment = () => {
        if (isLoading || isRedirecting) return;
        if (!user) { setError("Please sign in to continue."); return; }
        if (!agreedToTerms) { setError("You must agree to the Terms, Privacy, and Refund policies to continue."); return; }
        paymentMethod === 'easypaisa' ? handleEasypaisaPayment() : handlePayFastPayment();
    };

    return (
        <div className="min-h-screen w-full bg-background overflow-hidden">
            <Seo title="Checkout | Medmacs" />

            <header className="absolute top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)]">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <Link to="/pricing" className="p-2 hover:bg-accent rounded-full transition-colors">
                            <ArrowLeft className="h-5 w-5 text-foreground" />
                        </Link>
                        <span className="text-xl font-bold text-primary">Checkout</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12 max-w-5xl grid md:grid-cols-2 gap-12 mt-[calc(env(safe-area-inset-top)+40px)]">
                <div className="space-y-8">
                    <h2 className="text-2xl font-bold text-foreground">Order Summary</h2>
                    <Card className="border-border shadow-md bg-card">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col">
                                    <span className="text-muted-foreground font-medium">{planName} Plan</span>
                                    <span className="text-[11px] mt-1 px-2 py-0.5 bg-primary/10 text-primary rounded font-bold uppercase">
                                        {validityDisplay}
                                    </span>
                                </div>
                                <span className="font-semibold text-foreground">PKR {basePrice.toFixed(2)}</span>
                            </div>

                            {isPromoApplied && (
                                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                                    <span className="flex items-center"><BadgePercent className="mr-1.5 h-4 w-4" /> {promoDiscountDisplay}</span>
                                    <span>- PKR {(basePrice - priceAfterPromo).toFixed(2)}</span>
                                </div>
                            )}

                            <div className="pt-6 border-t border-border flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-sm text-muted-foreground uppercase font-bold">Grand Total</span>
                                    <span className="text-3xl font-black text-primary">PKR {grandTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-foreground">Promo Code</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter code"
                                value={promoCode}
                                className="bg-card border-border text-foreground"
                                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                disabled={isPromoApplied || isLoading}
                            />
                            <Button variant="outline" onClick={handleApplyPromoCode} disabled={isLoading || isPromoApplied || !promoCode}>
                                {isPromoApplied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : 'Apply'}
                            </Button>
                        </div>
                        {promoCodeError && <p className="text-xs text-destructive">{promoCodeError}</p>}
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-foreground">Payment Method</h2>
                    <div className="space-y-4">
                        <div
                            onClick={() => setPaymentMethod('easypaisa')}
                            className={cn("cursor-pointer p-4 border-2 rounded-xl transition-all", paymentMethod === 'easypaisa' ? "border-primary bg-primary/5" : "border-border")}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Wallet className="w-5 h-5 text-emerald-600" />
                                    <span className="font-bold text-foreground">Easypaisa</span>
                                </div>
                                <img src="/images/Easypaisa-logo.png" className="h-4" alt="Easypaisa" />
                            </div>
                            {paymentMethod === 'easypaisa' && (
                                <div className="space-y-2 mt-2 animate-in fade-in zoom-in-95">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Mobile Account Number</label>
                                    <Input placeholder="03XXXXXXXXX" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} className="bg-card border-border text-foreground" />
                                </div>
                            )}
                        </div>

                        <div
                            onClick={() => !isPayFastDisabled && setPaymentMethod('payfast')}
                            className={cn("p-4 border-2 rounded-xl transition-all flex items-center justify-between", isPayFastDisabled ? "opacity-50 grayscale cursor-not-allowed" : "cursor-pointer", paymentMethod === 'payfast' ? "border-primary bg-primary/5" : "border-border")}
                        >
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-5 h-5 text-primary" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-foreground">Cards / Bank (PayFast)</span>
                                    <span className="text-[10px] text-primary font-medium">+2.5% Tax</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start space-x-3 p-2">
                        <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} className="mt-1" />
                        <label htmlFor="terms" className="text-sm leading-snug text-muted-foreground">
                            By continuing to pay to Medmacs/Hmacs Studios, you agree to our{' '}
                            <Link to="/terms" className="text-primary hover:underline font-medium">Terms and Conditions</Link>,{' '}
                            <Link to="/privacypolicy" className="text-primary hover:underline font-medium">Privacy Policy</Link>, and{' '}
                            <Link to="/refund-policy" className="text-primary hover:underline font-medium">Refund Policy</Link>.
                        </label>
                    </div>

                    {error && <p className="text-destructive text-sm font-medium">{error}</p>}

                    <Button
                        className="w-full bg-primary hover:bg-primary/90 h-14 text-xl font-black shadow-lg text-primary-foreground"
                        onClick={processPayment}
                        disabled={isLoading || isRedirecting}
                    >
                        {(isLoading || isRedirecting) ? <Loader2 className="animate-spin h-6 w-6" /> : `Pay PKR ${grandTotal.toFixed(2)}`}
                    </Button>
                </div>
            </main>

            <Dialog open={modalState !== 'idle'} onOpenChange={(open) => !open && setModalState('idle')}>
                <DialogContent className={cn(
                    "sm:max-w-md bg-card border-border transition-all duration-300",
                    "max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-w-full max-sm:border-x-0 max-sm:border-b-0"
                )}>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        {modalState === 'processing' && (
                            <>
                                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                <DialogTitle className="text-foreground">Authorizing Payment</DialogTitle>
                                <DialogDescription className="mt-2 text-muted-foreground px-4">
                                    Please approve the request on your Easypaisa app or enter your PIN on the mobile prompt.
                                </DialogDescription>
                                <Button variant="ghost" size="sm" className="mt-4 text-xs text-muted-foreground hover:text-primary" onClick={checkPaymentStatus}>
                                    <RefreshCw className="mr-2 h-3 w-3" /> Still waiting? Click to check status
                                </Button>
                            </>
                        )}
                        {modalState === 'success' && (
                            <>
                                <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
                                <DialogTitle className="text-foreground">Payment Successful!</DialogTitle>
                                <DialogDescription className="mt-2 text-muted-foreground">Your account has been upgraded.</DialogDescription>
                                <Button className="mt-6 w-full" onClick={() => window.location.href = '/dashboard'}>Continue to Dashboard</Button>
                            </>
                        )}
                        {modalState === 'failure' && (
                            <>
                                <XCircle className="h-16 w-16 text-destructive mb-4" />
                                <DialogTitle className="text-foreground">Transaction Failed</DialogTitle>
                                <DialogDescription className="mt-2 text-destructive px-4">{error || "Something went wrong."}</DialogDescription>
                                <div className="flex gap-2 w-full mt-6">
                                    <Button variant="outline" className="flex-1" onClick={() => setModalState('idle')}>Try Again</Button>
                                    <Button variant="secondary" className="flex-1" onClick={checkPaymentStatus}>Check Again</Button>
                                </div>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Checkout;