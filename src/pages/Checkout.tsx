// @ts-nocheck
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    CheckCircle, XCircle, BadgePercent, CreditCard, ArrowLeft, Loader2, Wallet, RefreshCw
} from 'lucide-react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const MDR_RATE = 0.025;
const EASYPAISA_API_URL = "https://medmacs.app/api/pay-easypaisa";

const Checkout = () => {
    const { user } = useAuth();
    const location = useLocation();
    const lastScrollY = useRef(0);
    const [headerVisible, setHeaderVisible] = useState(true);

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

    // WebView Specific States
    const [showPayFastModal, setShowPayFastModal] = useState(false);
    const [payFastHtml, setPayFastHtml] = useState<string | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            setHeaderVisible(currentScrollY < lastScrollY.current || currentScrollY < 10);
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const checkPaymentStatus = async () => {
        if (!user) return;
        try {
            const { data } = await supabase.from('pending_payments').select('status, error_message').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
            if (data) {
                if (data.status === 'success') {
                    setModalState('success');
                    setShowPayFastModal(false); // Close WebView on success
                    setIsLoading(false);
                    return true;
                }
                else if (data.status === 'failed') {
                    setError(data.error_message || "Transaction failed.");
                    setModalState('failure');
                    setShowPayFastModal(false); // Close WebView on failure
                    setIsLoading(false);
                    return true;
                }
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
                    if (payload.new.status === 'success') {
                        setModalState('success');
                        setShowPayFastModal(false);
                        setIsLoading(false);
                    }
                    else if (payload.new.status === 'failed') {
                        setError(payload.new.error_message || "Transaction failed.");
                        setModalState('failure');
                        setShowPayFastModal(false);
                        setIsLoading(false);
                    }
                }
            ).subscribe();
        let pollInterval;
        if (modalState === 'processing') { pollInterval = setInterval(() => { checkPaymentStatus(); }, 4000); }
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
            const { data, error: rpcError } = await supabase.rpc('validate_promo_code', { p_code: promoCode, p_plan_name: planName, p_duration: duration, p_currency: currency, p_current_price: basePrice });
            if (rpcError) throw rpcError;
            const result = data[0];
            if (result.valid) { setDiscountedPrice(result.adjusted_price); setIsPromoApplied(true); setPromoDiscountDisplay(result.discount_type === 'percentage' ? `${result.discount_value}% OFF` : `Discount Applied`); }
            else { setPromoCodeError(result.error_message || 'Invalid code'); }
        } catch { setPromoCodeError('Failed to validate promo code.'); }
        finally { setIsLoading(false); }
    };

    const handleEasypaisaPayment = async () => {
        if (!mobileNumber || mobileNumber.length !== 11 || !mobileNumber.startsWith('03')) { setError("Please enter a valid 11-digit Easypaisa number starting with 03."); return; }
        setError(null); setIsLoading(true); setModalState('processing');
        const orderRefNum = `EP-${Date.now()}`;
        const amountFormatted = grandTotal.toFixed(2);
        const { data: { session } } = await supabase.auth.getSession();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        try {
            const response = await fetch(EASYPAISA_API_URL, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` }, body: JSON.stringify({ amount: amountFormatted, mobileNo: mobileNumber, orderRefNum, email: user?.email || 'customer@medmacs.app', userId: user?.id, validity, planName }) });
            clearTimeout(timeoutId);
            if (!response.ok && response.status !== 202) { const errorData = await response.json().catch(() => ({ message: "Server error occurred." })); throw new Error(errorData.message || "Gateway unreachable."); }
        } catch (err) { if (err.name === 'AbortError') return; setError(err.message || "An unexpected error occurred."); setModalState('failure'); setIsLoading(false); }
    };

    const handlePayFastPayment = async () => {
        setIsLoading(true); setError(null);
        const basketId = `ORD-${Date.now()}`;
        const finalAmount = grandTotal.toFixed(2);
        try {
            const { error: insertError } = await supabase.from('pending_payments').insert([{ user_id: user?.id, amount: finalAmount, order_id: basketId, status: 'initiated', validity, email: user?.email, plan_name: planName }]);
            if (insertError) throw new Error("Could not initialize transaction.");

            const response = await fetch('https://medmacs.app/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: finalAmount, basketId }) });
            const text = await response.text();
            let data; try { data = text ? JSON.parse(text) : null; } catch { throw new Error("Payment server returned invalid response."); }
            if (!response.ok || !data?.ACCESS_TOKEN) throw new Error(data?.message || "Failed to get payment token.");

            // GENERATE AUTO-SUBMITTING HTML FOR THE WEBVIEW
            const fields = {
                MERCHANT_ID: "103", Merchant_Name: "MEDMACS Pakistan", MERCHANT_USERAGENT: navigator.userAgent, TOKEN: data.ACCESS_TOKEN, PROCCODE: "00", TXNAMT: finalAmount, CUSTOMER_MOBILE_NO: mobileNumber || "03000000000",
                CUSTOMER_EMAIL_ADDRESS: user?.email || "", SUCCESS_URL: `${window.location.origin}/payment-success?plan=${planName}&validity=${validity}`, FAILURE_URL: `${window.location.origin}/payment-failure`,
                CHECKOUT_URL: `https://medmacs.app/api/payment-webhook`, BASKET_ID: basketId, ORDER_DATE: new Date().toISOString().slice(0, 10), SIGNATURE: "PAYMENT_REQ", VERSION: "V1.2",
                TXNDESC: `Upgrade to ${planName} (${duration})`, CURRENCY_CODE: "PKR", P1: user?.id || "", P2: planName, P3: duration
            };

            const formInputs = Object.entries(fields)
                .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
                .join('');

            const autoSubmitHtml = `
                <html>
                <body onload="document.forms[0].submit()">
                    <form method="POST" action="https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction">
                        ${formInputs}
                    </form>
                    <div style="display:flex; justify-content:center; align-items:center; height:100vh; font-family:sans-serif;">
                        <p>Loading Secure Payment Gateway...</p>
                    </div>
                </body>
                </html>
            `;

            const form = document.createElement("form");
            form.method = "POST";
            form.action = "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction";

            Object.entries(fields).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = key;
                input.value = value as string;
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();

            setModalState('processing'); // Set to processing so Supabase listener starts
            setIsLoading(false);
        } catch (err) { setError(err.message || "An error occurred."); setIsLoading(false); }
    };

    const processPayment = () => {
        if (isLoading || isRedirecting) return;
        if (!user) { setError("Please sign in to continue."); return; }
        if (!agreedToTerms) { setError("You must agree to the Terms, Privacy, and Refund policies to continue."); return; }
        paymentMethod === 'easypaisa' ? handleEasypaisaPayment() : handlePayFastPayment();
    };

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
            <Seo title="Checkout | Medmacs" />

            <header className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/pricing">
                        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
                        <span className="text-lg font-black">Checkout</span>
                    </div>
                    <ProfileDropdown />
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-lg mt-[var(--header-height)]">
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground uppercase italic">
                        Complete <span className="text-blue-600">Payment</span>
                    </h1>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">Secure checkout</p>
                </div>

                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-2xl p-1 mb-6">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                    <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10">
                        <h2 className="text-lg font-black uppercase tracking-tight mb-4">Order Summary</h2>
                        <div className="flex justify-between items-start mb-3">
                            <div>
                                <p className="text-sm font-bold">{planName} Plan</p>
                                <span className="text-[10px] mt-1 inline-block px-2 py-0.5 bg-white/20 rounded-full font-bold uppercase">{validityDisplay}</span>
                            </div>
                            <span className="font-bold">PKR {basePrice.toFixed(2)}</span>
                        </div>
                        {isPromoApplied && (
                            <div className="flex justify-between text-emerald-200 text-sm font-medium mb-3">
                                <span className="flex items-center"><BadgePercent className="mr-1.5 h-4 w-4" /> {promoDiscountDisplay}</span>
                                <span>- PKR {(basePrice - priceAfterPromo).toFixed(2)}</span>
                            </div>
                        )}
                        {mdrTax > 0 && (
                            <div className="flex justify-between text-white/60 text-xs mb-3">
                                <span>PayFast Tax (2.5%)</span>
                                <span>+ PKR {mdrTax.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="pt-4 border-t border-white/20 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Grand Total</span>
                            <span className="text-3xl font-black">PKR {grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-xl p-4 mb-6">
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">Promo Code</p>
                        <div className="flex gap-2">
                            <Input placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} disabled={isPromoApplied || isLoading} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11" />
                            <Button onClick={handleApplyPromoCode} disabled={isLoading || isPromoApplied || !promoCode} className="bg-white text-slate-900 hover:bg-white/90 rounded-xl h-11 px-5 font-bold text-xs uppercase">
                                {isPromoApplied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : 'Apply'}
                            </Button>
                        </div>
                        {promoCodeError && <p className="text-red-300 text-xs mt-2">{promoCodeError}</p>}
                    </div>
                </div>

                <div className="space-y-3 mb-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment Method</p>
                    <div onClick={() => setPaymentMethod('easypaisa')}
                        className={`relative overflow-hidden rounded-[1.5rem] p-4 shadow-xl cursor-pointer transition-all duration-300 ${paymentMethod === 'easypaisa' ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white' : 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white/80'}`}>
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5" />
                                <span className="font-black text-sm uppercase">Easypaisa</span>
                            </div>
                            {paymentMethod === 'easypaisa' && (
                                <div className="mt-3 animate-in fade-in zoom-in-95">
                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Mobile Account Number</label>
                                    <Input placeholder="03XXXXXXXXX" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11 mt-1" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div onClick={() => !isPayFastDisabled && setPaymentMethod('payfast')}
                        className={`relative overflow-hidden rounded-[1.5rem] p-4 shadow-xl transition-all duration-300 ${isPayFastDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'} ${paymentMethod === 'payfast' ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white' : 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white/80'}`}>
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                        <div className="relative z-10 flex items-center gap-3">
                            <CreditCard className="w-5 h-5" />
                            <div>
                                <span className="font-black text-sm uppercase">Cards / Bank (PayFast)</span>
                                <p className="text-[10px] opacity-70">+2.5% Tax</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-start space-x-3 p-3 mb-4">
                    <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked)} className="mt-1" />
                    <label htmlFor="terms" className="text-xs leading-snug text-muted-foreground">
                        By continuing to pay to Medmacs/Hmacs Studios, you agree to our{' '}
                        <Link to="/terms" className="text-primary hover:underline font-medium">Terms and Conditions</Link>,{' '}
                        <Link to="/privacypolicy" className="text-primary hover:underline font-medium">Privacy Policy</Link>, and{' '}
                        <Link to="/refund-policy" className="text-primary hover:underline font-medium">Refund Policy</Link>.
                    </label>
                </div>

                {error && <p className="text-destructive text-sm font-medium mb-4 text-center">{error}</p>}

                <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl h-14 text-lg font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all" onClick={processPayment} disabled={isLoading || isRedirecting}>
                    {(isLoading || isRedirecting) ? <Loader2 className="animate-spin h-6 w-6" /> : `Pay PKR ${grandTotal.toFixed(2)}`}
                </Button>
            </main>

            {/* PAYFAST WEBVIEW MODAL */}
            <Dialog open={showPayFastModal} onOpenChange={setShowPayFastModal}>
                <DialogContent className="sm:max-w-[500px] h-[85vh] p-0 overflow-hidden bg-white border-none rounded-t-3xl sm:rounded-3xl">
                    <DialogTitle className="sr-only">Secure Payment</DialogTitle>
                    {payFastHtml && (
                        <iframe
                            id="payfast-frame"
                            title="PayFast Gateway"
                            className="w-full h-full border-none"
                            srcDoc={payFastHtml}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={modalState !== 'idle' && !showPayFastModal} onOpenChange={(open) => !open && setModalState('idle')}>
                <DialogContent className={cn("sm:max-w-md bg-card border-border transition-all duration-300", "max-sm:fixed max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-w-full max-sm:border-x-0 max-sm:border-b-0")}>
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        {modalState === 'processing' && (
                            <>
                                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                <DialogTitle className="text-foreground">Authorizing Payment</DialogTitle>
                                <DialogDescription className="mt-2 text-muted-foreground px-4">Please approve the request on your Easypaisa app or enter your PIN on the mobile prompt.</DialogDescription>
                                <Button variant="ghost" size="sm" className="mt-4 text-xs text-muted-foreground hover:text-primary" onClick={checkPaymentStatus}><RefreshCw className="mr-2 h-3 w-3" /> Still waiting? Click to check status</Button>
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