
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, Trophy, TrendingUp, Flame, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ProgressTrackerProps {
  userId?: string;
}

const CountUpNumber = ({ target, suffix = '', duration = 1000 }: { target: number; suffix?: string; duration?: number }) => {
  const [count, setCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    setCount(0);
    setIsAnimating(true);
    const startTime = Date.now();
    const startValue = 0;
    const endValue = target;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * easeOut);
      setCount(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration]);

  if (isAnimating) {
    return (
      <div className="h-8 w-16 bg-white/20 rounded animate-pulse mx-auto" />
    );
  }

  return <>{count}{suffix}</>;
};

export const ProgressTracker = ({ userId }: ProgressTrackerProps) => {
  const { data: answers, isLoading } = useQuery({
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

  const totalQuestions = answers?.length || 0;
  const totalCorrect = answers?.filter(a => a.is_correct).length || 0;
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  // Average time
  const timeTakenArr = answers?.filter(a => a.time_taken != null).map(a => a.time_taken) || [];
  const avgTime = timeTakenArr.length > 0 ? Math.round(timeTakenArr.reduce((s, t) => s + t, 0) / timeTakenArr.length) : 0;

  // Calculate current streak (consecutive days with MCQ practice)
  const calculateCurrentStreak = (answersData: any[]) => {
    if (!answersData || answersData.length === 0) return 0;
    
    const answerDates = [...new Set(answersData.map(a => {
      const date = new Date(a.created_at);
      return date.toLocaleDateString("en-US", { timeZone: "Asia/Karachi" });
    }))];

    if (answerDates.length === 0) return 0;

    const today = new Date();
    const todayPKT = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Karachi" }));
    todayPKT.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(todayPKT);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateObjects = answerDates.map(d => {
      const [month, day, year] = d.split('/');
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }).sort((a, b) => b.getTime() - a.getTime());

    const mostRecent = dateObjects[0];
    const isToday = mostRecent.getTime() === todayPKT.getTime();
    const isYesterday = mostRecent.getTime() === yesterday.getTime();

    if (!isToday && !isYesterday) return 0;

    let streak = 1;
    let currentDate = new Date(mostRecent);

    for (let i = 1; i < dateObjects.length; i++) {
      const prevDate = new Date(dateObjects[i]);
      const expectedPrevDate = new Date(currentDate);
      expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);

      if (prevDate.getTime() === expectedPrevDate.getTime()) {
        streak++;
        currentDate = prevDate;
      } else {
        break;
      }
    }

    return streak;
  };

  const currentStreak = calculateCurrentStreak(answers || []);

  const stats = [
    { label: 'Total Practice', value: totalQuestions, icon: Target, gradient: 'from-blue-600 via-indigo-600 to-violet-700', glow: 'bg-blue-400' },
    { label: 'Accuracy', value: overallAccuracy, suffix: '%', icon: TrendingUp, gradient: 'from-emerald-600 via-teal-600 to-cyan-700', glow: 'bg-emerald-400' },
    { label: 'Current Streak', value: currentStreak, suffix: ' days', icon: Flame, gradient: 'from-orange-500 via-red-500 to-rose-600', glow: 'bg-orange-400' },
    { label: 'Avg Time', value: avgTime, suffix: 's', icon: Clock, gradient: 'from-rose-600 via-pink-600 to-fuchsia-700', glow: 'bg-rose-400' },
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
            <div className="text-xl sm:text-2xl font-black">
              <CountUpNumber target={stat.value} suffix={stat.suffix} />
            </div>
            <div className="text-white/50 text-[10px] uppercase tracking-widest font-bold mt-1">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
