
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Target, TrendingUp } from 'lucide-react';

interface ProgressTrackerProps {
  userId?: string;
}

export const ProgressTracker = ({ userId }: ProgressTrackerProps) => {
  const { data: progress } = useQuery({
    queryKey: ['user-progress', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const totalQuestions = progress?.reduce((sum, p) => sum + (p.total_questions || 0), 0) || 0;
  const totalCorrect = progress?.reduce((sum, p) => sum + (p.correct_answers || 0), 0) || 0;
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-blue-100/70 via-blue-50/50 to-purple-50/30 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-purple-900/10 border-blue-200 dark:border-blue-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Total Questions
          </CardTitle>
          <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {totalQuestions}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-100/70 via-green-50/50 to-blue-50/30 dark:from-green-900/30 dark:via-green-800/20 dark:to-blue-900/10 border-green-200 dark:border-green-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Correct Answers
          </CardTitle>
          <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {totalCorrect}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-900 dark:text-white">
            Accuracy Rate
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {overallAccuracy}%
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
