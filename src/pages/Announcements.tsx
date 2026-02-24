// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bot, Zap, Brain, FileText, Moon, Sun, MessageSquare, User, Mail, Phone, BookOpen, UserCheck, Shield, ClipboardList, PenTool, ImageIcon, CheckCircle, XCircle, Lightbulb, Laptop, Share2, Palette, BellRing, Calendar, ScrollText } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import useMutation and useQueryClient
import { supabase } from '@/integrations/supabase/client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import ReCAPTCHA from 'react-google-recaptcha';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo'; // Import the Seo component
import PlanBadge from '@/components/PlanBadge';


const AnnouncementsPage = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const queryClient = useQueryClient(); // Initialize query client


    type ProfileType = { role: string; plan: string } | null;

    const { data: profile } = useQuery<ProfileType>({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('role, plan')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                return null;
            }
            return data as ProfileType;
        },
        enabled: !!user?.id
    });

    const rawUserPlan = profile?.plan?.toLowerCase?.() || 'Loading';

    // Fetch announcements from Supabase
    const { data: announcements, isLoading, isError, error } = useQuery({
        queryKey: ['announcements'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching announcements:', error);
                throw new Error('Failed to load announcements. Please try again later.');
            }
            return data;
        },
        enabled: true,
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
    });

    // Fetch user's read announcements
    const { data: readAnnouncements, isLoading: isLoadingReadAnnouncements } = useQuery({
        queryKey: ['readAnnouncements', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];
            const { data, error } = await supabase
                .from('user_announcements')
                .select('announcement_id')
                .eq('user_id', user.id);

            if (error) {
                console.error('Error fetching read announcements:', error);
                return [];
            }
            return data.map(item => item.announcement_id);
        },
        enabled: !!user?.id,
        staleTime: 0, // Always refetch when this page is accessed to get accurate unread count
    });

    // Mutation to mark announcements as read
    const markAsReadMutation = useMutation({
        mutationFn: async (announcementIds: string[]) => {
            if (!user?.id || !announcementIds || announcementIds.length === 0) return;

            const recordsToInsert = announcementIds.map((id: string) => ({
                user_id: user.id,
                announcement_id: id,
            }));

            // Use upsert to avoid duplicate key errors if an announcement was already marked read
            const { error } = await supabase
                .from('user_announcements')
                .upsert(recordsToInsert, { onConflict: 'user_id, announcement_id' });

            if (error) {
                console.error('Error marking announcements as read:', error);
                throw error;
            }
        },
        onSuccess: () => {
            // Invalidate readAnnouncements query to refetch updated data
            queryClient.invalidateQueries({ queryKey: ['readAnnouncements', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['profileDropdownProfile', user?.id] });
        },
        onError: (err) => {
            console.error('Failed to mark announcements as read:', err.message);
        }
    });

    // Calculate unread announcements count
    const unreadAnnouncementsCount = (announcements && readAnnouncements)
        ? announcements.filter(announcement => !readAnnouncements.includes(announcement.id)).length
        : 0;

    // Mark all current announcements as read when component mounts (or announcements/user change)
    useEffect(() => {
        if (user && announcements && announcements.length > 0 && !isLoadingReadAnnouncements) {
            const announcementIds = announcements.map(announcement => announcement.id);
            markAsReadMutation.mutate(announcementIds);
        }
    }, [user, announcements, isLoadingReadAnnouncements]); // Depend on user, announcements, and read status loading

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            <Seo
            title="Announcements"
            description="Stay updated with the latest news, updates, and important announcements from Medistics App."
            canonical="https://medmacs.app/announcements"
            />
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">                  <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/" className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <BellRing className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">Announcements</span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
                            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </Button>
                        <PlanBadge plan={profile?.plan} />
                        <ProfileDropdown />
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
                <div className="text-center mb-8 animate-fade-in">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 pt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
                        📢 Latest Medmacs Announcements
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        Stay updated with important news, updates, and notifications from Medmacs.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto space-y-6">
                    {isLoading && (
                        <div className="text-center text-blue-500 dark:text-blue-400 mt-8 flex flex-col items-center justify-center">
                            <BellRing className="h-8 w-8 animate-bounce mb-3" />
                            <p>Loading announcements...</p>
                        </div>
                    )}

                    {isError && (
                        <div className="text-center text-red-600 dark:text-red-400 mt-8 flex flex-col items-center justify-center">
                            <XCircle className="h-8 w-8 mb-3" />
                            <p>{error?.message || 'Failed to load announcements. Please check your connection.'}</p>
                        </div>
                    )}

                    {!isLoading && !isError && announcements?.length === 0 && (
                        <div className="text-center text-gray-600 dark:text-gray-400 mt-8 flex flex-col items-center justify-center">
                            <ScrollText className="h-8 w-8 mb-3" />
                            <p>No announcements available at the moment. Please check back later!</p>
                        </div>
                    )}

                    {announcements?.map((announcement) => (
                        <Card key={announcement.id} className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow duration-300 animate-fade-in">
                            <CardHeader>
                                <CardTitle className="text-gray-900 dark:text-white flex items-center">
                                    <BellRing className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                                    {announcement.title}
                                </CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                                    <Calendar className="h-4 w-4 mr-1.5 text-gray-500" />
                                    {new Date(announcement.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">{announcement.content}</p>
                                {announcement.media_url && (
                                    <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                                        {announcement.media_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                                            <img
                                                src={announcement.media_url}
                                                alt="Announcement media"
                                                className="w-full h-auto object-cover max-h-96"
                                                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/600x400/cccccc/333333?text=Image+Not+Available'; }}
                                            />
                                        ) : announcement.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                            <video controls className="w-full h-auto max-h-96">
                                                <source src={announcement.media_url} type={`video/${announcement.media_url.split('.').pop()}`} />
                                                Your browser does not support the video tag.
                                            </video>
                                        ) : (
                                            <p className="text-red-500 text-sm p-2">Unsupported media type.</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            
        </div>
    );
};

export default AnnouncementsPage;