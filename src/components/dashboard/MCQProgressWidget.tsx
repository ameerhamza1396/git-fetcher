import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Clock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

// Defines the shape of the saved session per Subject/Chapter in localStorage
export interface SavedMCQSession {
  subjectId: string;
  chapterId: string;
  lastIndex: number;
  timestamp: string; // ISO string 
}

const GET_SAVED_SESSIONS = async (userId: string): Promise<SavedMCQSession[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('in_progress_mcqs')
      .eq('id', userId)
      .single();
    
    if (error || !data?.in_progress_mcqs) {
      // Fallback to local storage if not found in db
      const localData = localStorage.getItem('mcq_saved_sessions');
      return localData ? JSON.parse(localData) : [];
    }
    
    return data.in_progress_mcqs as unknown as SavedMCQSession[];
  } catch (e) {
    const localData = localStorage.getItem('mcq_saved_sessions');
    return localData ? JSON.parse(localData) : [];
  }
};

const DonutChart3D = ({ percentage, colorClass, gradientId }: { percentage: number, colorClass: string, gradientId: string }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
      {/* 3D Drop Shadow behind the SVG */}
      <div className={`absolute inset-0 rounded-full blur-md opacity-40 ${colorClass.split(" ")[0]} translate-y-2`} />
      
      <svg className="w-full h-full transform -rotate-90 relative z-10 filter drop-shadow-xl" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" className="stop-color-primary" stopColor="currentColor" />
            <stop offset="100%" className="stop-color-secondary" stopColor="white" stopOpacity="0.2" />
          </linearGradient>
          {/* Inner shadow filter for 3D effect */}
          <filter id="inner-shadow">
            <feOffset dx="0" dy="2"/>
            <feGaussianBlur stdDeviation="2" result="offset-blur"/>
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
            <feFlood floodColor="black" floodOpacity="0.4" result="color"/>
            <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
            <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
          </filter>
        </defs>
        
        {/* Background Track */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          className="stroke-muted/30"
          strokeWidth="12"
        />
        
        {/* Progress Arc */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          className={colorClass}
          strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          filter="url(#inner-shadow)"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-lg font-black text-foreground drop-shadow-sm leading-none">{Math.round(percentage)}%</span>
      </div>
    </div>
  );
};

export const MCQProgressWidget = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SavedMCQSession[]>([]);
  const { data: userData } = useQuery({
    queryKey: ['userAuthSession'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    }
  });

  useEffect(() => {
    if (userData?.id) {
      GET_SAVED_SESSIONS(userData.id).then(setSessions);
    } else {
      // If not logged in yet, try local storage
      const localData = localStorage.getItem('mcq_saved_sessions');
      setSessions(localData ? JSON.parse(localData) : []);
    }
  }, [userData?.id]);

  const { data: chaptersData, isLoading } = useQuery({
    queryKey: ['mcq-progress-chapters', sessions.map(s => s.chapterId)],
    queryFn: async () => {
      if (sessions.length === 0) return [];
      
      const chapterIds = sessions.map(s => s.chapterId);
      const subjectIds = sessions.map(s => s.subjectId);

      // Fetch chapter details for names and counts
      const { data: chapters, error: chError } = await supabase
        .from('chapters')
        .select('id, name, subject_id, mcqs(count)')
        .in('id', chapterIds);

      // Fetch subject details for names
      const { data: subjects, error: subError } = await supabase
        .from('subjects')
        .select('id, name, color')
        .in('id', subjectIds);

      if (chError || subError) return [];

      return sessions.map(session => {
        const chapter = chapters?.find(c => c.id === session.chapterId);
        const subject = subjects?.find(s => s.id === session.subjectId);
        const totalMCQs = chapter?.mcqs?.[0]?.count || 1; // Prevent div by 0
        const percentage = Math.min((session.lastIndex / totalMCQs) * 100, 100);

        return {
          ...session,
          chapterName: chapter?.name || 'Unknown Chapter',
          subjectName: subject?.name || 'Unknown Subject',
          subjectColor: subject?.color || 'bg-primary',
          totalMCQs,
          percentage
        };
      }).filter(s => s.percentage < 100); // Only show incomplete ones
    },
    enabled: sessions.length > 0
  });

  if (isLoading || !chaptersData || chaptersData.length === 0) return null;

  const handleResume = (session: SavedMCQSession) => {
    navigate('/mcqs', { 
      state: { 
        autoResume: true, 
        resumeData: { subjectId: session.subjectId, chapterId: session.chapterId } 
      } 
    });
  };

  const gradients = [
    { text: 'text-rose-500 stroke-rose-500', bg: 'from-rose-500/10 to-pink-500/5', icon: 'text-rose-500' },
    { text: 'text-blue-500 stroke-blue-500', bg: 'from-blue-500/10 to-indigo-500/5', icon: 'text-blue-500' },
    { text: 'text-emerald-500 stroke-emerald-500', bg: 'from-emerald-500/10 to-teal-500/5', icon: 'text-emerald-500' },
    { text: 'text-amber-500 stroke-amber-500', bg: 'from-amber-500/10 to-orange-500/5', icon: 'text-amber-500' },
    { text: 'text-violet-500 stroke-violet-500', bg: 'from-violet-500/10 to-purple-500/5', icon: 'text-violet-500' },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-orange-500" />
        <h2 className="text-sm font-bold text-foreground">Pick up where you left off</h2>
      </div>
      
      {/* Horizontally scrollable container */}
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-5 px-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {chaptersData.map((item, index) => {
          const visualStyle = gradients[index % gradients.length];
          const timeAgo = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Recently';

          return (
            <motion.div
              key={`${item.subjectId}-${item.chapterId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleResume(item)}
              className={`relative flex items-center justify-between gap-4 p-4 rounded-[1.8rem] bg-gradient-to-br ${visualStyle.bg} border border-border/40 backdrop-blur-md shadow-lg shrink-0 w-[280px] snap-center cursor-pointer active:scale-[0.98] transition-transform`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${visualStyle.icon} mb-1.5 line-clamp-1`}>
                  {item.subjectName}
                </p>
                <h3 className="text-sm font-black text-foreground line-clamp-2 leading-tight mb-2">
                  {item.chapterName}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground bg-background/50 px-2 py-0.5 rounded-full">
                    {item.lastIndex} / {item.totalMCQs} completed
                  </span>
                </div>
              </div>

              <div className="relative">
                <DonutChart3D 
                  percentage={item.percentage} 
                  colorClass={visualStyle.text}
                  gradientId={`grad-${index}`} 
                />
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg`}>
                  <Play className={`w-3 h-3 ${visualStyle.icon} ml-0.5`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
