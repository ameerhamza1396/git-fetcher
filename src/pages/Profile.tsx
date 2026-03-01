// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, Loader2, XCircle, Shield, Star, Crown, Lock, CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Seo from '@/components/Seo';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const planStyles = {
    free: { gradient: 'from-slate-500 via-slate-600 to-slate-700', icon: Shield, accent: 'bg-slate-300' },
    premium: { gradient: 'from-blue-600 via-indigo-600 to-violet-700', icon: Star, accent: 'bg-yellow-400' },
    iconic: { gradient: 'from-rose-600 via-red-600 to-orange-700', icon: Crown, accent: 'bg-amber-400' },
};

const Profile = () => {
    const queryClient = useQueryClient();
    const { user, isLoading: authLoading } = useAuth();
    const headerRef = useRef<HTMLElement>(null);
    const lastScrollY = useRef(0);
    const [headerVisible, setHeaderVisible] = useState(true);

    const [editableProfile, setEditableProfile] = useState({ full_name: '', username: '', year: '' });
    const [loadingUpdateProfile, setLoadingUpdateProfile] = useState(false);
    const validYears = ["1st", "2nd", "3rd", "4th", "5th"];

    const planColors = {
        'free': { light: 'bg-purple-100 text-purple-800 border-purple-300', dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700' },
        'premium': { light: 'bg-yellow-100 text-yellow-800 border-yellow-300', dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700' },
        'pro': { light: 'bg-green-100 text-green-800 border-green-300', dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700' },
        'iconic': { light: 'bg-red-100 text-red-800 border-red-300', dark: 'dark:bg-red-900/30 dark:text-red-200 dark:border-red-700' },
        'default': { light: 'bg-gray-100 text-gray-800 border-gray-300', dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600' }
    };

    const { data: profileData, isLoading: profileLoading, isError: profileFetchError, error: profileFetchErrorMessage } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase.from('profiles').select('id, full_name, username, email, avatar_url, plan, plan_expiry_date, role, year').eq('id', user.id).maybeSingle();
            if (error && error.code !== 'PGRST116') throw new Error(error.message);
            return data;
        },
        enabled: !!user?.id && !authLoading,
        staleTime: 1000 * 60,
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
        if (profileData) {
            setEditableProfile({
                full_name: profileData.full_name ?? user?.user_metadata?.full_name ?? '',
                username: profileData.username ?? user?.user_metadata?.username ?? '',
                year: profileData.year ?? ''
            });
        }
    }, [profileData]);

    const displayName = editableProfile.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const userEmail = profileData?.email || user?.email || 'N/A';
    const rawUserPlan = profileData?.plan?.toLowerCase() || 'free';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];
    const planExpiryDate = profileData?.plan_expiry_date;
    const style = planStyles[rawUserPlan] || planStyles.free;
    const PlanIcon = style.icon;

    const updateProfile = async (e) => {
        e.preventDefault();
        if (!editableProfile.full_name.trim() || !editableProfile.username.trim() || !editableProfile.year.trim()) {
            toast.error("Please fill in all required fields.");
            return;
        }
        setLoadingUpdateProfile(true);
        try {
            const { data: existingProfile, error: checkError } = await supabase.from('profiles').select('id').eq('username', editableProfile.username).neq('id', user?.id).maybeSingle();
            if (checkError && checkError.code !== 'PGRST116') throw checkError;
            if (existingProfile) { toast.error("Username already in use."); setLoadingUpdateProfile(false); return; }
            const { error } = await supabase.from('profiles').upsert({
                id: user?.id, full_name: editableProfile.full_name.trim(),
                username: editableProfile.username.trim(), year: editableProfile.year.trim(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
            toast.success("Profile updated successfully.");
        } catch (error) {
            toast.error(error.message || "Failed to update profile.");
        } finally { setLoadingUpdateProfile(false); }
    };

    if (authLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950">
                <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
            </div>
        );
    }

    if (profileFetchError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950 text-destructive">
                <XCircle className="h-8 w-8 mr-2" />
                <p>{profileFetchErrorMessage?.message || 'Error loading profile.'}</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950 text-muted-foreground">
                <User className="h-8 w-8 mr-2" />
                <p>Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
            <Seo title="User Profile" description="Manage your Medmacs App profile" canonical="https://medmacs.app/profile" />

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
                        <span className="text-lg font-black">My Profile</span>
                    </div>
                    <ProfileAvatar user={user} profileData={profileData} displayName={displayName} rawUserPlan={rawUserPlan} userPlanDisplayName={userPlanDisplayName} planColors={planColors} isHeader={true} />
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 max-w-xl mt-[calc(env(safe-area-inset-top))]">
                {/* Profile hero card - pricing style */}
                <div className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${style.gradient} text-white shadow-2xl p-6 mb-6`}>
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                    }} />
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden shrink-0">
                            {profileData?.avatar_url ? (
                                <img src={profileData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-white font-black text-xl">{displayName.substring(0, 2).toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-black italic uppercase tracking-tight">{displayName}</h2>
                            <p className="text-white/60 text-xs">{userEmail}</p>
                            <Badge className="mt-1.5 bg-white/20 text-white border-white/20 text-[10px] font-bold uppercase tracking-widest">
                                {userPlanDisplayName}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Edit form - glass card */}
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-2xl p-1 mb-6">
                    <div className="absolute inset-0 opacity-10" style={{
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                        maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                    }} />
                    <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            <User className="w-5 h-5" /> Personal Information
                        </h3>
                        <form onSubmit={updateProfile} className="space-y-4">
                            <div>
                                <Label htmlFor="email" className="text-white/80 text-xs font-bold uppercase tracking-wider">Email</Label>
                                <Input id="email" type="email" value={userEmail} disabled
                                    className="bg-white/5 border-white/10 text-white/60 rounded-xl h-11 mt-1 cursor-not-allowed" />
                            </div>
                            <div>
                                <Label htmlFor="full_name" className="text-white/80 text-xs font-bold uppercase tracking-wider">Full Name *</Label>
                                <Input id="full_name" value={editableProfile.full_name}
                                    onChange={(e) => setEditableProfile({ ...editableProfile, full_name: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11 mt-1" required />
                            </div>
                            <div>
                                <Label htmlFor="username" className="text-white/80 text-xs font-bold uppercase tracking-wider">Username *</Label>
                                <Input id="username" value={editableProfile.username}
                                    onChange={(e) => setEditableProfile({ ...editableProfile, username: e.target.value })}
                                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-11 mt-1" required />
                                <p className="text-[10px] text-white/40 mt-1">Displayed on leaderboards</p>
                            </div>
                            <div>
                                <Label htmlFor="year" className="text-white/80 text-xs font-bold uppercase tracking-wider">Year of Study *</Label>
                                <Select value={editableProfile.year} onValueChange={(value) => setEditableProfile({ ...editableProfile, year: value })}>
                                    <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl h-11 mt-1">
                                        <SelectValue placeholder="Select your year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {validYears.map((year) => (
                                            <SelectItem key={year} value={year}>{year} Year MBBS</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" disabled={loadingUpdateProfile}
                                className="w-full bg-white text-slate-900 hover:scale-105 transition-all rounded-xl h-12 uppercase font-black text-xs tracking-widest shadow-2xl">
                                {loadingUpdateProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Profile'}
                            </Button>
                        </form>
                    </div>
                </div>

                {/* Quick links */}
                <div className="space-y-3">
                    <Link to="/profile/password">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <span className="font-bold text-sm">Change Password</span>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                        </div>
                    </Link>
                    <Link to="/pricing">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border/40 hover:shadow-md transition-all mt-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <span className="font-bold text-sm block">Subscription</span>
                                    <span className="text-xs text-muted-foreground">{userPlanDisplayName}{planExpiryDate ? ` · Expires ${new Date(planExpiryDate).toLocaleDateString()}` : ''}</span>
                                </div>
                            </div>
                            <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                        </div>
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default Profile;
