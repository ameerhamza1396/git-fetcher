import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  BookOpen, Zap, Trophy, Target, Users, Brain, Swords, Flame,
  TrendingUp, Award, Briefcase, BellRing, Bookmark, ScrollText,
  Home, User, Settings, ChevronRight, LogOut, Lock, CreditCard,
  Megaphone, BarChart3, Sun, Moon, ArrowRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { LeaderboardPreview } from '@/components/dashboard/LeaderboardPreview';
import { StudyAnalytics } from '@/components/dashboard/StudyAnalytics';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState, useRef } from 'react';
import AnnouncementToastManager from '@/components/ui/AnnouncementToastManager';
import AuthErrorDisplay from '@/components/AuthErrorDisplay';
import Seo from '@/components/Seo';
import SignInPrompt from '@/components/SigninPrompt';
import AppExitConfirmation from '@/components/dashboard/AppExitConfirmation';
import VersionGuard from '@/components/VersionControl';
import ProfileAvatar from '@/components/profile/ProfileAvatar';

const Dashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
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
    email?: string;
    plan_expiry_date?: string;
    role?: string;
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

  // Announcements data
  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: readAnnouncements } = useQuery({
    queryKey: ['readAnnouncements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_announcements')
        .select('announcement_id')
        .eq('user_id', user.id);
      if (error) return [];
      return data.map(item => item.announcement_id);
    },
    enabled: !!user?.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (announcementIds: string[]) => {
      if (!user?.id || !announcementIds?.length) return;
      const records = announcementIds.map(id => ({ user_id: user.id, announcement_id: id }));
      await supabase.from('user_announcements').upsert(records, { onConflict: 'user_id, announcement_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['readAnnouncements', user?.id]);
    },
  });

  // Mark announcements as read when viewing that tab
  useEffect(() => {
    if (activeTab === 'announcements' && user && announcements?.length) {
      const ids = announcements.map(a => a.id);
      markAsReadMutation.mutate(ids);
    }
  }, [activeTab, announcements, user]);

  useEffect(() => {
    if (authLoading || profileLoading) { setIsNavigating(true); return; }
    if (!user || !profile) { setIsNavigating(false); return; }
    if (profile.username === null) { navigate('/welcome-new-user'); return; }
    const validYears = ["1st", "2nd", "3rd", "4th", "5th"];
    if (profile.year && !validYears.includes(profile.year)) { navigate('/select-year'); return; }
    setIsNavigating(false);
  }, [authLoading, profileLoading, user, profile, navigate]);

  const quickActions = [
    { title: 'Practice MCQs', description: 'Test your knowledge', icon: BookOpen, link: '/mcqs', gradient: 'from-blue-600 to-indigo-700', iconColor: 'text-blue-200' },
    { title: 'Saved MCQs', description: 'Review bookmarks', icon: Bookmark, link: '/saved-mcqs', gradient: 'from-emerald-500 to-teal-700', iconColor: 'text-emerald-200' },
    { title: 'Battle Arena', description: 'Compete with friends', icon: Swords, link: '/battle', gradient: 'from-orange-500 to-red-600', iconColor: 'text-orange-100' },
    { title: 'Collaborate', description: 'Apply for Medmacs!', icon: Briefcase, link: '/summerinternship2025', gradient: 'from-rose-500 to-red-700', iconColor: 'text-rose-100', tag: 'Open now!', tagColor: 'bg-white text-red-600 animate-pulse' },
  ];

  const premiumPerks = [
    { title: 'AI Test Generator', description: 'Custom tests with AI', icon: Brain, link: '/ai/test-generator', gradient: 'from-cyan-500 to-blue-600', iconColor: 'text-cyan-100', tag: <img src="/lovable-uploads/star.gif" alt="premium" width={20} /> },
    { title: 'AI Chatbot', description: 'Instant AI tutor', icon: Zap, link: '/ai/chatbot', gradient: 'from-yellow-400 to-orange-500', iconColor: 'text-yellow-100', tag: <img src="/lovable-uploads/star.gif" alt="premium" width={20} /> },
    { title: 'Full-Length Paper', description: 'Timed mixed exams', icon: ScrollText, link: '/flp', gradient: 'from-slate-700 to-slate-900', iconColor: 'text-slate-300', tag: <img src="/lovable-uploads/star.gif" alt="premium" width={20} /> },
  ];

  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Medmacs User';
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  if (isNavigating || authLoading || profileLoading || userStatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <SignInPrompt />
      </div>
    );
  }

  const ActionCard = ({ action, isExternal = false }: any) => {
    const content = (
      <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${action.gradient} shadow-md active:scale-[0.97] transition-transform duration-150`}>
        <div className="absolute -right-3 -bottom-3 opacity-15">
          <action.icon className={`w-20 h-20 ${action.iconColor}`} />
        </div>
        <div className="relative z-10">
          {action.tag && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${action.tagColor || 'bg-white/20 text-white'}`}>
              {action.tag}
            </span>
          )}
          <h3 className="text-base font-bold text-white mt-1">{action.title}</h3>
          <p className="text-white/70 text-xs mt-0.5">{action.description}</p>
        </div>
      </div>
    );

    if (isExternal) return <a href={action.link} target="_blank" rel="noopener noreferrer">{content}</a>;
    return <Link to={action.disabled ? '#' : action.link} className={action.disabled ? 'opacity-50 pointer-events-none' : ''}>{content}</Link>;
  };

  const unreadCount = (announcements && readAnnouncements)
    ? announcements.filter(a => !readAnnouncements.includes(a.id)).length : 0;

  const tabs = [
    { id: 'announcements', label: 'News', icon: Megaphone, badge: unreadCount > 0 ? unreadCount : null },
    { id: 'leaderboard', label: 'Ranks', icon: Trophy },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'announcements':
        return (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 space-y-4">
            <h1 className="text-2xl font-bold text-foreground">📢 Announcements</h1>
            <p className="text-sm text-muted-foreground">Latest news & updates</p>
            {announcementsLoading && (
              <div className="flex justify-center py-12">
                <BellRing className="h-6 w-6 animate-bounce text-muted-foreground" />
              </div>
            )}
            {announcements?.length === 0 && !announcementsLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2" />
                <p>No announcements yet</p>
              </div>
            )}
            {announcements?.map((a) => (
              <Card key={a.id} className="border border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-blue-500" />
                    {a.title}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                  {a.media_url && a.media_url.match(/\.(jpeg|jpg|png|gif|webp)$/i) && (
                    <img src={a.media_url} alt="Media" className="w-full rounded-xl mt-3 max-h-48 object-cover" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case 'leaderboard':
        return (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <h1 className="text-2xl font-bold text-foreground mb-1">🏆 Leaderboard</h1>
            <p className="text-sm text-muted-foreground mb-6">See where you rank</p>
            <LeaderboardPreview />
          </div>
        );

      case 'analytics':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-2xl font-bold text-foreground mb-1">📊 Analytics</h1>
            <p className="text-sm text-muted-foreground mb-6">Track your progress</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Accuracy', value: `${userStats?.accuracy || 0}%`, icon: Target, color: 'text-teal-500' },
                { label: 'Questions', value: userStats?.totalQuestions || 0, icon: BookOpen, color: 'text-emerald-500' },
                { label: 'Streak', value: userStats?.currentStreak || 0, icon: Flame, color: 'text-orange-500' },
                { label: 'Points', value: userStats?.rankPoints || 0, icon: Award, color: 'text-blue-500' },
              ].map((stat, i) => (
                <Card key={i} className="border-0 shadow-sm p-3">
                  <stat.icon className={`w-4 h-4 mb-1 ${stat.color}`} />
                  <div className="text-xl font-black text-foreground">{stat.value}</div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">{stat.label}</p>
                </Card>
              ))}
            </div>
            <StudyAnalytics />
          </div>
        );

      case 'profile':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
            {/* User info card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center overflow-hidden shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-lg">{displayName.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{displayName}</h2>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <Badge variant="secondary" className="mt-1 text-[10px]">{userPlanDisplayName}</Badge>
              </div>
            </div>

            {/* Theme toggle */}
            <Card className="border border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">Dark Mode</p>
                      <p className="text-xs text-muted-foreground">Toggle app theme</p>
                    </div>
                  </div>
                  <Switch
                    checked={theme === 'dark'}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Settings links */}
            <Card className="border border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-0 divide-y divide-border/50">
                {[
                  { label: 'Edit Profile', icon: User, link: '/profile' },
                  { label: 'Change Password', icon: Lock, link: '/profile/password' },
                  { label: 'Subscription', icon: CreditCard, link: '/pricing' },
                  { label: 'Redeem Code', icon: Award, link: '/redeem' },
                ].map((item, i) => (
                  <Link key={i} to={item.link} className="flex items-center justify-between p-4 hover:bg-muted/50 active:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Logout */}
            <Button variant="outline" className="w-full text-red-500 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>

            <p className="text-center text-[10px] text-muted-foreground pt-4">
              A Project by Hmacs Studios. © 2026
            </p>
          </div>
        );

      case 'home':
      default:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Greeting */}
            <div className="mb-6">
              <h1 className="text-2xl font-black text-foreground">
                Hi, <span className="bg-gradient-to-r from-teal-500 to-emerald-600 bg-clip-text text-transparent">{displayName}</span> ✨
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Ready to dominate your exams?</p>
            </div>

            {/* Streak bar */}
            <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 dark:from-teal-900/30 dark:to-emerald-900/30 rounded-2xl p-4 border border-teal-200/50 dark:border-teal-800/50 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" /> {userStats?.currentStreak || 0} day streak
                </span>
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-[10px] px-2">
                  {(userStats?.currentStreak || 0) > 0 ? '🔥 On Fire!' : 'Start!'}
                </Badge>
              </div>
              <Progress value={userStats?.accuracy || 0} className="h-2 mb-2" />
              <div className="flex justify-between text-[11px] font-medium">
                <span className="text-teal-600 dark:text-teal-400">{userStats?.accuracy || 0}% accuracy</span>
                <span className="text-muted-foreground">{userStats?.totalQuestions || 0} solved</span>
              </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Zap className="text-yellow-500 fill-yellow-500 w-4 h-4" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {quickActions.map((action, i) => <ActionCard key={i} action={action} />)}
            </div>

            {/* Premium */}
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Award className="text-purple-500 w-4 h-4" /> Premium
            </h2>
            <div className="grid grid-cols-1 gap-3 mb-6">
              {premiumPerks.map((action, i) => <ActionCard key={i} action={action} />)}
            </div>

            {/* More */}
            <Link to="https://medistics.app" target="_blank" rel="noopener noreferrer">
              <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-fuchsia-600 to-purple-700 shadow-md active:scale-[0.97] transition-transform">
                <div className="relative z-10 flex items-center gap-3">
                  <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs" className="w-8 h-8" />
                  <div>
                    <h3 className="text-sm font-bold text-white">Medistics App</h3>
                    <p className="text-white/70 text-xs">The Best AI for MDCAT</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/50 ml-auto" />
                </div>
              </div>
            </Link>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-background pb-24">
      <Seo title="Dashboard" description="Your personalized Medmacs App dashboard." canonical="https://medmacs.app/dashboard" />
      <VersionGuard />

      {/* Minimal top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-5 h-12">
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-6 h-6" />
            <span className="text-sm font-bold text-foreground">Medmacs</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold">{userPlanDisplayName}</Badge>
        </div>
      </header>

      {/* Content */}
      <div className="px-5 mt-[calc(env(safe-area-inset-top)+60px)]">
        {renderTabContent()}
      </div>

      <AppExitConfirmation showExitConfirm={showExitConfirm} setShowExitConfirm={setShowExitConfirm} />

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center justify-center min-w-[60px] py-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-muted-foreground'
              }`}
            >
              {activeTab === tab.id && (
                <div className="absolute -top-0.5 w-6 h-0.5 bg-teal-500 rounded-full" />
              )}
              <div className="relative">
                <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'scale-110' : ''} transition-transform`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-semibold mt-0.5 ${activeTab === tab.id ? 'font-black' : ''}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
