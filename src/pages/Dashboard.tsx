import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Zap,
  Trophy,
  Target,
  Users,
  Brain,
  Swords,
  Moon,
  Sun,
  Flame,
  Calendar,
  TrendingUp,
  Award,
  Briefcase,
  BellRing,
  Book,
  Construction,
  Bookmark,
  ScrollText,
  Home,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { LeaderboardPreview } from '@/components/dashboard/LeaderboardPreview';
import { StudyAnalytics } from '@/components/dashboard/StudyAnalytics';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
// Removed ElasticWrapper import
import AnnouncementToastManager from '@/components/ui/AnnouncementToastManager';
import AuthErrorDisplay from '@/components/AuthErrorDisplay';
import Seo from '@/components/Seo';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SignInPrompt from '@/components/SigninPrompt';
import AppExitConfirmation from '@/components/dashboard/AppExitConfirmation';
import VersionGuard from '@/components/VersionControl';

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('home');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isNavigating, setIsNavigating] = useState(true);

  type Profile = {
    avatar_url: string;
    created_at: string;
    full_name: string;
    id: string;
    medical_school: string;
    updated_at: string;
    username: string;
    year_of_study: number;
    plan?: string;
    year?: string;
  };

  const { data: profile, isLoading: profileLoading } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: answers, error: answersError } = await supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', user.id);

      if (answersError) {
        return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, currentStreak: 0, rankPoints: 0, battlesWon: 0, totalBattles: 0 };
      }

      const totalQuestions = answers?.length || 0;
      const correctAnswers = answers?.filter(a => a.is_correct)?.length || 0;
      const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const answerDates = answers?.map(a => new Date(a.created_at).toDateString()) || [];
      const uniqueDates = [...new Set(answerDates)].sort().reverse();

      let currentStreak = 0;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();

      if (uniqueDates.includes(today) || uniqueDates.includes(yesterday)) {
        for (let i = 0; i < uniqueDates.length; i++) {
          const date = new Date(uniqueDates[i]);
          const expectedDate = new Date();
          expectedDate.setDate(expectedDate.getDate() - i);
          if (date.toDateString() === expectedDate.toDateString()) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      const { data: battles } = await supabase.from('battle_results').select('*').eq('user_id', user.id);
      const battlesWon = battles?.filter(b => b.rank === 1)?.length || 0;
      const rankPoints = correctAnswers * 10 + currentStreak * 5 + accuracy;

      return { totalQuestions, correctAnswers, accuracy, currentStreak, rankPoints, battlesWon, totalBattles: battles?.length || 0 };
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (authLoading || profileLoading) {
      setIsNavigating(true);
      return;
    }
    if (!user || !profile) {
      setIsNavigating(false);
      return;
    }
    if (profile.username === null) {
      navigate('/welcome-new-user');
      return;
    }
    const validYears = ["1st", "2nd", "3rd", "4th", "5th"];
    if (profile.year && !validYears.includes(profile.year)) {
      navigate('/select-year');
      return;
    }
    setIsNavigating(false);
  }, [authLoading, profileLoading, user, profile, navigate]);

  const quickActions = [
    {
      title: 'Practice MCQs',
      description: 'Test your knowledge with curated questions',
      icon: BookOpen,
      link: '/mcqs',
      gradient: 'from-blue-600 to-indigo-700',
      iconColor: 'text-blue-200'
    },
    {
      title: 'Saved MCQs',
      description: 'Review your bookmarked questions',
      icon: Bookmark,
      link: '/saved-mcqs',
      gradient: 'from-emerald-500 to-teal-700',
      iconColor: 'text-emerald-200'
    },
    {
      title: 'Leaderboard',
      description: 'See your rank among peers',
      icon: Trophy,
      link: '/leaderboard',
      gradient: 'from-amber-400 to-orange-600',
      iconColor: 'text-amber-100'
    },
    {
      title: 'Become a collaborator',
      description: 'Apply for the Medmacs Program!',
      icon: Briefcase,
      link: '/summerinternship2025',
      gradient: 'from-rose-500 to-red-700',
      iconColor: 'text-rose-100',
      tag: 'Open now!',
      tagColor: 'bg-white text-red-600 animate-pulse'
    },
    {
      title: 'Battle Arena',
      description: 'Compete with friends in medical quizzes',
      icon: Swords,
      link: '/battle',
      gradient: 'from-orange-500 to-red-600',
      iconColor: 'text-orange-100'
    },
  ];

  const premiumPerks = [
    {
      title: 'AI Test Generator',
      description: 'Generate custom tests with AI',
      icon: Brain,
      link: '/ai/test-generator',
      gradient: 'from-cyan-500 to-blue-600',
      iconColor: 'text-cyan-100',
      tag: <img src="/lovable-uploads/star.gif" alt="medmacs" width={24} />,
    },
    {
      title: 'AI Chatbot',
      description: 'Get instant help from AI tutor',
      icon: Zap,
      link: '/ai/chatbot',
      gradient: 'from-yellow-400 to-orange-500',
      iconColor: 'text-yellow-100',
      tag: <img src="/lovable-uploads/star.gif" alt="medmacs" width={24} />,
    },
    {
      title: 'Full-Length Paper',
      description: 'Practice timed exams with mixed subjects',
      icon: ScrollText,
      link: '/flp',
      gradient: 'from-slate-700 to-slate-900',
      iconColor: 'text-slate-300',
      tag: <img src="/lovable-uploads/star.gif" alt="premium" width={24} />,
    }
  ];

  const otherApps = [
    {
      title: 'Medistics App',
      description: 'The Best AI for MDCAT in Pakistan',
      icon: ({ className }: any) => <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className={className} />,
      link: 'https://medistics.app',
      gradient: 'from-fuchsia-600 to-purple-700',
      iconColor: 'text-white'
    }
  ];

  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Medmacs User';

  if (isNavigating || authLoading || profileLoading || userStatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading Medmacs" className="w-32 h-32 object-contain animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-teal-900/10 dark:to-cyan-900/10">
        <SignInPrompt />
      </div>
    );
  }

  const ActionCard = ({ action, isExternal = false }: any) => {
    const content = (
      <Card
        className={`
          relative overflow-hidden rounded-3xl border-0 h-full p-1
          hover:scale-[1.03] hover:shadow-2xl transition-all duration-300 cursor-pointer 
          bg-gradient-to-br ${action.gradient} shadow-lg group
        `}
      >
        <div className="absolute -right-2 -bottom-4 opacity-20 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 rotate-[-15deg]">
          <action.icon className={`w-28 h-28 ${action.iconColor}`} />
        </div>

        <CardHeader className="relative z-10 pb-2">
          {action.tag && (
            <div className={`absolute top-0 right-0 p-2 rounded-[15px] opacity-80 ${action.tagColor || ''}`}>
              {action.tag}
            </div>
          )}
          <CardTitle className="text-xl font-extrabold text-white tracking-tight pt-2">
            {action.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="relative z-10 pb-8">
          <p className="text-white/80 text-sm font-medium leading-relaxed max-w-[80%]">
            {action.description}
          </p>
        </CardContent>
      </Card>
    );

    if (isExternal) {
      return (
        <a href={action.link} target="_blank" rel="noopener noreferrer" className="block h-full">
          {content}
        </a>
      );
    }

    return (
      <Link to={action.disabled ? '#' : action.link} className={`block h-full ${action.disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {content}
      </Link>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return (
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                <span className="text-gray-900 dark:text-white">Your </span>
                <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                  Study Analytics
                </span>
                <span className="text-gray-900 dark:text-white"> 📊</span>
              </h1>
            </div>


            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Accuracy', value: `${userStats?.accuracy || 0}%`, icon: Target, color: 'teal' },
                { label: 'Questions', value: userStats?.totalQuestions || 0, icon: BookOpen, color: 'green' },
                { label: 'Best Streak', value: userStats?.currentStreak || 0, icon: Trophy, color: 'amber' },
                { label: 'Rank Points', value: userStats?.rankPoints || 0, icon: Users, color: 'blue' },
              ].map((stat, i) => (
                <Card key={i} className="border-0 shadow-sm bg-white dark:bg-gray-800/50 p-4 rounded-2xl">
                  <stat.icon className={`w-5 h-5 mb-2 text-${stat.color}-500`} />
                  <div className="text-2xl font-black">{stat.value}</div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-tighter">{stat.label}</p>
                </Card>
              ))}
            </div>
            <StudyAnalytics />
          </div>
        );
      case 'leaderboard':
        return (
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-2 text-gray-900 dark:text-white">
                Global <span className="text-amber-500">Leaderboard</span> 🏆
              </h1>
              <p className="text-lg text-gray-500">See where you stack up against your peers!</p>
            </div>
            <LeaderboardPreview />
          </div>
        );
      case 'home':
      default:
        return (
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10">
              <h1 className="text-4xl md:text-6xl font-black mb-3 tracking-tight]">
                <span className="text-gray-900 dark:text-white">Hi, </span>
                <span className="bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  {displayName}
                </span>
                <span className="text-gray-900 dark:text-white">! ✨</span>
              </h1>
              <p className="text-xl text-gray-500 dark:text-gray-400 font-medium">
                Ready to dominate your medical exams today?
              </p>
            </div>

            <section className="mb-12">

              <div className="mb-8 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 dark:from-teal-900/40 dark:to-cyan-900/40 rounded-3xl p-6 border border-teal-200/50 dark:border-teal-800/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Flame className="w-6 h-6 text-orange-500 mr-2 animate-bounce" />
                    Study Streak: {userStats?.currentStreak || 0} days
                  </h2>
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 py-1 px-4">
                    🔥 {userStats?.currentStreak > 0 ? 'On Fire!' : 'Start Streak!'}
                  </Badge>
                </div>
                <Progress value={userStats?.accuracy || 0} className="h-4 mb-3 rounded-full bg-teal-100 dark:bg-teal-900" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-teal-600 dark:text-teal-400">{userStats?.accuracy || 0}% overall accuracy</span>
                  <span className="text-gray-500">{userStats?.totalQuestions || 0} Questions solved</span>
                </div>
              </div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Zap className="text-yellow-500 fill-yellow-500 w-6 h-6" /> Quick Actions
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quickActions.map((action, index) => (
                  <ActionCard key={index} action={action} />
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Award className="text-purple-500 w-6 h-6" /> Premium Perks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {premiumPerks.map((action, index) => (
                  <ActionCard key={index} action={action} />
                ))}
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">More from us</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherApps.map((action, index) => (
                  <ActionCard key={index} action={action} isExternal={true} />
                ))}
              </div>
              <div className="text-center mt-20 mb-10 text-gray-400 dark:text-gray-600 text-sm font-medium">
                <p>A Project by Hmacs Studios.</p>
                <p>&copy; 2026 Hmacs Studios. All rights reserved.</p>
              </div>
            </section>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#fdfdfd] dark:bg-[#0a0a0a] pb-24">
      <Seo
        title="Dashboard"
        description="Your personalized Medmacs App dashboard."
        canonical="https://medmacs.app/dashboard"
      />
      <VersionGuard />

      <DashboardHeader profile={profile} user={user} displayName={displayName} />

      <div className="container mx-auto px-6 py-8 mt-60 mt-[calc(env(safe-area-inset-top)+40px)]">
        {renderTabContent()}
      </div>

      <AppExitConfirmation showExitConfirm={showExitConfirm} setShowExitConfirm={setShowExitConfirm} />

      <nav className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 px-120">
        <div className="max-w-md mx-auto bg-white/70 dark:bg-black/70 backdrop-blur-2xl rounded-3xl p-2 shadow-2xl
        border border-white/20 dark:border-gray-800">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'home', label: 'Home', icon: Home },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'leaderboard', label: 'Ranks', icon: Trophy }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`
                  flex flex-col items-center justify-center py-3 rounded-2xl transition-all duration-300
                  ${activeTab === item.id
                    ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/40 scale-105'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 mb-1 ${activeTab === item.id ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;