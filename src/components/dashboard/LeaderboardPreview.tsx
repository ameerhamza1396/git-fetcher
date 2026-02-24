
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
        // Get all user answers to calculate scores
        const { data: userAnswers, error: answersError } = await supabase
          .from('user_answers')
          .select('user_id, is_correct, time_taken, created_at');
        
        if (answersError) {
          console.error('Error fetching user answers:', answersError);
          return [];
        }

        // Get all profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, full_name');
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return [];
        }

        // Calculate user statistics
        const userStats: Record<string, any> = {};
        
        userAnswers?.forEach(answer => {
          if (!userStats[answer.user_id]) {
            userStats[answer.user_id] = {
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
            const speedBonus = Math.max(0, 60 - averageTime); // Bonus for faster answers
            
            const totalScore = basePoints + streakBonus + accuracyBonus + speedBonus;

            return {
              id: profile.id,
              user_id: profile.id,
              username: profile.username || profile.full_name || 'Anonymous',
              total_score: totalScore,
              accuracy,
              total_questions: stats.totalQuestions,
              correct_answers: stats.correctAnswers
            };
          }) || [];

        // Sort by total score and return top 5
        return leaderboardEntries
          .sort((a, b) => b.total_score - a.total_score)
          .slice(0, 5);
      } catch (error) {
        console.error('Error in leaderboard preview query:', error);
        return [];
      }
    }
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2:
        return <Medal className="w-4 h-4 text-gray-400" />;
      case 3:
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <Trophy className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-white to-purple-50/50 dark:from-gray-800 dark:to-purple-900/20 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-gray-900 dark:text-white">
            <Trophy className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Top Students</span>
          </CardTitle>
          <Link to="/leaderboard">
            <Button variant="ghost" size="sm" className="text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30">
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
                <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-12"></div>
              </div>
            ))}
          </div>
        ) : topUsers.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">No data available yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-xs">Start practicing to see rankings!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topUsers.map((user, index) => (
              <div 
                key={user.id}
                className="flex items-center space-x-3 p-2 rounded-lg bg-white/60 dark:bg-gray-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all duration-200"
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    {getRankIcon(index + 1)}
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.accuracy}% • {user.total_questions} questions
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
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
