// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronLeft, User, Loader2, XCircle, Shield, Star, Crown, Lock, CreditCard, Users, Gift, Copy,
  GraduationCap, Building2, Mail, Settings, ExternalLink, CheckCircle2, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Seo from '@/components/Seo';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchInstitutes, getInstituteByCode, getInstituteDisplayName, isSpecializedTestInstitute, type Institute } from '@/utils/institutes';
import PageSkeleton from '@/components/skeletons/PageSkeleton';
import { AchievementBadges, useAchievementData } from '@/components/profile/AchievementBadges';
import { motion } from 'framer-motion';

const planStyles = {
    free: { gradient: 'from-slate-500 via-slate-600 to-slate-700', icon: Shield, accent: 'bg-slate-300' },
    premium: { gradient: 'from-blue-600 via-indigo-600 to-violet-700', icon: Star, accent: 'bg-yellow-400' },
    iconic: { gradient: 'from-rose-600 via-red-600 to-orange-700', icon: Crown, accent: 'bg-amber-400' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

const Profile = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();

    const [editableProfile, setEditableProfile] = useState({ full_name: '', username: '', year: '' });
    const [loadingUpdateProfile, setLoadingUpdateProfile] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showStudyPathModal, setShowStudyPathModal] = useState(false);
    const [studyPathPassword, setStudyPathPassword] = useState('');
    const [verifyingStudyPathPassword, setVerifyingStudyPathPassword] = useState(false);
    const [institutes, setInstitutes] = useState<Institute[]>([]);
    const [copiedReferral, setCopiedReferral] = useState(false);
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
            const { data, error } = await supabase.from('profiles').select('id, full_name, username, email, avatar_url, plan, plan_expiry_date, role, year, institute, badges, referral_code').eq('id', user.id).maybeSingle();
            if (error && error.code !== 'PGRST116') throw new Error(error.message);
            return data;
        },
        enabled: !!user?.id && !authLoading,
        staleTime: 1000 * 60,
    });

    useEffect(() => {
        fetchInstitutes().then(setInstitutes);
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
    const planExpiryDate = profileData?.plan_expiry_date;
    const style = planStyles[rawUserPlan] || planStyles.free;
    const PlanIcon = style.icon;

    const userInstituteCode = (profileData as any)?.institute || '';
    const userInstituteName = getInstituteDisplayName(userInstituteCode, institutes);
    const selectedInstitute = getInstituteByCode(userInstituteCode, institutes);
    const selectedSpecializedTest = isSpecializedTestInstitute(selectedInstitute);
    const { data: achievementData } = useAchievementData(user?.id);
    const achievementStats = achievementData?.stats || {
        lifetimeMcqs: 0, flpCompletions: 0, aiChatSessions: 0, points: 0, accuracy: 0,
    };

    const updateProfile = async (e) => {
        e.preventDefault();
        if (!editableProfile.full_name.trim() || !editableProfile.username.trim() || (!selectedSpecializedTest && !editableProfile.year.trim())) {
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
                username: editableProfile.username.trim(),
                year: selectedSpecializedTest ? null : editableProfile.year.trim(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
            if (error) throw error;
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
            toast.success("Profile updated successfully.");
        } catch (error) {
            toast.error(error.message || "Failed to update profile.");
        } finally { setLoadingUpdateProfile(false); }
    };

    const copyReferralCode = () => {
        if (!profileData?.referral_code) return;
        navigator.clipboard.writeText(profileData.referral_code);
        setCopiedReferral(true);
        toast.success('Referral code copied!');
        setTimeout(() => setCopiedReferral(false), 2500);
    };

    const verifyStudyPathChange = async (event) => {
        event.preventDefault();
        if (!user?.email || !studyPathPassword) {
            toast.error('Please enter your password.');
            return;
        }

        setVerifyingStudyPathPassword(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: studyPathPassword,
            });
            if (error) {
                toast.error('Password verification failed.');
                return;
            }

            sessionStorage.setItem('medmacs_setup_change_verified', JSON.stringify({
                userId: user.id,
                verifiedAt: Date.now(),
            }));
            setShowStudyPathModal(false);
            setStudyPathPassword('');
            navigate('/setup');
        } finally {
            setVerifyingStudyPathPassword(false);
        }
    };

    if (authLoading || profileLoading) {
        return <PageSkeleton />;
    }

    if (profileFetchError) {
        return (
            <div className="dashboard-modern-font flex min-h-screen items-center justify-center bg-background p-6">
                <div className="text-center">
                    <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
                    <p className="font-bold text-destructive">{profileFetchErrorMessage?.message || 'Error loading profile.'}</p>
                    <Button variant="outline" className="mt-4 rounded-xl" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="dashboard-modern-font flex min-h-screen items-center justify-center bg-background p-6">
                <div className="text-center">
                    <User className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                    <p className="font-bold text-muted-foreground">Please log in to view your profile.</p>
                    <Button asChild className="mt-4 rounded-xl">
                        <Link to="/login">Go to Login</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-modern-font min-h-screen w-full bg-background">
            <Seo title="User Profile" description="Manage your Medmacs App profile" canonical="https://medmacs.app/profile" />

            {/* Ambient orbs */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -left-32 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute -right-32 top-1/3 h-64 w-64 rounded-full bg-primary/5 blur-[100px]" />
                <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-sky-500/10 blur-[100px]" />
            </div>

            {/* Fixed glass header */}
            <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/30 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-2xl">
                <div className="flex h-14 items-center justify-between px-5">
                    <Link to="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted">
                        <ChevronLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex items-center gap-2.5">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs" className="h-6 w-6" />
                        <span className="text-sm font-extrabold text-foreground tracking-tight">My Profile</span>
                    </div>
                    <ProfileAvatar user={user} profileData={profileData} displayName={displayName} rawUserPlan={rawUserPlan} userPlanDisplayName={userPlanDisplayName} planColors={planColors} isHeader={true} />
                </div>
            </header>

            {/* Scrollable content */}
            <div className="px-5 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[env(safe-area-inset-bottom)]">
                <div className="mx-auto max-w-2xl py-6">
                    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">

                        {/* Profile hero card */}
                        <motion.div variants={itemVariants}>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setShowStatsModal(true)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') setShowStatsModal(true);
                                }}
                                className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${style.gradient} text-white shadow-2xl active:scale-[0.99] transition-transform cursor-pointer`}
                            >
                                <div className="absolute -bottom-4 -right-4 opacity-[0.1]">
                                    <PlanIcon className="h-28 w-28" />
                                </div>
                                <div className="absolute inset-0 opacity-10" style={{
                                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                }} />
                                <div className="relative z-10 flex items-center gap-4 p-6">
                                    <div className="shrink-0" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                                        <ProfileAvatar user={user} profileData={profileData} displayName={displayName} rawUserPlan={rawUserPlan} userPlanDisplayName={userPlanDisplayName} planColors={planColors} isHeader={false} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2 className="truncate text-xl font-black italic uppercase tracking-tight">{displayName}</h2>
                                        <p className="truncate text-xs text-white/60">{userEmail}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <Badge className="border-white/20 bg-white/20 text-[10px] font-extrabold uppercase tracking-widest text-white">
                                                <PlanIcon className="mr-1 h-3 w-3" />
                                                {userPlanDisplayName}
                                            </Badge>
                                            {planExpiryDate && (
                                                <span className="text-[9px] font-bold uppercase tracking-widest text-white/45">
                                                    Expires {new Date(planExpiryDate).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/45">
                                            Tap to view stats
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <AchievementBadges userId={user?.id} />
                        </motion.div>

                        {/* Referral code card */}
                        {profileData?.referral_code && (
                            <motion.div variants={itemVariants}>
                                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-2xl shadow-emerald-500/20">
                                    <div className="absolute -bottom-5 -right-5 opacity-[0.12]">
                                        <Gift className="h-24 w-24" />
                                    </div>
                                    <div className="relative z-10 p-5">
                                        <div className="mb-1 flex items-center gap-2">
                                            <Gift className="h-4 w-4 text-emerald-200" />
                                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-200">
                                                Your Referral Code
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={copyReferralCode}
                                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 transition-colors hover:bg-white/20 active:scale-95"
                                            >
                                                {copiedReferral ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                                                ) : (
                                                    <Copy className="h-5 w-5 text-white" />
                                                )}
                                            </button>
                                            <div className="flex-1 rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-3 border border-white/15">
                                                <span className="text-xl font-black tracking-[0.3em] select-all sm:text-2xl">
                                                    {profileData.referral_code}
                                                </span>
                                            </div>
                                            <Link
                                                to="/referrals"
                                                className="flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-white/10 backdrop-blur-sm border-2 border-white/20 px-3.5 text-xs font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-white/20"
                                            >
                                                Details
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Personal Information card */}
                        <motion.div variants={itemVariants}>
                            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-2xl p-0.5">
                                <div className="absolute inset-0 opacity-10" style={{
                                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                                }} />
                                <div className="relative z-10 rounded-[1.9rem] bg-background/95 backdrop-blur-xl p-5">
                                    <div className="mb-5 flex items-center gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                            <Settings className="h-4 w-4 text-primary" />
                                        </div>
                                        <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                                            Personal Information
                                        </h3>
                                    </div>
                                    <form onSubmit={updateProfile} className="space-y-4">
                                        <div>
                                            <Label htmlFor="email" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                                                <Mail className="mr-1 inline h-3 w-3" /> Email
                                            </Label>
                                            <Input id="email" type="email" value={userEmail} disabled
                                                className="mt-1.5 h-11 rounded-xl border-border/40 bg-muted/30 text-muted-foreground cursor-not-allowed" />
                                        </div>
                                        <div>
                                            <Label htmlFor="institute" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                                                <Building2 className="mr-1 inline h-3 w-3" /> {selectedSpecializedTest ? 'Specialized Test' : 'Institute'}
                                            </Label>
                                            <div className="mt-1.5 flex gap-2">
                                                <Input id="institute" value={userInstituteName} disabled
                                                    className="h-11 rounded-xl border-border/40 bg-muted/30 text-muted-foreground cursor-not-allowed" />
                                                <Button type="button" variant="outline" className="h-11 rounded-xl font-bold" onClick={() => setShowStudyPathModal(true)}>
                                                    Change
                                                </Button>
                                            </div>
                                            <p className="mt-1 text-[10px] text-muted-foreground/60">Password verification is required before changing this.</p>
                                        </div>
                                        <div>
                                            <Label htmlFor="full_name" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                                                <User className="mr-1 inline h-3 w-3" /> Full Name *
                                            </Label>
                                            <Input id="full_name" value={editableProfile.full_name}
                                                onChange={(e) => setEditableProfile({ ...editableProfile, full_name: e.target.value })}
                                                className="mt-1.5 h-11 rounded-xl border-border/40 bg-muted/20 text-foreground placeholder:text-muted-foreground/50" required />
                                        </div>
                                        <div>
                                            <Label htmlFor="username" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                                                <User className="mr-1 inline h-3 w-3" /> Username *
                                            </Label>
                                            <Input id="username" value={editableProfile.username}
                                                onChange={(e) => setEditableProfile({ ...editableProfile, username: e.target.value })}
                                                className="mt-1.5 h-11 rounded-xl border-border/40 bg-muted/20 text-foreground placeholder:text-muted-foreground/50" required />
                                            <p className="mt-1 text-[10px] text-muted-foreground/60">Displayed on leaderboards</p>
                                        </div>
                                        {!selectedSpecializedTest && (
                                            <div>
                                                <Label htmlFor="year" className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                                                    <GraduationCap className="mr-1 inline h-3 w-3" /> Year of Study *
                                                </Label>
                                                <Select value={editableProfile.year} onValueChange={(value) => setEditableProfile({ ...editableProfile, year: value })}>
                                                    <SelectTrigger className="mt-1.5 h-11 rounded-xl border-border/40 bg-muted/20 text-foreground">
                                                        <SelectValue placeholder="Select your year" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {validYears.map((year) => (
                                                            <SelectItem key={year} value={year}>{year} Year MBBS</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        <Button type="submit" disabled={loadingUpdateProfile}
                                            className="h-12 w-full rounded-xl bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] font-extrabold text-white shadow-lg shadow-[#0ea5e9]/20 transition-all hover:scale-[1.02] active:scale-95">
                                            {loadingUpdateProfile ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="mr-2 h-4 w-4" />
                                            )}
                                            Update Profile
                                        </Button>
                                    </form>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick links */}
                        <motion.div variants={itemVariants}>
                            <div className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden divide-y divide-border/40">
                                <Link to="/referrals" className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50 active:bg-muted/80">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                            <Gift className="h-5 w-5 text-primary" />
                                        </div>
                                        <span className="text-sm font-bold text-foreground">Referrals</span>
                                    </div>
                                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                                </Link>
                                <Link to="/profile/password" className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50 active:bg-muted/80">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                            <Lock className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <span className="text-sm font-bold text-foreground">Change Password</span>
                                    </div>
                                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                                </Link>
                                <Link to="/pricing" className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50 active:bg-muted/80">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-foreground">Subscription</span>
                                            <p className="text-xs text-muted-foreground">{userPlanDisplayName}{planExpiryDate ? ` · Expires ${new Date(planExpiryDate).toLocaleDateString()}` : ''}</p>
                                        </div>
                                    </div>
                                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                                </Link>
                                <Link to="/teams" className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50 active:bg-muted/80">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                                            <Users className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <span className="text-sm font-bold text-foreground">About Us</span>
                                    </div>
                                    <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                                </Link>
                            </div>
                        </motion.div>

                    </motion.div>
                </div>
            </div>

            {/* Stats Modal */}
            <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
                <DialogContent className="sm:max-w-[430px] rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Your Stats</DialogTitle>
                        <DialogDescription>Lifetime learning progress on Medmacs.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Lifetime MCQs', value: achievementStats.lifetimeMcqs },
                            { label: 'FLPs Completed', value: achievementStats.flpCompletions },
                            { label: 'AI Chats', value: achievementStats.aiChatSessions },
                            { label: 'Points', value: achievementStats.points },
                            { label: 'Accuracy', value: `${achievementStats.accuracy}%` },
                        ].map((stat) => (
                            <div key={stat.label} className="rounded-2xl border border-border/40 bg-muted/30 p-4">
                                <p className="text-2xl font-black text-primary">{stat.value}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                    <AchievementBadges userId={user?.id} compact />
                </DialogContent>
            </Dialog>
            <Dialog open={showStudyPathModal} onOpenChange={setShowStudyPathModal}>
                <DialogContent className="sm:max-w-[430px] rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black">Verify Password</DialogTitle>
                        <DialogDescription>Confirm your password to change your institute or specialized test.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={verifyStudyPathChange} className="space-y-4">
                        <div>
                            <Label htmlFor="study-path-password">Password</Label>
                            <Input
                                id="study-path-password"
                                type="password"
                                value={studyPathPassword}
                                onChange={(event) => setStudyPathPassword(event.target.value)}
                                placeholder="Enter your password"
                                className="mt-1.5 h-11 rounded-xl"
                            />
                        </div>
                        <Button type="submit" disabled={verifyingStudyPathPassword} className="w-full rounded-xl font-bold">
                            {verifyingStudyPathPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Shield className="mr-2 h-4 w-4" />}
                            Continue to Setup
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Profile;
