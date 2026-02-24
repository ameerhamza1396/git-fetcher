import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Crown, Medal, Award, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  id: string;
  user_id: string;
  username: string;
  total_score: number;
  accuracy: number;
  total_questions: number;
}

export const LeaderboardPreview = () => {
  const { data: topUsers = [], isLoading } = useQuery({
    queryKey: ['leaderboard-preview'],
    queryFn: async () => {
      try {
        const { data: userAnswers, error: answersError } = await supabase
          .from('user_answers')
          .select('user_id, is_correct, time_taken, created_at');
        
        if (answersError) return [];

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name');
        
        if (profilesError) return [];

        const userStats: Record<string, any> = {};
        
        userAnswers?.forEach(answer => {
          if (!userStats[answer.user_id]) {
            userStats[answer.user_id] = { totalQuestions: 0, correctAnswers: 0, totalTime: 0, answers: [] };
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
              total_score: totalScore, accuracy, total_questions: stats.totalQuestions,
            };
          }) || [];

        return leaderboardEntries.sort((a, b) => b.total_score - a.total_score).slice(0, 5);
      } catch (error) { return []; }
    }
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-amber-600" />;
      default: return <Trophy className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card to-accent/30 border-border hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-foreground">
            <Trophy className="w-5 h-5 text-primary" />
            <span>Top Students</span>
          </CardTitle>
          <Link to="/leaderboard">
            <Button variant="ghost" size="sm" className="text-primary hover:bg-accent">
              View All
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-6 h-6 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-muted rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : topUsers.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No data available yet</p>
            <p className="text-muted-foreground text-xs">Start practicing to see rankings!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topUsers.map((user, index) => (
              <div 
                key={user.id}
                className="flex items-center space-x-3 p-2 rounded-lg bg-card/60 hover:bg-accent/50 transition-all duration-200"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    {getRankIcon(index + 1)}
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.accuracy}% • {user.total_questions} questions
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                  {user.total_score}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};