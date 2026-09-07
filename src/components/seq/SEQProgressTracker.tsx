import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatStrip } from '@/components/selection/StatStrip';

interface SEQProgressTrackerProps {
  userId?: string;
}

export const SEQProgressTracker = ({ userId }: SEQProgressTrackerProps) => {
  const { data: answers } = useQuery({
    queryKey: ['user-seq-answers-progress', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_seq_answers')
        .select('is_correct, satisfaction_index, time_taken, created_at')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const totalSEQsAttempted = answers?.length || 0;
  const totalCorrect = answers?.filter(a => a.is_correct).length || 0;
  const overallAccuracy = totalSEQsAttempted > 0 ? Math.round((totalCorrect / totalSEQsAttempted) * 100) : 0;

  const satisfactionArr = answers?.filter(a => a.satisfaction_index != null).map(a => a.satisfaction_index) || [];
  const avgSatisfaction = satisfactionArr.length > 0
    ? Math.round(satisfactionArr.reduce((s, t) => s + t, 0) / satisfactionArr.length)
    : 0;

  return (
    <StatStrip
      accent="amber"
      items={[
        { value: totalSEQsAttempted, label: 'Attempted' },
        { value: `${avgSatisfaction}%`, label: 'Satisfaction' },
        { value: totalCorrect, label: 'Correct' },
        { value: `${overallAccuracy}%`, label: 'Accuracy' },
      ]}
    />
  );
};
