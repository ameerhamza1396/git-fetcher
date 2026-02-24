// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    ArrowLeft,
    User,
    Loader2,
    XCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import Seo from '@/components/Seo';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ElasticWrapper } from '@/components/ElasticWrapper'

const Profile = () => {
    const queryClient = useQueryClient();
    const { user, isLoading: authLoading } = useAuth();

    const [editableProfile, setEditableProfile] = useState({
        full_name: '',
        username: '',
        year: ''
    });
    const [loadingUpdateProfile, setLoadingUpdateProfile] = useState(false);

    const validYears = ["1st", "2nd", "3rd", "4th", "5th"];

    const planColors = {
        'free': {
            light: 'bg-purple-100 text-purple-800 border-purple-300',
            dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
        },
        'premium': {
            light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
        },
        'pro': {
            light: 'bg-green-100 text-green-800 border-green-300',
            dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
        },
        'iconic': {
            light: 'bg-red-100 text-red-800 border-red-300',
            dark: 'dark:bg-red-900/30 dark:text-red-200 dark:border-red-700'
        },
        'default': {
            light: 'bg-gray-100 text-gray-800 border-gray-300',
            dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
        }
    };

    const { data: profileData, isLoading: profileLoading, isError: profileFetchError, error: profileFetchErrorMessage } = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, email, avatar_url, plan, plan_expiry_date, role, year')
                .eq('id', user.id)
                .maybeSingle();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching profile:', error);
                throw new Error(error.message || 'Failed to fetch profile data.');
            }
            return data;
        },
        enabled: !!user?.id && !authLoading,
        staleTime: 1000 * 60,
    });

    // ✅ FIXED useEffect: only set state when profileData is available
    useEffect(() => {
        if (profileData) {
            setEditableProfile({
                full_name: profileData.full_name ?? user?.user_metadata?.full_name ?? '',
                username: profileData.username ?? user?.user_metadata?.username ?? '',
                year: profileData.year ?? ''
            });
        }
    }, [profileData]); // removed "user" from dependencies

    const displayName = editableProfile.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
    const userEmail = profileData?.email || user?.email || 'N/A';
    const rawUserPlan = profileData?.plan?.toLowerCase() || 'free';
    const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];
    const planExpiryDate = profileData?.plan_expiry_date;

    const updateProfile = async (e) => {
        e.preventDefault();

        if (!editableProfile.full_name.trim() || !editableProfile.username.trim() || !editableProfile.year.trim()) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setLoadingUpdateProfile(true);

        try {
            const { data: existingProfile, error: checkError } = await supabase
                .from('profiles')
                .select('id')
                .eq('username', editableProfile.username)
                .neq('id', user?.id)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError;
            }

            if (existingProfile) {
                toast.error("This username is already in use. Please choose another.");
                setLoadingUpdateProfile(false);
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    full_name: editableProfile.full_name.trim(),
                    username: editableProfile.username.trim(),
                    year: editableProfile.year.trim(),
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
            toast.success("Your profile has been updated successfully.");

        } catch (error) {
            console.error('Profile update error:', error);
            toast.error(error.message || "Failed to update profile. Please try again.");
        } finally {
            setLoadingUpdateProfile(false);
        }
    };

    const showOverallLoader = authLoading || profileLoading;

    if (showOverallLoader) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="ml-3 text-lg text-gray-700 dark:text-gray-300">
                    Loading profile...
                </p>
            </div>
        );
    }

    if (profileFetchError) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-red-600 dark:text-red-400">
                <XCircle className="h-8 w-8 mr-2" />
                <p>{profileFetchErrorMessage?.message || 'Error loading profile data.'}</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400">
                <User className="h-8 w-8 mr-2" />
                <p>Please log in to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-white dark:bg-gray-900">
            <Seo
                title="User Profile"
                description="Manage your Medmacs App profile, settings, and track your overall academic performance."
                canonical="https://medmacs.app/profile"
            />
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
                    <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
                    <Link to="/" className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">My Profile</span>
                    </div>

                    <ProfileAvatar
                        user={user}
                        profileData={profileData}
                        displayName={displayName}
                        rawUserPlan={rawUserPlan}
                        userPlanDisplayName={userPlanDisplayName}
                        planColors={planColors}
                        isHeader={true}
                    />
                </div>
            </header>

                  <ElasticWrapper>

            <div className="container mx-auto px-4 lg:px-8 py-8 max-w-3xl mt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                    User Profile
                </h1>

                <Card className="mb-8 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg">
                    <CardHeader className="text-center">
                        <ProfileAvatar
                            user={user}
                            profileData={profileData}
                            displayName={displayName}
                            rawUserPlan={rawUserPlan}
                            userPlanDisplayName={userPlanDisplayName}
                            planColors={planColors}
                            isHeader={false}
                        />
                        <CardTitle className="text-gray-900 dark:text-white text-2xl mb-1">{displayName}</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            {userEmail}
                        </CardDescription>
                        <Badge
                            variant="secondary"
                            className={`mt-2 text-xs px-2 py-1 w-fit mx-auto ${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
                        >
                            {userPlanDisplayName}
                        </Badge>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <form onSubmit={updateProfile} className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-2">
                                <User className="h-5 w-5 mr-2 text-blue-500" /> Personal Information
                            </h3>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={userEmail}
                                    disabled
                                    className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                                />
                                <p className="text-sm text-gray-500 mt-1">Email cannot be changed here</p>
                            </div>

                            <div>
                                <Label htmlFor="full_name">Full Name *</Label>
                                <Input
                                    id="full_name"
                                    value={editableProfile.full_name}
                                    onChange={(e) => setEditableProfile({ ...editableProfile, full_name: e.target.value })}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="username">Username *</Label>
                                <Input
                                    id="username"
                                    value={editableProfile.username}
                                    onChange={(e) => setEditableProfile({ ...editableProfile, username: e.target.value })}
                                    placeholder="Enter your username"
                                    required
                                />
                                <p className="text-sm text-gray-500 mt-1">This will be displayed on leaderboards</p>
                            </div>

                            <div>
                                <Label htmlFor="year">Year of Study *</Label>
                                <Select
                                    value={editableProfile.year}
                                    onValueChange={(value) => setEditableProfile({ ...editableProfile, year: value })}
                                >
                                    <SelectTrigger id="year">
                                        <SelectValue placeholder="Select your year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {validYears.map((year) => (
                                            <SelectItem key={year} value={year}>
                                                {year} Year MBBS
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button type="submit" disabled={loadingUpdateProfile} className="w-full">
                                {loadingUpdateProfile ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    'Update Profile'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="mt-6 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg">
                    <CardHeader>
                        <CardTitle>Account Security</CardTitle>
                        <CardDescription>Manage your password and security settings</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link to="/profile/password">
                            <Button variant="outline" className="w-full">
                                Change Password
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                <Card className="mt-6 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg">
                    <CardHeader>
                        <CardTitle>Subscription</CardTitle>
                        <CardDescription>Manage your plan and billing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Current Plan: {userPlanDisplayName}</p>
                                {planExpiryDate && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Plan expires on: {new Date(planExpiryDate).toLocaleDateString()}</p>
                                )}
                                {!planExpiryDate && rawUserPlan !== 'premium' && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">You are on free plan.</p>
                                )}
                                {!planExpiryDate && rawUserPlan === 'premium' && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">You are on premium plan.</p>
                                )}
                            </div>
                            <Link to="/pricing">
                                <Button disabled={rawUserPlan === 'premium'}>
                                    {rawUserPlan === 'premium' ? 'Current Plan' : 'Upgrade Plan'}
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
            </ElasticWrapper>
        </div>
    );
};

export default Profile;
