// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    Mail, Phone, Instagram, Facebook, Linkedin, User, MessageSquare,
    Loader2, CheckCircle, Send, ArrowLeft
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Seo from '@/components/Seo';

const ContactUsPage = () => {
    const { user } = useAuth();
    const headerRef = useRef<HTMLElement>(null);
    const lastScrollY = useRef(0);
    const [headerVisible, setHeaderVisible] = useState(true);

    const [formData, setFormData] = useState({ fullName: '', email: '', message: '' });
    const [formErrors, setFormErrors] = useState({});
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    const { data: profile } = useQuery({
        queryKey: ['profileForContact', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase.from('profiles').select('full_name, email, avatar_url, plan').eq('id', user.id).maybeSingle();
            if (error) return null;
            return data;
        },
        enabled: !!user?.id,
        staleTime: Infinity,
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

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                email: user.email || '',
                fullName: profile?.full_name || user.user_metadata?.full_name || '',
            }));
        }
    }, [user, profile]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
        setFormErrors(prev => ({ ...prev, [id]: undefined }));
        setShowSuccessMessage(false);
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.fullName.trim()) errors.fullName = 'Full Name is required.';
        if (!formData.email.trim()) errors.email = 'Email is required.';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email address is invalid.';
        if (!formData.message.trim()) errors.message = 'Message is required.';
        else if (formData.message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const submitMessageMutation = useMutation({
        mutationFn: async (messageData) => {
            const { data, error } = await supabase.from('contact_messages').insert([{
                full_name: messageData.fullName, email: messageData.email,
                message: messageData.message, user_id: user?.id || null,
            }]);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Your message has been sent successfully!');
            setFormData({ fullName: user?.user_metadata?.full_name || profile?.full_name || '', email: user?.email || '', message: '' });
            setFormErrors({});
            setShowSuccessMessage(true);
        },
        onError: (error) => {
            toast.error(`Failed to send message: ${error.message}`);
            setShowSuccessMessage(false);
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowSuccessMessage(false);
        if (validateForm()) submitMessageMutation.mutate(formData);
        else toast.error('Please correct the errors in the form.');
    };

    const contactLinks = [
        { icon: Mail, label: 'Email', value: 'hi@medmacs.app', href: 'mailto:hi@medmacs.app', gradient: 'from-blue-600 via-indigo-600 to-violet-700' },
        { icon: Phone, label: 'WhatsApp', value: '03242456162', href: 'tel:+923242456162', gradient: 'from-emerald-600 via-teal-600 to-cyan-700' },
        { icon: Instagram, label: 'Instagram', value: '@ameerhamza.exe', href: 'https://instagram.com/ameerhamza.exe', gradient: 'from-rose-600 via-pink-600 to-fuchsia-700' },
        { icon: Facebook, label: 'Facebook', value: 'ameerhamza.exe2', href: 'https://facebook.com/ameerhamza.exe2', gradient: 'from-blue-700 via-blue-600 to-indigo-700' },
        { icon: Linkedin, label: 'LinkedIn', value: 'ameerhamza.exe', href: 'https://www.linkedin.com/in/ameerhamza.exe/', gradient: 'from-sky-600 via-blue-600 to-indigo-700' },
    ];

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
            <Seo title="Contact Us" description="Get in touch with Medmacs App" canonical="https://medmacs.app/contact-us" />

            <header
                ref={headerRef}
                className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard">
                        <Button variant="ghost" size="sm" className="w-9 h-9 p-0 hover:scale-110">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
                        <span className="text-lg font-black">Contact Us</span>
                    </div>
                    <div className="w-9" />
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-2xl mt-[calc(env(safe-area-inset-top)+60px)]">
                <div className="text-center mb-8">
                    <h1 className="text-2xl md:text-4xl font-black tracking-tight text-foreground uppercase italic">
                        Get in <span className="text-blue-600">Touch</span>
                    </h1>
                    <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">We'd love to hear from you</p>
                </div>

                {/* Contact cards - pricing style */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    {contactLinks.map((item, i) => (
                        <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                           className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${item.gradient} text-white p-4 shadow-xl hover:scale-105 transition-all duration-300 ${i === 0 ? 'col-span-2 sm:col-span-1' : ''}`}>
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
                                maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                            }} />
                            <div className="relative z-10">
                                <item.icon className="w-5 h-5 mb-2 opacity-80" />
                                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{item.label}</p>
                                <p className="text-xs font-bold mt-1 truncate">{item.value}</p>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Message form - glass card */}
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-2xl p-1">
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                    }} />
                    <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10">
                        <h2 className="text-xl font-black uppercase tracking-tight mb-1">Send a Message</h2>
                        <p className="text-xs text-white/60 mb-6">Questions, feedback, or support requests</p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="fullName" className="text-white/80 text-xs font-bold uppercase tracking-wider">Full Name</Label>
                                <Input id="fullName" value={formData.fullName} onChange={handleInputChange} required
                                    readOnly={!!user && !!profile?.full_name}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11 mt-1" />
                                {formErrors.fullName && <p className="text-red-300 text-xs mt-1">{formErrors.fullName}</p>}
                            </div>
                            <div>
                                <Label htmlFor="email" className="text-white/80 text-xs font-bold uppercase tracking-wider">Email</Label>
                                <Input id="email" type="email" value={formData.email} onChange={handleInputChange} required
                                    readOnly={!!user && !!user.email}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11 mt-1" />
                                {formErrors.email && <p className="text-red-300 text-xs mt-1">{formErrors.email}</p>}
                            </div>
                            <div>
                                <Label htmlFor="message" className="text-white/80 text-xs font-bold uppercase tracking-wider">Message</Label>
                                <Textarea id="message" value={formData.message} onChange={handleInputChange} rows={5}
                                    placeholder="Type your message..."
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl mt-1" />
                                {formErrors.message && <p className="text-red-300 text-xs mt-1">{formErrors.message}</p>}
                            </div>
                            <Button type="submit" disabled={submitMessageMutation.isPending}
                                className="w-full bg-white text-slate-900 hover:scale-105 transition-all rounded-xl h-12 uppercase font-black text-xs tracking-widest shadow-2xl">
                                {submitMessageMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                {submitMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                            </Button>
                            {showSuccessMessage && (
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-sm">
                                    <CheckCircle className="h-4 w-4 shrink-0" />
                                    <span>Message received! We'll get back to you soon.</span>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ContactUsPage;
