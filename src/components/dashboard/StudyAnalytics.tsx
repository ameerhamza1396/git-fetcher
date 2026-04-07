import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Brain,
  Award,
  Zap,
  Bookmark
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const SkeletonLine = ({ className = 'h-4 w-3/4' }) => (
  <div className={`animate-pulse bg-muted rounded ${className}`}></div>
);

const CardSkeleton = ({ children, className }) => (
  <Card className={`animate-pulse ${className}`}>
    {children}
  </Card>
);

const StudyAnalyticsSkeleton = () => (
  <div className="space-y-4">
    <CardSkeleton className="bg-gradient-to-br from-card to-accent/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <SkeletonLine className="w-5 h-5" />
          <SkeletonLine className="h-6 w-32" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <SkeletonLine className="h-4 w-2/5" />
            <SkeletonLine className="h-4 w-1/5" />
          </div>
          <Progress value={0} className="h-2" />
          <div className="flex justify-between text-xs">
            <SkeletonLine className="h-3 w-1/4" />
            <SkeletonLine className="h-3 w-1/4" />
          </div>
        </div>
      </CardContent>
    </CardSkeleton>

    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map((i) => (
        <CardSkeleton key={i} className="min-h-[90px] p-0">
          <CardContent className="p-4 flex items-center space-x-2">
            <SkeletonLine className="w-8 h-8 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1">
              <SkeletonLine className="h-4 w-3/4" />
              <SkeletonLine className="h-3 w-1/2" />
            </div>
          </CardContent>
        </CardSkeleton>
      ))}
    </div>

    <CardSkeleton className="bg-gradient-to-br from-card to-accent/30 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-lg">
          <SkeletonLine className="w-5 h-5" />
          <SkeletonLine className="h-6 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <SkeletonLine className="h-6 w-1/2 mx-auto mb-1" />
            <SkeletonLine className="h-3 w-3/4 mx-auto" />
          </div>
          <div>
            <SkeletonLine className="h-6 w-1/2 mx-auto mb-1" />
            <SkeletonLine className="h-3 w-3/4 mx-auto" />
          </div>
        </div>
        <SkeletonLine className="h-8 w-full" />
      </CardContent>
    </CardSkeleton>
  </div>
);

export const StudyAnalytics = () => {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['study-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentAnswers } = await supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: allAnswers } = await supabase
        .from('user_answers')
        .select('*')
        .eq('user_id', user.id);

      const { data: aiTests } = await supabase
        .from('ai_generated_tests')
        .select('*')
        .eq('user_id', user.id);

      const { data: battles } = await supabase
        .from('battle_results')
        .select('*')
        .eq('user_id', user.id);

      const { count: savedCount } = await supabase
        .from('saved_mcqs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const totalQuestions = allAnswers?.length || 0;
      const correctAnswers = allAnswers?.filter(a => a.is_correct)?.length || 0;
      const weeklyQuestions = recentAnswers?.length || 0;
      const weeklyCorrect = recentAnswers?.filter(a => a.is_correct)?.length || 0;

      const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const weeklyAccuracy = weeklyQuestions > 0 ? Math.round((weeklyCorrect / weeklyQuestions) * 100) : 0;

      const answersWithTime = allAnswers?.filter(a => a.time_taken && a.time_taken > 0) || [];
      const avgTime = answersWithTime.length > 0
        ? Math.round(answersWithTime.reduce((sum, a) => sum + (a.time_taken || 0), 0) / answersWithTime.length)
        : 0;

      const studyDates = allAnswers?.map(a => {
        const date = new Date(a.created_at);
        return date.toLocaleDateString("en-US", { timeZone: "Asia/Karachi" });
      }) || [];
      const uniqueStudyDates = [...new Set(studyDates)];

      let currentStreak = 0;
      const today = new Date();
      const todayPKT = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
      const todayStr = todayPKT.toLocaleDateString("en-US", { timeZone: "Asia/Karachi" });

      if (uniqueStudyDates.length > 0) {
        const isTodayActive = uniqueStudyDates.includes(todayStr);
        let checkDate = new Date(todayPKT);
        if (!isTodayActive) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        while (true) {
          const checkStr = checkDate.toLocaleDateString("en-US", { timeZone: "Asia/Karachi" });
          if (uniqueStudyDates.includes(checkStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
          if (currentStreak > 365) break;
        }
      }

      return {
        totalQuestions,
        correctAnswers,
        overallAccuracy,
        weeklyQuestions,
        weeklyAccuracy,
        avgTime,
        testsGenerated: aiTests?.length || 0,
        battlesPlayed: battles?.length || 0,
        battlesWon: battles?.filter(b => b.rank === 1)?.length || 0,
        savedCount: savedCount || 0
      };
    },
    enabled: !!user?.id
  });

  if (isLoading || !user) {
    return <StudyAnalyticsSkeleton />;
  }

  if (!analytics) return null;

  const weeklyGoal = 50;
  const weeklyProgress = Math.min((analytics.weeklyQuestions / weeklyGoal) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Weekly Progress */}
      <Card className="bg-gradient-to-br from-card to-accent/30 border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-foreground text-lg">
            <Target className="w-5 h-5 text-primary" />
            <span>Weekly Goal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Questions Answered</span>
              <span className="font-medium text-foreground">
                {analytics.weeklyQuestions}/{weeklyGoal}
              </span>
            </div>
            <Progress value={weeklyProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{analytics.weeklyAccuracy}% accuracy this week</span>
              <span>{Math.round(weeklyProgress)}% complete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Study Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Bookmark className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {analytics.savedCount}
                </p>
                <p className="text-xs text-muted-foreground">Saved Qs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {analytics.avgTime}s
                </p>
                <p className="text-xs text-muted-foreground">Avg Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">
                  {analytics.testsGenerated}
                </p>
                <p className="text-xs text-muted-foreground">AI Tests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-border">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                <Award className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {analytics.battlesWon}/{analytics.battlesPlayed}
                </p>
                <p className="text-xs text-muted-foreground">Battles Won</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card className="bg-gradient-to-br from-card to-accent/30 border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-foreground text-lg">
            <TrendingUp className="w-5 h-5 text-primary" />
            <span>Performance Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {analytics.overallAccuracy}%
              </div>
              <div className="text-xs text-muted-foreground">Overall Accuracy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {analytics.totalQuestions}
              </div>
              <div className="text-xs text-muted-foreground">Total Questions</div>
            </div>
          </div>

          {analytics.weeklyAccuracy > analytics.overallAccuracy && (
            <div className="flex items-center space-x-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300">
                You're improving! This week's accuracy is {analytics.weeklyAccuracy - analytics.overallAccuracy}% higher!
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};