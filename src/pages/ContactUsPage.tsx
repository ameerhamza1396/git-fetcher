import React, { useState, useEffect } from 'react';
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
    Mail,
    Phone,
    Instagram,
    Facebook,
    Linkedin,
    User,
    MessageSquare,
    Loader2,
    CheckCircle,
    Send,
    ArrowLeft,
    Moon,
    Sun
} from 'lucide-react';

import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { ElasticWrapper } from '@/components/ElasticWrapper'
// ProfileDropdown is not used in the provided code, so it's commented out.
// import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo'; // Import the Seo component
import PlanBadge from '@/components/PlanBadge';


const ContactUsPage = () => {
    const { user } = useAuth();
    const { theme, setTheme } = useTheme();

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        message: '',
    });
    const [formErrors, setFormErrors] = useState({});
    const [showSuccessMessage, setShowSuccessMessage] = useState(false); // New state for success message

    const { data: profile } = useQuery({
        queryKey: ['profileForContact', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, email, avatar_url, plan')
                .eq('id', user.id)
                .maybeSingle();
            if (error) {
                console.error('Error fetching profile for contact page:', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id,
        staleTime: Infinity,
    });

    const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const userAvatarUrl = profile?.avatar_url;

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
        setShowSuccessMessage(false); // Hide success message on input change
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.fullName.trim()) errors.fullName = 'Full Name is required.';
        if (!formData.email.trim()) {
            errors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = 'Email address is invalid.';
        }
        if (!formData.message.trim()) errors.message = 'Message is required.';
        else if (formData.message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const submitMessageMutation = useMutation({
        mutationFn: async (messageData) => {
            const { data, error } = await supabase
                .from('contact_messages')
                .insert([
                    {
                        full_name: messageData.fullName,
                        email: messageData.email,
                        message: messageData.message,
                        user_id: user?.id || null,
                    },
                ]);
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Your message has been sent successfully! We will get back to you soon.');
            setFormData({ fullName: user?.user_metadata?.full_name || profile?.full_name || '', email: user?.email || '', message: '' });
            setFormErrors({});
            setShowSuccessMessage(true); // Show success message on success
        },
        onError: (error) => {
            console.error('Error submitting contact message:', error);
            toast.error(`Failed to send message: ${error.message || 'An unexpected error occurred.'}`);
            setShowSuccessMessage(false); // Ensure success message is hidden on error
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowSuccessMessage(false); // Hide any previous success message on new submission attempt
        if (validateForm()) {
            submitMessageMutation.mutate(formData);
        } else {
            toast.error('Please correct the errors in the form.');
        }
    };

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            <Seo
            title="Contact Us"
            description="Get in touch with Medmacs App customer support for any queries, feedback, or assistance."
            canonical="https://medmacs.app/contact-us"
            />
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">                  <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Contact Us</span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <PlanBadge plan={profile?.plan} />
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center border border-purple-300 dark:border-purple-700">
                            {userAvatarUrl ? (
                                <img
                                    src={userAvatarUrl}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = `https://placehold.co/32x32/cccccc/333333?text=${displayName.substring(0,1).toUpperCase()}`;
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm">
                                    {displayName.substring(0, 1).toUpperCase()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

        <ElasticWrapper>
            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-4xl">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center pt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
                    Get in Touch with Medmacs!
                </h1>

                <Card className="mb-8 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg animate-fade-in">
                    <CardHeader className="text-center">
                        <CardTitle className="text-gray-900 dark:text-white text-2xl mb-2">Our Contact Information</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            Feel free to reach out to us through any of the following channels.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Email */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-gray-700 dark:text-gray-300">
                            <div className="flex items-center mb-1 sm:mb-0 sm:flex-shrink-0">
                                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                                <span className="font-medium">Email:</span>
                            </div>
                            <a href="mailto:hi@medmacs.app" className="text-blue-600 dark:text-blue-400 hover:underline">hi@medmacs.app</a>
                        </div>
                        {/* Phone */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-gray-700 dark:text-gray-300">
                            <div className="flex items-center mb-1 sm:mb-0 sm:flex-shrink-0">
                                <Phone className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                                <span className="font-medium">Contact & WhatsApp:</span>
                            </div>
                            <a href="tel:+923242456162" className="text-green-600 dark:text-green-400 hover:underline">03242456162</a>
                        </div>
                        {/* Instagram */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-gray-700 dark:text-gray-300">
                            <div className="flex items-center mb-1 sm:mb-0 sm:flex-shrink-0">
                                <Instagram className="h-5 w-5 text-pink-600 dark:text-pink-400 mr-2" />
                                <span className="font-medium">Instagram:</span>
                            </div>
                            <a href="https://instagram.com/ameerhamza.exe" target="_blank" rel="noopener noreferrer" className="text-pink-600 dark:text-pink-400 hover:underline">instagram.com/ameerhamza.exe2</a>
                        </div>
                        {/* Facebook */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-gray-700 dark:text-gray-300">
                            <div className="flex items-center mb-1 sm:mb-0 sm:flex-shrink-0">
                                <Facebook className="h-5 w-5 text-blue-800 dark:text-blue-600 mr-2" />
                                <span className="font-medium">Facebook:</span>
                            </div>
                            <a href="https://facebook.com/ameerhamza.exe2" target="_blank" rel="noopener noreferrer" className="text-blue-800 dark:text-blue-600 hover:underline">facebook.com/ameerhamza.exe2</a>
                        </div>
                        {/* LinkedIn */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 text-gray-700 dark:text-gray-300">
                            <div className="flex items-center mb-1 sm:mb-0 sm:flex-shrink-0">
                                <Linkedin className="h-5 w-5 text-blue-700 dark:text-blue-500 mr-2" />
                                <span className="font-medium">LinkedIn:</span>
                            </div>
                            <a href="https://www.linkedin.com/in/ameerhamza.exe/" target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-500 hover:underline">linkedin.com/in/ameerhamza.exe/</a>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 shadow-lg animate-fade-in">
                    <CardHeader className="text-center pb-6">
                        <CardTitle className="text-gray-900 dark:text-white text-2xl mb-2">Send Us a Message</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            Have a question, feedback, or need support? Send us a message directly!
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <Label htmlFor="fullName" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                    <User className="h-4 w-4 mr-2 text-blue-500" /> Full Name
                                </Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="Your Full Name"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    required
                                    readOnly={!!user && !!profile?.full_name}
                                    className={!!user && !!profile?.full_name ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}
                                />
                                {formErrors.fullName && <p className="text-red-500 text-sm mt-1">{formErrors.fullName}</p>}
                            </div>

                            <div>
                                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                    <Mail className="h-4 w-4 mr-2 text-green-500" /> Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your@example.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    readOnly={!!user && !!user.email}
                                    className={!!user && !!user.email ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}
                                />
                                {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
                            </div>

                            <div>
                                <Label htmlFor="message" className="text-gray-700 dark:text-gray-300 flex items-center mb-1">
                                    <MessageSquare className="h-4 w-4 mr-2 text-purple-500" /> Your Message
                                </Label>
                                <Textarea
                                    id="message"
                                    placeholder="Type your message here..."
                                    value={formData.message}
                                    onChange={handleInputChange}
                                    rows={6}
                                    required
                                />
                                {formErrors.message && <p className="text-red-500 text-sm mt-1">{formErrors.message}</p>}
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
                                disabled={submitMessageMutation.isPending}
                            >
                                {submitMessageMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="mr-2 h-4 w-4" />
                                )}
                                {submitMessageMutation.isPending ? 'Sending Message...' : 'Send Message'}
                            </Button>

                            {showSuccessMessage && (
                                <div className="text-center mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md border border-green-200 dark:border-green-800 flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 mr-2" />
                                    <span>Your message has been received and our team will contact you shortly.</span>
                                </div>
                            )}
                        </form>
                    </CardContent>
                </Card>
            </div>
            </ElasticWrapper>
        </div>
    );
};

export default ContactUsPage;
