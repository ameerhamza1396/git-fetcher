// @ts-nocheck
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
  Megaphone, BarChart3, Sun, Moon, ArrowRight, Crown, Mail,
  Receipt, Shield, FileText, RefreshCw, Sparkles, Stethoscope, PieChart, Info, Star
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
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

// Types
type TermOfDay = {
  id: string;
  term: string;
  definition: string;
  created_at: string;
};

type CaseOfDay = {
  id: string;
  headline: string;
  details: string;
  answer: string;
  explanation: string;
  created_at: string;
};

// Swipe-to-reveal Case of Day card
const CaseOfDayCard = ({ caseOfDay }: { caseOfDay: CaseOfDay }) => {
  const [step, setStep] = useState(0); // 0=question, 1=answer, 2=explanation

  const handleSwipe = () => {
    if (step < 2) setStep(s => s + 1);
  };

  return (
    <div className="relative">
      <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 p-6 text-white">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
          maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Case of the Day</p>
          </div>
          <h3 className="text-lg font-black text-white mb-3">{caseOfDay.headline}</h3>
          <p className="text-white/80 text-sm leading-relaxed mb-4">{caseOfDay.details}</p>

          {step >= 1 && (
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 mb-3 animate-fade-in">
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Answer</p>
              <p className="text-white text-sm font-bold leading-relaxed">{caseOfDay.answer}</p>
            </div>
          )}

          {step >= 2 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 mb-3 animate-fade-in">
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">Explanation</p>
              <p className="text-white/90 text-sm leading-relaxed">{caseOfDay.explanation}</p>
            </div>
          )}

          {step < 2 && (
            <Button onClick={handleSwipe} className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-2xl h-11 font-bold text-xs uppercase tracking-widest mt-2">
              {step === 0 ? '👆 Tap to Reveal Answer' : '👆 Tap to Reveal Explanation'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('home');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isNavigating, setIsNavigating] = useState(true);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showTermOfDay, setShowTermOfDay] = useState(false);
  const [showCaseOfDay, setShowCaseOfDay] = useState(false);

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
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: userStats, isLoading: userStatsLoading } = useQuery({
    queryKey: ['user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: answers, error: answersError } = await supabase.from('user_answers').select('*').eq('user_id', user.id);
      if (answersError) return { totalQuestions: 0, correctAnswers: 0, accuracy: 0, currentStreak: 0, rankPoints: 0, battlesWon: 0, totalBattles: 0 };
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
          if (date.toDateString() === expectedDate.toDateString()) currentStreak++;
          else break;
        }
      }
      const { data: battles } = await supabase.from('battle_results').select('*').eq('user_id', user.id);
      const battlesWon = battles?.filter(b => b.rank === 1)?.length || 0;
      const rankPoints = correctAnswers * 10 + currentStreak * 5 + accuracy;
      return { totalQuestions, correctAnswers, accuracy, currentStreak, rankPoints, battlesWon, totalBattles: battles?.length || 0 };
    },
    enabled: !!user?.id
  });

  const { data: announcements, isLoading: announcementsLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('announcements').select('*').eq('is_published', true).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: readAnnouncements } = useQuery({
    queryKey: ['readAnnouncements', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from('user_announcements').select('announcement_id').eq('user_id', user.id);
      if (error) return [];
      return data.map(item => item.announcement_id);
    },
    enabled: !!user?.id,
  });

  // Fetch Term of the Day
  const { data: termOfDay, isLoading: termLoading } = useQuery<TermOfDay>({
    queryKey: ['termOfDay'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('term_of_day')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch Case of the Day
  const { data: caseOfDay, isLoading: caseLoading } = useQuery<CaseOfDay>({
    queryKey: ['caseOfDay'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('case_of_day')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (announcementIds: string[]) => {
      if (!user?.id || !announcementIds?.length) return;
      const records = announcementIds.map(id => ({ user_id: user.id, announcement_id: id }));
      await supabase.from('user_announcements').upsert(records, { onConflict: 'user_id, announcement_id' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['readAnnouncements', user?.id] }); },
  });

  useEffect(() => {
    if (activeTab === 'announcements' && user && announcements?.length) {
      markAsReadMutation.mutate(announcements.map(a => a.id));
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
    { title: 'Practice MCQs', description: 'Test your knowledge', icon: BookOpen, link: '/mcqs', gradient: 'from-blue-500 to-indigo-600', iconColor: 'text-blue-200' },
    { title: 'Saved MCQs', description: 'Review bookmarks', icon: Bookmark, link: '/saved-mcqs', gradient: 'from-emerald-500 to-teal-600', iconColor: 'text-emerald-200' },
    { title: 'Battle Arena', description: 'Compete with friends', icon: Swords, link: '/battle', gradient: 'from-orange-500 to-red-500', iconColor: 'text-orange-100' },
    { title: 'Collaborate', description: 'Apply for Medmacs!', icon: Briefcase, link: '/summerinternship2025', gradient: 'from-rose-500 to-pink-600', iconColor: 'text-rose-100', tag: 'Open now!', tagColor: 'bg-white/90 text-rose-600 animate-pulse' },
  ];

  const premiumPerks = [
    { title: 'AI Test Generator', description: 'Custom tests with AI', icon: Brain, link: '/ai/test-generator', gradient: 'from-cyan-500 to-blue-600', iconColor: 'text-cyan-100' },
    { title: 'AI Chatbot', description: 'Instant AI tutor', icon: Zap, link: '/ai/chatbot', gradient: 'from-amber-400 to-orange-500', iconColor: 'text-yellow-100' },
    { title: 'Full-Length Paper', description: 'Timed mixed exams', icon: ScrollText, link: '/flp', gradient: 'from-teal-500 to-emerald-600', iconColor: 'text-teal-200' },
  ];

  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Medmacs User';
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  if (isNavigating || authLoading || profileLoading || userStatsLoading || termLoading || caseLoading) {
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

  const ActionCard = ({ action, isExternal = false, fixedHeight = false }: any) => {
    const content = (
      <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${action.gradient} shadow-lg shadow-black/5 dark:shadow-black/20 active:scale-[0.97] transition-all duration-150 ${fixedHeight ? 'h-[120px]' : ''}`}>
        <div className="absolute -right-3 -bottom-3 opacity-10">
          <action.icon className={`w-20 h-20 ${action.iconColor}`} />
        </div>
        <div className="relative z-10">
          {action.tag && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${action.tagColor || 'bg-white/20 text-white'}`}>
              {action.tag}
            </span>
          )}
          <h3 className="text-[15px] font-bold text-white leading-tight">{action.title}</h3>
          <p className="text-white/60 text-[11px] mt-0.5 font-medium">{action.description}</p>
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
    { id: 'analytics', label: 'Stats', icon: BarChart3 },
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
            <h1 className="text-xl font-bold text-foreground">📢 Announcements</h1>
            <p className="text-xs text-muted-foreground">Latest news & updates</p>
            {announcementsLoading && (
              <div className="flex justify-center py-12">
                <BellRing className="h-6 w-6 animate-bounce text-muted-foreground" />
              </div>
            )}
            {announcements?.length === 0 && !announcementsLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">No announcements yet</p>
              </div>
            )}
            {announcements?.map((a) => (
              <Card key={a.id} className="border border-border/40 shadow-sm bg-card/80 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BellRing className="h-3.5 w-3.5 text-primary" />
                    {a.title}
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{a.content}</p>
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
            <h1 className="text-xl font-bold text-foreground mb-1">🏆 Leaderboard</h1>
            <p className="text-xs text-muted-foreground mb-5">See where you rank</p>
            <LeaderboardPreview />
          </div>
        );

      case 'analytics':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <h1 className="text-xl font-bold text-foreground mb-1">📊 Analytics</h1>
            <p className="text-xs text-muted-foreground mb-5">Track your progress</p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Accuracy', value: `${userStats?.accuracy || 0}%`, icon: Target, color: 'text-primary' },
                { label: 'Questions', value: userStats?.totalQuestions || 0, icon: BookOpen, color: 'text-emerald-500' },
                { label: 'Streak', value: userStats?.currentStreak || 0, icon: Flame, color: 'text-orange-500' },
                { label: 'Points', value: userStats?.rankPoints || 0, icon: Award, color: 'text-blue-500' },
              ].map((stat, i) => (
                <Card key={i} className="border border-border/40 shadow-sm bg-card/80 backdrop-blur-sm p-3.5">
                  <stat.icon className={`w-4 h-4 mb-1.5 ${stat.color}`} />
                  <div className="text-xl font-black text-foreground">{stat.value}</div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                </Card>
              ))}
            </div>
            <StudyAnalytics />
          </div>
        );

      case 'profile':
        return (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary/10 to-accent border border-border/40 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-foreground font-bold text-lg">{displayName.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{displayName}</h2>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                <Badge className="mt-1.5 text-[10px] bg-primary/15 text-primary border-0 font-semibold">{userPlanDisplayName}</Badge>
              </div>
            </div>

            <Card className="border border-border/40 shadow-sm bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === 'dark' ? <Moon className="w-5 h-5 text-blue-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
                    <div>
                      <p className="text-sm font-semibold text-foreground">Dark Mode</p>
                      <p className="text-[11px] text-muted-foreground">Toggle app theme</p>
                    </div>
                  </div>
                  <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
                </div>
              </CardContent>
            </Card>

            {/* Main settings */}
            <Card className="border border-border/40 shadow-sm overflow-hidden bg-card/80">
              <CardContent className="p-0 divide-y divide-border/30">
                {[
                  { label: 'Edit Profile', icon: User, link: '/profile' },
                  { label: 'Change Password', icon: Lock, link: '/profile/password' },
                  { label: 'Subscription', icon: CreditCard, link: '/pricing' },
                  { label: 'Redeem Code', icon: Award, link: '/redeem' },
                  { label: 'Purchase History', icon: Receipt, link: '/purchase-history' },
                  { label: 'Contact Us', icon: Mail, link: '/contact-us' },
                ].map((item, i) => (
                  <Link key={i} to={item.link} className="flex items-center justify-between p-4 hover:bg-accent/50 active:bg-accent transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                        <item.icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
                {/* What's New button */}
                <button onClick={() => setShowWhatsNew(true)} className="flex items-center justify-between p-4 hover:bg-accent/50 active:bg-accent transition-colors w-full">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-foreground">What's New</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </CardContent>
            </Card>

            {/* Legal links - lighter style */}
            <Card className="border border-border/20 shadow-none bg-muted/30">
              <CardContent className="p-0 divide-y divide-border/20">
                {[
                  { label: 'Privacy Policy', icon: Shield, link: '/privacypolicy' },
                  { label: 'Terms & Conditions', icon: FileText, link: '/terms' },
                  { label: 'Refund Policy', icon: RefreshCw, link: '/terms' },
                ].map((item, i) => (
                  <Link key={i} to={item.link} className="flex items-center justify-between p-3.5 hover:bg-accent/30 active:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground/60" />
                      <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full text-destructive border-destructive/20 hover:bg-destructive/5" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>

            <div className="text-center pt-4 pb-2">
              <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
              <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
            </div>
          </div>
        );

      case 'home':
      default:
        return (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Greeting - no avatar here */}
            <div className="mb-5">
              <h1 className="text-xl font-black text-foreground leading-tight">
                Hi, <span className="text-primary">{displayName}</span> ✨
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">Ready to dominate your exams?</p>
            </div>

            {/* Streak bar - elevated */}
            <div className="bg-gradient-to-r from-primary/12 to-accent border border-primary/20 rounded-2xl p-4 mb-6 shadow-md shadow-primary/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-500" /> {userStats?.currentStreak || 0} day streak
                </span>
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-[10px] px-2 font-bold shadow-sm">
                  {(userStats?.currentStreak || 0) > 0 ? '🔥 On Fire!' : 'Start!'}
                </Badge>
              </div>
              <Progress value={userStats?.accuracy || 0} className="h-2.5 mb-2" />
              <div className="flex justify-between text-[11px] font-semibold">
                <span className="text-primary">{userStats?.accuracy || 0}% accuracy</span>
                <span className="text-muted-foreground">{userStats?.totalQuestions || 0} solved</span>
              </div>
            </div>

            {/* Quick Actions - elevated cards */}
            <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
              <Zap className="text-amber-500 fill-amber-500 w-3.5 h-3.5" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {quickActions.map((action, i) => <ActionCard key={i} action={action} fixedHeight />)}
            </div>

            {/* Plan Status & Term of Day - side by side */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Plan Pie Chart */}
              <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 flex flex-col items-center justify-center">
                {rawUserPlan === 'free' ? (
                  <>
                    <div className="relative w-20 h-20 mb-2">
                      <svg viewBox="0 0 36 36" className="w-full h-full">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${Math.min(((userStats?.totalQuestions || 0) / 50) * 100, 100)}, 100`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-black text-foreground">{Math.min(userStats?.totalQuestions || 0, 50)}/50</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider text-center">Daily Limit</p>
                    <p className="text-[9px] text-muted-foreground text-center mt-0.5">Free Plan</p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${rawUserPlan === 'iconic' ? 'bg-gradient-to-br from-rose-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-violet-600'}`}>
                      {rawUserPlan === 'iconic' ? <Crown className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-white" />}
                    </div>
                    <p className="text-xs font-black text-foreground uppercase">{rawUserPlan === 'iconic' ? 'Iconic' : 'Premium'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Unlimited access</p>
                  </div>
                )}
              </div>

              {/* Term of the Day */}
              <button
                onClick={() => setShowTermOfDay(true)}
                className="rounded-2xl border border-border/40 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 backdrop-blur-sm p-4 text-left active:scale-[0.97] transition-all"
                disabled={!termOfDay}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Term of the Day</span>
                </div>
                <h4 className="text-sm font-black text-foreground mb-1">{termOfDay?.term || 'Loading...'}</h4>
                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{termOfDay?.definition || ''}</p>
              </button>
            </div>

            {/* Case of the Day */}
            <button
              onClick={() => setShowCaseOfDay(true)}
              className="w-full rounded-2xl border border-border/40 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 backdrop-blur-sm p-4 text-left mb-6 active:scale-[0.97] transition-all"
              disabled={!caseOfDay}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Stethoscope className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Case of the Day</span>
              </div>
              <h4 className="text-sm font-black text-foreground mb-1">{caseOfDay?.headline || 'Loading...'}</h4>
              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{caseOfDay?.details || ''}</p>
            </button>

            {/* Premium Perks with animated crown */}
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500 animate-bounce-gentle" />
              <h2 className="text-sm font-bold text-foreground">Premium Perks</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 mb-8">
              {premiumPerks.map((action, i) => <ActionCard key={i} action={action} />)}
            </div>

            {/* Medistics - purple */}
            <div className="mb-6 pt-4 border-t border-border/30">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-violet-500" /> Explore
              </h2>
              <a href="https://medistics.app" target="_blank" rel="noopener noreferrer">
                <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-violet-500/10 active:scale-[0.97] transition-all">
                  <div className="relative z-10 flex items-center gap-3">
                    <img src="lovable-uploads/WhatsApp Image 2025-07-20 at 15.46.21_0d2711fb rem bg.png" alt="Medmacs" className="w-8 h-8" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Medistics App</h3>
                      <p className="text-white/60 text-[11px] font-medium">The Best AI for MDCAT</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/40 ml-auto" />
                  </div>
                </div>
              </a>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 pb-4">
              <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
              <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-background pb-28 overflow-x-hidden">
      <Seo title="Dashboard" description="Your personalized Medmacs App dashboard." canonical="https://medmacs.app/dashboard" />
      <VersionGuard />

      {/* Minimal top bar with avatar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/30 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-5 h-12">
          <div className="flex items-center gap-2.5">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-6 h-6" />
            <span className="text-sm font-extrabold text-foreground tracking-tight">Medmacs</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-[10px] font-bold bg-primary/10 text-primary border-0 px-2.5">{userPlanDisplayName}</Badge>
            <button onClick={() => setActiveTab('profile')} className="shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center overflow-hidden ring-1 ring-primary/20">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-foreground font-bold text-[10px]">{displayName.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-5 mt-[calc(env(safe-area-inset-top))]">
        {renderTabContent()}
      </div>

      <AppExitConfirmation showExitConfirm={showExitConfirm} setShowExitConfirm={setShowExitConfirm} />

      {/* What's New Dialog */}
      <Dialog open={showWhatsNew} onOpenChange={setShowWhatsNew}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">What's New</DialogTitle>
            <DialogDescription>Release history</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {[
              { version: 'v6.1', title: 'First Public Release', desc: 'Updated UI, bug fixes and optimizations' },
              { version: 'v6.0', title: 'Beta Release', desc: 'Major feature additions and improvements' },
              { version: 'v5.0', title: 'Alpha Release', desc: 'Initial internal testing build' },
            ].map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                <Badge className="bg-primary/15 text-primary border-0 text-xs font-bold shrink-0">{r.version}</Badge>
                <div>
                  <p className="text-sm font-bold text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Term of Day Dialog - vibrant */}
      <Dialog open={showTermOfDay} onOpenChange={setShowTermOfDay}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-0">
          {termOfDay && (
            <div className="relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-6 text-white">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
                maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
              }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Term of the Day</p>
                    <h3 className="text-2xl font-black text-white">{termOfDay.term}</h3>
                  </div>
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{termOfDay.definition}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Case of Day Dialog - swipe reveal */}
      <Dialog open={showCaseOfDay} onOpenChange={setShowCaseOfDay}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-0">
          {caseOfDay && <CaseOfDayCard caseOfDay={caseOfDay} />}
        </DialogContent>
      </Dialog>

      {/* Premium bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-3 mb-2 bg-card/95 backdrop-blur-2xl rounded-2xl border border-border/40 shadow-xl shadow-black/8 dark:shadow-black/30">
          <div className="flex items-end justify-around h-16 px-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center justify-end pb-2 transition-all duration-300 ${isActive ? 'min-w-[64px]' : 'min-w-[48px]'
                    }`}
                >
                  <div className={`flex flex-col items-center transition-all duration-300 ${isActive ? '-translate-y-2' : ''
                    }`}>
                    <div className={`relative flex items-center justify-center transition-all duration-300 ${isActive
                        ? 'w-11 h-11 rounded-2xl bg-primary shadow-lg shadow-primary/30'
                        : 'w-9 h-9'
                      }`}>
                      <tab.icon className={`transition-all duration-300 ${isActive
                          ? 'w-5 h-5 text-primary-foreground'
                          : 'w-[18px] h-[18px] text-muted-foreground'
                        }`} />
                      {tab.badge && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                          {tab.badge > 9 ? '9+' : tab.badge}
                        </span>
                      )}
                    </div>
                    <span className={`mt-0.5 transition-all duration-300 ${isActive
                        ? 'text-[10px] font-bold text-primary'
                        : 'text-[9px] font-medium text-muted-foreground'
                      }`}>
                      {tab.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;