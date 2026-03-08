// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
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
import { Browser } from '@capacitor/browser';

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
                        setIsLoading(false);
                        Browser.close().catch(() => {});
                    }
                    else if (payload.new.status === 'failed') {
                        setError(payload.new.error_message || "Transaction failed.");
                        setModalState('failure');
                        setIsLoading(false);
                        Browser.close().catch(() => {});
                    }
                }
            ).subscribe();

        // When user closes the browser tab, do a manual status check
        const browserListener = Browser.addListener('browserFinished', () => {
            checkPaymentStatus();
        });

        let pollInterval;
        if (modalState === 'processing') { pollInterval = setInterval(() => { checkPaymentStatus(); }, 4000); }
        return () => {
            supabase.removeChannel(channel);
            if (pollInterval) clearInterval(pollInterval);
            browserListener.then(l => l.remove()).catch(() => {});
        };
    }, [user, modalState]);

    if (!location.state) return <Navigate to="/pricing" replace />;

    const { planName = 'Premium', price: basePriceStr, duration = 'Monthly', currency = 'PKR', validity = 'monthly' } = location.state;
    const basePrice = basePriceStr ? parseFloat(basePriceStr) : 0;
    const validityDisplay = validity.toLowerCase() === 'yearly' ? 'Validity: 365 Days' : 'Validity: 30 Days';
    const priceAfterPromo = discountedPrice !== null ? discountedPrice : basePrice;
    const grandTotal = priceAfterPromo;
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
            const { data: { session } } = await supabase.auth.getSession();
            const { error: insertError } = await supabase.from('pending_payments').insert([{ user_id: user?.id, amount: finalAmount, order_id: basketId, status: 'initiated', validity, email: user?.email, plan_name: planName }]);
            if (insertError) throw new Error("Could not initialize transaction.");

            const response = await fetch('https://medmacs.app/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
                },
                body: JSON.stringify({ amount: finalAmount, basketId })
            });

            const text = await response.text();
            let data; try { data = text ? JSON.parse(text) : null; } catch { throw new Error(`Server returned non-JSON response (${response.status}).`); }
            if (!response.ok || !data?.ACCESS_TOKEN) throw new Error(data?.message || `Gateway error (${response.status})`);

            // On Android, SUCCESS/FAILURE URLs must point to the Capacitor local server
            // so PayFast redirects back INTO the app (not to the external website).
            // On web, use the real domain.
            const { Capacitor } = await import('@capacitor/core');
            const callbackBase = Capacitor.isNativePlatform()
                ? 'https://com.hmacs.medmacs'
                : 'https://medmacs.app';

            const fields = {
                MERCHANT_ID: "248744", Merchant_Name: "MEDMACS Pakistan", MERCHANT_USERAGENT: navigator.userAgent,
                TOKEN: data.ACCESS_TOKEN, PROCCODE: "00", TXNAMT: finalAmount,
                CUSTOMER_MOBILE_NO: mobileNumber || "03000000000",
                CUSTOMER_EMAIL_ADDRESS: user?.email || "",
                SUCCESS_URL: `${callbackBase}/payment-success?plan=${planName}&validity=${validity}&basket_id=${basketId}`,
                FAILURE_URL: `${callbackBase}/payment-failure`,
                CHECKOUT_URL: `https://medmacs.app/api/payment-webhook`,
                BASKET_ID: basketId, ORDER_DATE: new Date().toISOString().slice(0, 10),
                SIGNATURE: "PAYMENT_REQ", VERSION: "V1.2",
                TXNDESC: `Upgrade to ${planName} (${duration})`, CURRENCY_CODE: "PKR",
                P1: user?.id || "", P2: planName, P3: duration
            };

            const form = document.createElement("form");
            form.method = "POST";
            form.action = "https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction";
            Object.entries(fields).forEach(([key, value]) => {
                const input = document.createElement("input");
                input.type = "hidden"; input.name = key; input.value = value as string;
                form.appendChild(input);
            });
            document.body.appendChild(form);
            form.submit();

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
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="text-center mb-8"
                >
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground uppercase italic">
                        Complete <span className="text-blue-600">Payment</span>
                    </h1>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">Secure checkout</p>
                </motion.div>

                {/* Animated Container for Staggered Children */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.15
                            }
                        }
                    }}
                >
                    {/* Order Summary Card */}
                    <motion.div 
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}
                        className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600/90 via-indigo-600/90 to-blue-800/90 text-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 p-1 mb-6"
                    >
                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.2) 20px, rgba(255,255,255,0.2) 40px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                        <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-[1.8rem] p-6 border border-white/10 shadow-inner">
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
                        <div className="pt-4 border-t border-white/20 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-widest text-white/70">Grand Total</span>
                            <span className="text-3xl font-black">PKR {grandTotal.toFixed(2)}</span>
                        </div>
                    </div>
                    </motion.div>

                    {/* Promo Code Card */}
                    <motion.div 
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}
                        className="relative overflow-hidden rounded-[1.5rem] bg-slate-800/90 dark:bg-slate-900/90 text-white shadow-lg border border-white/5 p-4 mb-6"
                    >
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
                    <div className="relative z-10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">Promo Code</p>
                        <div className="flex gap-2">
                            <Input placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} disabled={isPromoApplied || isLoading} className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11" />
                            <Button onClick={handleApplyPromoCode} disabled={isLoading || isPromoApplied || !promoCode} className="bg-white text-slate-900 hover:bg-white/90 rounded-xl h-11 px-5 font-bold text-xs uppercase">
                                {isPromoApplied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : 'Apply'}
                            </Button>
                        </div>
                        {promoCodeError && <p className="text-red-300 text-xs mt-2">{promoCodeError}</p>}
                        {promoCodeError && <p className="text-red-400 text-xs mt-2">{promoCodeError}</p>}
                    </div>
                    </motion.div>

                    {/* Payment Methods */}
                    <motion.div 
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}
                        className="space-y-3 mb-6"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Payment Method</p>
                        <motion.div 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPaymentMethod('easypaisa')}
                            className={`relative overflow-hidden rounded-[1.5rem] p-4 shadow-md cursor-pointer transition-colors duration-300 border ${paymentMethod === 'easypaisa' ? 'bg-emerald-600/90 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'}`}
                        >
                            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)', display: paymentMethod === 'easypaisa' ? 'block' : 'none' }} />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3">
                                <Wallet className="w-5 h-5" />
                                <span className="font-black text-sm uppercase">Easypaisa</span>
                            </div>
                            {paymentMethod === 'easypaisa' && (
                                <div className="mt-3 animate-in fade-in zoom-in-95">
                                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-70">Mobile Account Number</label>
                                    <Input placeholder="03XXXXXXXXX" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} className={`bg-white/10 text-white placeholder:text-white/50 rounded-xl h-11 mt-1 border-white/20`} />
                                </div>
                            )}
                        </div>
                        </motion.div>

                        <motion.div 
                            whileHover={{ scale: !isPayFastDisabled ? 1.02 : 1 }}
                            whileTap={{ scale: !isPayFastDisabled ? 0.98 : 1 }}
                            onClick={() => !isPayFastDisabled && setPaymentMethod('payfast')}
                            className={`relative overflow-hidden rounded-[1.5rem] p-4 shadow-md transition-colors duration-300 border ${isPayFastDisabled ? 'opacity-50 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-400' : 'cursor-pointer'} ${paymentMethod === 'payfast' ? 'bg-blue-600/90 border-blue-500 text-white' : (!isPayFastDisabled ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300' : '')}`}
                        >
                            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`, maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)', display: paymentMethod === 'payfast' ? 'block' : 'none' }} />
                        <div className="relative z-10 flex items-center gap-3">
                            <CreditCard className="w-5 h-5" />
                            <div>
                                <span className="font-black text-sm uppercase">Cards / Bank (PayFast)</span>
                            </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Terms and Button */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}>
                        <div className="flex items-start space-x-3 p-3 mb-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked)} className="mt-1" />
                            <label htmlFor="terms" className="text-xs leading-snug text-muted-foreground cursor-pointer">
                                By continuing to pay to Medmacs/Hmacs Studios, you agree to our{' '}
                                <Link to="/terms" className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors">Terms and Conditions</Link>,{' '}
                                <Link to="/privacypolicy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors">Privacy Policy</Link>, and{' '}
                                <Link to="/refund-policy" className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors">Refund Policy</Link>.
                            </label>
                        </div>

                        {error && (
                            <motion.p 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-destructive text-sm font-medium mb-4 text-center bg-destructive/10 py-2 rounded-lg"
                            >
                                {error}
                            </motion.p>
                        )}

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl h-14 text-lg font-black uppercase tracking-widest shadow-[0_8px_30px_rgb(37,99,235,0.2)] transition-colors overflow-hidden relative" 
                                onClick={processPayment} 
                                disabled={isLoading || isRedirecting}
                            >
                                <span className="relative z-10 flex items-center justify-center">
                                    {(isLoading || isRedirecting) ? <Loader2 className="animate-spin h-6 w-6" /> : `Pay PKR ${grandTotal.toFixed(2)}`}
                                </span>
                            </Button>
                        </motion.div>
                    </motion.div>
                </motion.div>
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