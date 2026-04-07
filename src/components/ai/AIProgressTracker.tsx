import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Target, TrendingUp, Flame, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AIProgressTrackerProps {
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

export const AIProgressTracker = ({ userId }: AIProgressTrackerProps) => {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['ai-test-progress', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('ai_test_user_stats_view')
        .select('total_tests, total_questions, total_correct, avg_accuracy, last_test')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) {
        console.error('AI Progress query error:', error);
        return null;
      }
      return data;
    },
    enabled: !!userId
  });

  const stats = [
    { 
      label: 'Tests Taken', 
      value: statsData?.total_tests || 0, 
      icon: Target, 
      gradient: 'from-amber-500 via-yellow-500 to-orange-600', 
      glow: 'bg-amber-400' 
    },
    { 
      label: 'Accuracy', 
      value: Math.round(statsData?.avg_accuracy || 0), 
      suffix: '%', 
      icon: TrendingUp, 
      gradient: 'from-emerald-500 via-teal-500 to-cyan-600', 
      glow: 'bg-emerald-400' 
    },
    { 
      label: 'Streak', 
      value: 0, 
      suffix: ' days', 
      icon: Flame, 
      gradient: 'from-orange-500 via-red-500 to-rose-600', 
      glow: 'bg-orange-400' 
    },
    { 
      label: 'Questions', 
      value: statsData?.total_questions || 0, 
      icon: Zap, 
      gradient: 'from-violet-500 via-purple-500 to-fuchsia-600', 
      glow: 'bg-violet-400' 
    },
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
              {isLoading ? (
                <div className="h-8 w-16 bg-white/20 rounded animate-pulse mx-auto" />
              ) : (
                <CountUpNumber target={stat.value} suffix={stat.suffix} />
              )}
            </div>
            <div className="text-white/50 text-[10px] uppercase tracking-widest font-bold mt-1">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
};