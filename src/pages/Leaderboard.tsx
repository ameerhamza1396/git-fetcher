import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Medal, Award, Crown, Star, Target, Zap, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/components/Seo';
import PlanBadge from '@/components/PlanBadge';
import PageSkeleton from '@/components/skeletons/PageSkeleton';


const Leaderboard = () => {
    const { user } = useAuth();
    const [userPlan, setUserPlan] = useState<string | null>(null);
    const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(null);
    const headerRef = useRef<HTMLElement>(null);
    const lastScrollY = useRef(0);
    const [headerVisible, setHeaderVisible] = useState(true);

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
        const fetchUserPlanAndAvatar = async () => {
            if (user?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('plan, avatar_url')
                    .eq('id', user.id)
                    .single();
                if (!error && data) {
                    setUserPlan(data.plan);
                    setCurrentUserAvatar(data.avatar_url);
                }
            } else {
                setUserPlan(null);
                setCurrentUserAvatar(null);
            }
        };
        fetchUserPlanAndAvatar();
    }, [user]);

    const { data: leaderboardData = [], isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: async () => {
            try {
                const { data: userAnswers, error: answersError } = await supabase
                    .from('user_answers')
                    .select('user_id, is_correct, time_taken, created_at');
                if (answersError) return [];

                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, username, full_name, avatar_url');
                if (profilesError) return [];

                const userStats: Record<string, any> = {};
                userAnswers?.forEach(answer => {
                    if (!userStats[answer.user_id]) {
                        userStats[answer.user_id] = { user_id: answer.user_id, totalQuestions: 0, correctAnswers: 0, totalTime: 0, answers: [] };
                    }
                    userStats[answer.user_id].totalQuestions++;
                    if (answer.is_correct) userStats[answer.user_id].correctAnswers++;
                    userStats[answer.user_id].totalTime += answer.time_taken || 0;
                    userStats[answer.user_id].answers.push(answer);
                });

                const leaderboardEntries = profiles
                    ?.filter(profile => userStats[profile.id]?.totalQuestions > 0)
                    .map(profile => {
                        const stats = userStats[profile.id];
                        let currentStreak = 0, bestStreak = 0;
                        stats.answers
                            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                            .forEach((answer: any) => {
                                if (answer.is_correct) { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
                                else { currentStreak = 0; }
                            });
                        const accuracy = stats.totalQuestions > 0 ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100) : 0;
                        const averageTime = stats.totalQuestions > 0 ? Math.round(stats.totalTime / stats.totalQuestions) : 0;
                        const totalScore = stats.correctAnswers * 10 + bestStreak * 5 + accuracy + Math.max(0, 60 - averageTime);
                        return {
                            id: profile.id, user_id: profile.id,
                            username: profile.username || profile.full_name || 'Anonymous',
                            avatar_url: profile.avatar_url,
                            total_score: totalScore, accuracy, best_streak: bestStreak,
                            total_questions: stats.totalQuestions, correct_answers: stats.correctAnswers
                        };
                    }) || [];

                return leaderboardEntries.sort((a, b) => b.total_score - a.total_score).slice(0, 50);
            } catch (error) { return []; }
        }
    });

    const userRank = leaderboardData.findIndex(entry => entry.user_id === user?.id) + 1;
    const currentUserData = leaderboardData.find(entry => entry.user_id === user?.id);

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1: return <Crown className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />;
            case 2: return <Medal className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />;
            case 3: return <Award className="w-5 h-5 md:w-6 md:h-6 text-amber-600" />;
            default: return <Trophy className="w-5 h-5 md:w-6 md:h-6 text-primary" />;
        }
    };

    const getRankBadge = (rank: number) => {
        if (rank <= 3) {
            return rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                    'bg-gradient-to-r from-amber-400 to-amber-600';
        }
        return 'bg-gradient-to-r from-primary to-accent-foreground';
    };

    return (
        <div className="min-h-screen w-full bg-background">
            <Seo title="Leaderboard" description="See how you rank against other students on Medmacs App's leaderboard." canonical="https://medmacs.app/leaderboard" />

            <div
                ref={headerRef}
                className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
            >
                <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
                    <Link to="/dashboard" className="flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center space-x-3">
                        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-6 h-6 md:w-8 md:h-8 object-contain" />
                        <span className="text-lg md:text-xl font-bold text-foreground">Leaderboard</span>
                    </div>
                    <div className="flex items-center space-x-3">
                        <PlanBadge plan={userPlan || undefined} />
                        <ProfileDropdown />
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 lg:px-8 py-6 lg:py-8 mt-[var(--header-height)]">
                <div className="text-center mb-6 lg:mb-8 animate-fade-in">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-4">
                        🏆 Leaderboard
                    </h1>
                    <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                        See how you rank against the best medical students in Pakistan.
                    </p>
                </div>

                {currentUserData && (
                    <Card className="mb-6 lg:mb-8 bg-gradient-to-br from-primary/5 to-accent border-border hover:shadow-lg transition-all duration-300 animate-scale-in backdrop-blur-sm">
                        <CardHeader className="p-4 lg:p-6">
                            <CardTitle className="flex items-center space-x-2 text-foreground text-lg md:text-xl">
                                <Target className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                <span>Your Current Rank</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 lg:p-6 pt-0">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div className="flex items-center space-x-3 md:space-x-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-primary to-primary/70 rounded-full flex items-center justify-center overflow-hidden">
                                        {currentUserAvatar ? (
                                            <img src={currentUserAvatar} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-primary-foreground font-bold text-lg md:text-xl">
                                                {currentUserData.username?.substring(0, 2).toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm md:text-base">{currentUserData.username}</p>
                                        <p className="text-xs md:text-sm text-muted-foreground">Total Score: {currentUserData.total_score}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl md:text-2xl font-bold text-primary">#{userRank || 'N/A'}</div>
                                    <p className="text-xs md:text-sm text-muted-foreground">Current Rank</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {leaderboardData.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
                        {leaderboardData.slice(0, 3).map((entry, index) => (
                            <Card
                                key={entry.id}
                                className={`relative overflow-hidden hover:scale-105 transition-all duration-300 animate-fade-in bg-gradient-to-br from-primary/5 to-accent border-border backdrop-blur-sm ${index === 0 ? 'md:order-2' : index === 1 ? 'md:order-1' : 'md:order-3'
                                    }`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className={`absolute top-0 left-0 right-0 h-2 ${getRankBadge(index + 1)}`}></div>
                                <CardHeader className="text-center pb-2 p-4 lg:p-6">
                                    <div className="flex justify-center mb-2">{getRankIcon(index + 1)}</div>
                                    <CardTitle className="text-base md:text-lg text-foreground">#{index + 1}</CardTitle>
                                </CardHeader>
                                <CardContent className="text-center p-4 lg:p-6 pt-0">
                                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-primary to-primary/70 rounded-full flex items-center justify-center mx-auto mb-2 overflow-hidden">
                                        {entry.avatar_url ? (
                                            <img src={entry.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-primary-foreground font-bold text-lg md:text-xl">
                                                {entry.username?.substring(0, 2).toUpperCase() || 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-semibold text-foreground mb-1 text-sm md:text-base truncate">{entry.username || 'Anonymous'}</h3>
                                    <div className="space-y-1">
                                        <p className="text-lg md:text-2xl font-bold text-primary">{entry.total_score}</p>
                                        <p className="text-xs text-muted-foreground">Total Score</p>
                                        <p className="text-xs text-muted-foreground">{entry.accuracy}% accuracy • {entry.total_questions} questions</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                <Card className="bg-gradient-to-br from-primary/5 to-accent border-border hover:shadow-lg transition-all duration-300 animate-slide-up backdrop-blur-sm">
                    <CardHeader className="p-4 lg:p-6">
                        <CardTitle className="flex items-center space-x-2 text-foreground text-lg md:text-xl">
                            <Users className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                            <span>Top Students</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 lg:p-6 pt-0">
                        {isLoading ? (
                            <div className="space-y-4">
                                <PageSkeleton />
                            </div>
                        ) : leaderboardData.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground text-sm md:text-base">No data available yet. Start practicing!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {leaderboardData.slice(3).map((entry, index) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center space-x-3 md:space-x-4 p-3 rounded-lg bg-card/60 hover:bg-accent/50 transition-all duration-300 border border-border/40 backdrop-blur-sm"
                                    >
                                        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                                            <span className="text-xs md:text-sm font-medium text-muted-foreground w-6 md:w-8 flex-shrink-0">#{index + 4}</span>
                                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-primary to-primary/70 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {entry.avatar_url ? (
                                                    <img src={entry.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-primary-foreground font-bold text-xs md:text-sm">
                                                        {entry.username?.substring(0, 2).toUpperCase() || 'U'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-foreground text-sm md:text-base truncate">{entry.username || 'Anonymous'}</p>
                                                <p className="text-xs md:text-sm text-muted-foreground">{entry.accuracy}% accuracy • {entry.total_questions} questions</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
                                            <div className="text-right">
                                                <p className="font-bold text-primary text-sm md:text-base">{entry.total_score}</p>
                                                <p className="text-xs text-muted-foreground">Score</p>
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
        </div>
    );
};

export default Leaderboard;
