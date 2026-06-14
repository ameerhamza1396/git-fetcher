// @ts-nocheck
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
    CheckCircle, XCircle, BadgePercent, ArrowLeft, Loader2, RefreshCw
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
                CHECKOUT_URL: `https://medmacs.app/api/payment-`,
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
        <div className="min-h-screen w-full bg-background">
            <Seo title="Checkout | Medmacs" />

            <div className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/pricing">
                        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-8 h-8" />
                        <span className="text-xl font-bold text-foreground">Checkout</span>
                    </div>
                    <ProfileDropdown />
                </div>
            </div>

            <main className="container mx-auto px-4 lg:px-8 py-12 lg:py-16 max-w-4xl">
                <div className="text-center mb-12 mt-[var(--header-height)]">
                    <motion.h1 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="text-3xl md:text-5xl font-black tracking-tight text-foreground italic uppercase"
                    >
                        Complete <span className="text-primary">Payment</span>
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-3"
                    >
                        Secure checkout
                    </motion.p>
                </div>

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
                        className="rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-xl overflow-hidden mb-6"
                    >
                        <div className="p-6">
                            <h2 className="text-lg font-black uppercase tracking-tight text-foreground mb-4">Order Summary</h2>
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-sm font-bold text-foreground">{planName} Plan</p>
                                    <span className="text-[10px] mt-1 inline-block px-2 py-0.5 bg-primary/10 text-primary rounded-full font-bold uppercase">{validityDisplay}</span>
                                </div>
                                <span className="font-bold text-foreground">PKR {basePrice.toFixed(2)}</span>
                            </div>
                            {isPromoApplied && (
                                <div className="flex justify-between text-emerald-500 text-sm font-medium mb-3">
                                    <span className="flex items-center"><BadgePercent className="mr-1.5 h-4 w-4" /> {promoDiscountDisplay}</span>
                                    <span>- PKR {(basePrice - priceAfterPromo).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-4 border-t border-border/40 flex justify-between items-center">
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Grand Total</span>
                                <span className="text-3xl font-black text-foreground">PKR {grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Promo Code Card */}
                    <motion.div 
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}
                        className="rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-xl overflow-hidden mb-6"
                    >
                        <div className="p-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Promo Code</p>
                            <div className="flex gap-2">
                                <Input placeholder="Enter code" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} disabled={isPromoApplied || isLoading} className="rounded-xl h-11" />
                                <Button onClick={handleApplyPromoCode} disabled={isLoading || isPromoApplied || !promoCode} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 px-5 font-bold text-xs uppercase">
                                    {isPromoApplied ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : 'Apply'}
                                </Button>
                            </div>
                            {promoCodeError && <p className="text-destructive text-xs mt-2">{promoCodeError}</p>}
                        </div>
                    </motion.div>

                    {/* Payment Methods */}
                    <motion.div 
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}
                        className="mb-6"
                    >
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Payment Method</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                            <motion.div 
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setPaymentMethod('easypaisa')}
                                className={`rounded-[2rem] p-5 cursor-pointer transition-all duration-300 border flex flex-col ${paymentMethod === 'easypaisa' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border/40 bg-card/80 backdrop-blur-xl'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <svg className={`w-5 h-5 shrink-0 ${paymentMethod === 'easypaisa' ? 'text-primary' : 'text-muted-foreground'}`} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path fill="none" stroke="currentColor" strokeLinejoin="round" d="M24.6025,4.5c8.516,0,15.42,5.7166,15.42,12.7693S33.12,28.6141,24.6025,28.6141Q12.4689,28.3687,7.4111,20.972A1.6469,1.6469,0,0,1,7.1663,19.73Q10.0575,5.2982,24.6025,4.5Zm-.5751,7.9439q-7.3449.7437-8.9894,6.9928,2.2406,1.9754,8.9894,2.1927c4.5207-.0711,7.2591-1.389,7.3129-4.4525C31.0589,13.7933,27.7687,12.3159,24.0274,12.4439Z"/>
                                        <path fill="none" stroke="currentColor" strokeLinejoin="round" d="M6.396,24.71C8.9221,31.9571,15.8885,35.99,23.05,35.99c5.9392,0,9.8755-2.5707,11.94-6.4492L41.6456,33.71c-2.32,5.6749-9.1977,9.79-17.3225,9.79-10.0289,0-18.617-6.7591-17.93-18.5113C6.393,24.8952,6.394,24.8017,6.396,24.71Z"/>
                                    </svg>
                                    <div>
                                        <span className={`font-black text-sm uppercase ${paymentMethod === 'easypaisa' ? 'text-foreground' : 'text-muted-foreground'}`}>Easypaisa</span>
                                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed">Pay using your mobile wallet</p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div 
                                whileHover={{ scale: !isPayFastDisabled ? 1.02 : 1 }}
                                whileTap={{ scale: !isPayFastDisabled ? 0.98 : 1 }}
                                onClick={() => !isPayFastDisabled && setPaymentMethod('payfast')}
                                className={`rounded-[2rem] p-5 transition-all duration-300 border flex flex-col ${isPayFastDisabled ? 'opacity-40 grayscale cursor-not-allowed border-border/40 bg-card/50' : 'cursor-pointer'} ${paymentMethod === 'payfast' ? 'border-primary bg-primary/5 ring-1 ring-primary' : (!isPayFastDisabled ? 'border-border/40 bg-card/80 backdrop-blur-xl' : '')}`}
                            >
                                <div className="flex items-center gap-3">
                                    <svg className={`w-5 h-5 shrink-0 ${paymentMethod === 'payfast' ? 'text-primary' : isPayFastDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`} viewBox="0 0 244.683 244.683" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                        <path d="m244.054,118.587l-25.417-79.232c-1.073-3.344-3.384-6.07-6.508-7.676-3.123-1.605-6.685-1.898-10.029-0.827l-129.21,41.45c-6.904,2.215-10.718,9.633-8.504,16.537l5.171,16.12h-56.409c-7.25,0-13.148,5.898-13.148,13.148v83.209c0,7.25 5.898,13.148 13.148,13.148h144.695c7.25,0 13.148-5.898 13.148-13.148v-45.482l64.558-20.71c6.904-2.214 10.719-9.632 8.505-16.537zm-86.21,83.878h-144.696c-0.633,0-1.148-0.515-1.148-1.148v-83.209c0-0.633 0.515-1.148 1.148-1.148h144.695c0.633,0 1.148,0.515 1.148,1.148v83.209c0.001,0.633-0.514,1.148-1.147,1.148zm48.797-160.114c0.193,0.099 0.448,0.296 0.568,0.67l5.072,15.81-131.396,42.153-5.072-15.811c-0.194-0.603 0.14-1.251 0.743-1.444l129.209-41.45c0.126-0.041 0.245-0.057 0.354-0.057 0.215,7.10543e-15 0.394,0.063 0.522,0.129zm-48.797,62.608h-50.064l108.167-34.7 16.68,51.994c0.193,0.604-0.14,1.252-0.743,1.445l-60.892,19.534v-25.125c-2.84217e-14-7.25-5.898-13.148-13.148-13.148z"/>
                                        <path d="m56.54,134.712h-25.666c-3.313,0-6,2.687-6,6s2.687,6 6,6h25.666c3.313,0 6-2.687 6-6s-2.686-6-6-6z"/>
                                        <path d="m85.207,146.712c3.313,0 6-2.687 6-6s-2.687-6-6-6h-9.333c-3.313,0-6,2.687-6,6s2.687,6 6,6h9.333z"/>
                                        <path d="m149.207,160.712c0-3.313-2.687-6-6-6h-29.333c-3.313,0-6,2.687-6,6v26c0,3.313 2.687,6 6,6h29.333c3.313,0 6-2.687 6-6v-26zm-12,6v14h-17.333v-14h17.333z"/>
                                    </svg>
                                    <div>
                                        <span className={`font-black text-sm uppercase ${paymentMethod === 'payfast' ? 'text-foreground' : isPayFastDisabled ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>Cards / Bank (PayFast)</span>
                                        <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-relaxed">Pay via card or internet banking</p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {paymentMethod === 'easypaisa' && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-xl p-5"
                            >
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Mobile Account Number</label>
                                <Input placeholder="03XXXXXXXXX" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))} maxLength={11} className="rounded-xl h-11 mt-1" />
                            </motion.div>
                        )}

                        {paymentMethod === 'payfast' && !isPayFastDisabled && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 rounded-[2rem] border border-border/40 bg-card/80 backdrop-blur-xl p-5"
                            >
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Your payment will be processed securely by our payment partner. You will be redirected to complete the transaction.
                                </p>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* Terms and Button */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } } }}>
                        <div className="flex items-start space-x-3 p-3 mb-4 rounded-xl hover:bg-muted/50 transition-colors">
                            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={(checked) => setAgreedToTerms(checked)} className="mt-1" />
                            <label htmlFor="terms" className="text-xs leading-snug text-muted-foreground cursor-pointer">
                                By continuing to pay to Medmacs/Hmacs Studios, you agree to our{' '}
                                <Link to="/terms" className="text-primary hover:underline font-medium transition-colors">Terms and Conditions</Link>,{' '}
                                <Link to="/privacypolicy" className="text-primary hover:underline font-medium transition-colors">Privacy Policy</Link>, and{' '}
                                <Link to="/refund-policy" className="text-primary hover:underline font-medium transition-colors">Refund Policy</Link>.
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
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-14 text-lg font-black uppercase tracking-widest shadow-lg transition-all duration-300" 
                                onClick={processPayment} 
                                disabled={isLoading || isRedirecting}
                            >
                                <span className="flex items-center justify-center">
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