import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Medal, Award, Crown, Star, Target, Zap, Users, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { ElasticWrapper } from '@/components/ElasticWrapper'
import React, { useState, useEffect } from 'react'; // Import React and useEffect
import Seo from '@/components/Seo'; // Import the Seo component
import PlanBadge from '@/components/PlanBadge';


const Leaderboard = () => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const [userPlan, setUserPlan] = useState<string | null>(null); // State to store user's plan
    const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null); // State for current user's avatar URL


    // Fetch user's plan and avatar on component mount or when user changes
    useEffect(() => {
        const fetchUserPlanAndAvatar = async () => {
            if (user?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('plan, avatar_url') // Select avatar_url as well
                    .eq('id', user.id)
                    .single();

                if (error) {
                    console.error('Error fetching user plan and avatar:', error);
                } else if (data) {
                    setUserPlan(data.plan);
                    setCurrentUserAvatar(data.avatar_url); // Set the avatar URL
                }
            } else {
                setUserPlan(null); // Clear plan if user logs out
                setCurrentUserAvatar(null); // Clear avatar if user logs out
            }
        };

        fetchUserPlanAndAvatar();
    }, [user]); // Dependency array: re-run when `user` object changes

    // Fetch leaderboard data with profiles
    const { data: leaderboardData = [], isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: async () => {
            try {
                // Get all user answers to calculate scores
                const { data: userAnswers, error: answersError } = await supabase
                    .from('user_answers')
                    .select(`
            user_id,
            is_correct,
            time_taken,
            created_at
          `);

                if (answersError) {
                    console.error('Error fetching user answers:', answersError);
                    return [];
                }

                // Get all profiles
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url'); // Also fetch avatar_url for all profiles

                if (profilesError) {
                    console.error('Error fetching profiles:', profilesError);
                    return [];
                }

                // Calculate user statistics
                const userStats: Record<string, any> = {};

                userAnswers?.forEach(answer => {
                    if (!userStats[answer.user_id]) {
                        userStats[answer.user_id] = {
                            user_id: answer.user_id,
                            totalQuestions: 0,
                            correctAnswers: 0,
                            totalTime: 0,
                            answers: []
                        };
                    }

                    userStats[answer.user_id].totalQuestions++;
                    if (answer.is_correct) {
                        userStats[answer.user_id].correctAnswers++;
                    }
                    userStats[answer.user_id].totalTime += answer.time_taken || 0;
                    userStats[answer.user_id].answers.push(answer);
                });

                // Create leaderboard entries for users with activity
                const leaderboardEntries = profiles
                    ?.filter(profile => userStats[profile.id]?.totalQuestions > 0)
                    .map(profile => {
                        const stats = userStats[profile.id];

                        // Calculate streak
                        let currentStreak = 0;
                        let bestStreak = 0;
                        stats.answers
                            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                            .forEach((answer: any) => {
                                if (answer.is_correct) {
                                    currentStreak++;
                                    bestStreak = Math.max(bestStreak, currentStreak);
                                } else {
                                    currentStreak = 0;
                                }
                            });

                        const accuracy = stats.totalQuestions > 0 ?
                            Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;

                        const averageTime = stats.totalQuestions > 0 ?
                            Math.round(stats.totalTime / stats.totalQuestions) : 0;

                        // Calculate total score (improved formula)
                        const basePoints = stats.correctAnswers * 10; // 10 points per correct answer
                        const streakBonus = bestStreak * 5; // 5 points per best streak
                        const accuracyBonus = accuracy; // 1 point per 1% accuracy
                        const speedBonus = Math.max(0, 60 - averageTime); // Bonus for faster answers (assuming 60s max)

                        const totalScore = basePoints + streakBonus + accuracyBonus + speedBonus;

                        return {
                            id: profile.id,
                            user_id: profile.id,
                            username: profile.username || profile.full_name || 'Anonymous',
                            avatar_url: profile.avatar_url, // Include avatar_url here
                            total_score: totalScore,
                            accuracy,
                            best_streak: bestStreak,
                            total_questions: stats.totalQuestions,
                            correct_answers: stats.correctAnswers
                        };
                    }) || [];

                // Sort by total score and return top 50
                return leaderboardEntries
                    .sort((a, b) => b.total_score - a.total_score)
                    .slice(0, 50);
            } catch (error) {
                console.error('Error in leaderboard query:', error);
                return [];
            }
        }
    });

    // Find user's rank
    const userRank = leaderboardData.findIndex(entry => entry.user_id === user?.id) + 1;
    const currentUserData = leaderboardData.find(entry => entry.user_id === user?.id);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />;
            case 2:
                return <Medal className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />;
            case 3:
                return <Award className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />;
            default:
                return <Trophy className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />;
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank <= 3) {
            return rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                    'bg-gradient-to-r from-amber-400 to-amber-600';
        }
        return 'bg-gradient-to-r from-purple-500 to-pink-500';
    };

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
            <Seo
                title="Leaderboard"
                description="See how you rank against other students on Medmacs App's leaderboard. Compete and achieve top scores."
                canonical="https://medmacs.app/leaderboard"
                />
            {/* Header */}
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">                  <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
                    <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center space-x-3">
                        <img
                            src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
                            alt="Medmacs Logo"
                            className="w-6 h-6 md:w-8 md:h-8 object-contain"
                        />
                        <span className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Leaderboard</span>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
                        >
                            {theme === "dark" ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </Button>
                        <PlanBadge plan={userPlan || undefined} />
                        <ProfileDropdown /> {/* ProfileDropdown remains only in the header */}
                    </div>
                </div>
            </header>

                  <ElasticWrapper>

            <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-8">
                {/* Hero Section */}
                <div className="text-center mb-6 lg:mb-8 animate-fade-in">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4 pt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
                        🏆 Leaderboard
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        See how you rank against the best medical students in Pakistan.
                        Climb the ladder and prove your expertise!
                    </p>
                </div>

                {/* User's Current Rank */}
                {currentUserData && (
                    <Card className="mb-6 lg:mb-8 bg-purple-100/70 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 animate-scale-in backdrop-blur-sm">
                        <CardHeader className="p-4 lg:p-6">
                            <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white text-lg md:text-xl">
                                <Target className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
                                <span>Your Current Rank</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 lg:p-6 pt-0">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center space-x-3 md:space-x-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center overflow-hidden">
                                        {currentUserAvatar ? (
                                            <img
                                                src={currentUserAvatar}
                                                alt={`${currentUserData.username}'s avatar`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-white font-bold text-lg md:text-xl">
                                                {currentUserData.username?.substring(0, 2).toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">{currentUserData.username}</p>
                                        <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Score: {currentUserData.total_score}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl md:text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        #{userRank || 'N/A'}
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Current Rank</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Top 3 Podium */}
                {leaderboardData.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
                        {leaderboardData.slice(0, 3).map((entry, index) => (
                            <Card
                                key={entry.id}
                                className={`relative overflow-hidden hover:scale-105 transition-all duration-300 animate-fade-in bg-purple-100/70 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 backdrop-blur-sm ${
                                    index === 0 ? 'md:order-2' : index === 1 ? 'md:order-1' : 'md:order-3'
                                    }`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className={`absolute top-0 left-0 right-0 h-2 ${getRankBadge(index + 1)}`}></div>
                                <CardHeader className="text-center pb-2 p-4 lg:p-6">
                                    <div className="flex justify-center mb-2">
                                        {getRankIcon(index + 1)}
                                    </div>
                                    <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white">
                                        #{index + 1}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="text-center p-4 lg:p-6 pt-0">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-2 overflow-hidden">
                                        {entry.avatar_url ? (
                                            <img
                                                src={entry.avatar_url}
                                                alt={`${entry.username}'s avatar`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-white font-bold text-lg md:text-xl">
                                                {entry.username?.substring(0, 2).toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm md:text-base truncate">
                                        {entry.username || 'Anonymous'}
                                    </h3>
                                    <div className="space-y-1">
                                        <p className="text-lg md:text-2xl font-bold text-purple-600 dark:text-purple-400">
                                            {entry.total_score}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Score</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {entry.accuracy}% accuracy • {entry.total_questions} questions
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Rest of the Leaderboard */}
                <Card className="bg-purple-100/70 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 animate-slide-up backdrop-blur-sm">
                    <CardHeader className="p-4 lg:p-6">
                        <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white text-lg md:text-xl">
                            <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
                            <span>Top Students</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6 pt-0">
                        {isLoading ? (
                            <div className="space-y-4">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="flex items-center space-x-4 p-3 animate-pulse">
                                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 md:h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                                            <div className="h-2 md:h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/6"></div>
                                        </div>
                                        <div className="h-3 md:h-4 bg-gray-300 dark:bg-gray-700 rounded w-16"></div>
                                    </div>
                                ))}
                            </div>
                        ) : leaderboardData.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">No data available yet. Start practicing to see the leaderboard!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {leaderboardData.slice(3).map((entry, index) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center space-x-3 md:space-x-4 p-3 rounded-lg bg-white/60 dark:bg-gray-800/50 hover:bg-purple-200/50 dark:hover:bg-purple-900/40 transition-all duration-300 border border-purple-100 dark:border-purple-800 backdrop-blur-sm"
                                    >
                                        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                                            <span className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 w-6 md:w-8 flex-shrink-0">
                                                #{index + 4}
                                            </span>
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {entry.avatar_url ? (
                                                    <img
                                                        src={entry.avatar_url}
                                                        alt={`${entry.username}'s avatar`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="text-white font-bold text-xs md:text-sm">
                                                        {entry.username?.substring(0, 2).toUpperCase() || 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900 dark:text-white text-sm md:text-base truncate">
                                                    {entry.username || 'Anonymous'}
                                                </p>
                                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                                    {entry.accuracy}% accuracy • {entry.total_questions} questions
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="font-bold text-purple-600 dark:text-purple-400 text-sm md:text-base">
                                                    {entry.total_score}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Score</p>
                                            </div>
                                            <Star className="w-3 h-3 md:w-4 md:h-4 text-yellow-500 flex-shrink-0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
            </ElasticWrapper>
        </div>
    );
};

export default Leaderboard;