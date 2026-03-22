import React, { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimerProps {
  initialSeconds?: number;
  onTimeUp?: () => void;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({ 
  initialSeconds = 300, 
  onTimeUp,
  className 
}) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      onTimeUp?.();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, onTimeUp]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(initialSeconds);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const percentage = (timeLeft / initialSeconds) * 100;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl bg-black/20 backdrop-blur-md border border-white/10 p-4 transition-all duration-300",
      timeLeft < 30 && timeLeft > 0 && "ring-2 ring-red-500/50 animate-pulse",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-white/70">
          <TimerIcon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Station Timer</span>
        </div>
        <div className="text-2xl font-mono font-black text-white tabular-nums drop-shadow-lg">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mb-4">
        <div 
          className={cn(
            "h-full transition-all duration-1000 ease-linear",
            timeLeft < 60 ? "bg-red-500" : "bg-gradient-to-r from-cyan-400 to-primary"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTimer}
          className="flex-1 bg-white/5 hover:bg-white/10 text-white border-white/5 h-10 rounded-xl transition-all active:scale-95"
        >
          {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
          {isActive ? "Pause" : "Start"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetTimer}
          className="bg-white/5 hover:bg-white/10 text-white border-white/5 h-10 w-10 p-0 rounded-xl transition-all active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
