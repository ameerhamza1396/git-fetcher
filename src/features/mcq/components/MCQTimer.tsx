import { memo, useEffect, useRef, useState } from 'react';

type MCQTimerProps = {
  seconds: number;
  paused: boolean;
  onTimeUp: () => void;
};

export const MCQTimer = memo(function MCQTimer({
  seconds,
  paused,
  onTimeUp,
}: MCQTimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const onTimeUpRef = useRef(onTimeUp);

  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (paused) return;

    const intervalId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          queueMicrotask(() => onTimeUpRef.current());
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [paused]);

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
        timeLeft <= 5
          ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-primary/10 text-primary'
      }`}
      aria-live={timeLeft <= 5 ? 'polite' : 'off'}
    >
      {timeLeft}s
    </span>
  );
});
