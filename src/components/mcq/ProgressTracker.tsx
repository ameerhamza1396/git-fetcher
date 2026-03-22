
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, Trophy, TrendingUp, Flame, Clock, Bookmark } from 'lucide-react';

interface ProgressTrackerProps {
  userId?: string;
}

export const ProgressTracker = ({ userId }: ProgressTrackerProps) => {
  const { data: answers } = useQuery({
    queryKey: ['user-answers-progress', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_answers')
        .select('is_correct, time_taken, created_at')
        .eq('user_id', userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  const { data: savedCount } = useQuery({
    queryKey: ['saved-mcqs-count', userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { count, error } = await supabase
        .from('saved_mcqs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId
  });

  const totalQuestions = answers?.length || 0;
  const totalCorrect = answers?.filter(a => a.is_correct).length || 0;
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Average time
  const timeTakenArr = answers?.filter(a => a.time_taken != null).map(a => a.time_taken) || [];
  const avgTime = timeTakenArr.length > 0 ? Math.round(timeTakenArr.reduce((s, t) => s + t, 0) / timeTakenArr.length) : 0;

  // Best streak
  let bestStreak = 0;
  let currentStreak = 0;
  if (answers) {
    const sorted = [...answers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const a of sorted) {
      if (a.is_correct) { currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
      else { currentStreak = 0; }
    }
  }

  const stats = [
    { label: 'Total Practice', value: totalQuestions, icon: Target, gradient: 'from-blue-600 via-indigo-600 to-violet-700', glow: 'bg-blue-400' },
    { label: 'Accuracy', value: `${overallAccuracy}%`, icon: TrendingUp, gradient: 'from-emerald-600 via-teal-600 to-cyan-700', glow: 'bg-emerald-400' },
    { label: 'Saved MCQs', value: savedCount || 0, icon: Bookmark, gradient: 'from-orange-500 via-red-500 to-rose-600', glow: 'bg-orange-400' },
    { label: 'Avg Time', value: `${avgTime}s`, icon: Clock, gradient: 'from-rose-600 via-pink-600 to-fuchsia-700', glow: 'bg-rose-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${stat.gradient} text-white shadow-xl p-1`}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
          }} />
          <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.3rem] p-3 sm:p-4 border border-white/10 text-center">
            <div className="flex justify-center mb-2">
              <div className="relative">
                <div className={`absolute inset-0 ${stat.glow} blur-lg opacity-40 rounded-full`} />
                <div className="relative bg-white/15 p-2 rounded-xl backdrop-blur-md border border-white/20">
                  <stat.icon className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black">{stat.value}</div>
            <div className="text-white/50 text-[10px] uppercase tracking-widest font-bold mt-1">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
