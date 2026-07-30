import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

type LoaderTimeoutMessageProps = {
  timeoutMs?: number;
  variant?: 'dark' | 'light';
};

export const useLoaderTimeout = (timeoutMs = 15000) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setTimedOut(true), timeoutMs);
    return () => window.clearTimeout(timeoutId);
  }, [timeoutMs]);

  return timedOut;
};

const LoaderTimeoutMessage = ({
  timeoutMs = 15000,
  variant = 'light',
}: LoaderTimeoutMessageProps) => {
  const timedOut = useLoaderTimeout(timeoutMs);

  if (!timedOut) return null;

  const isDark = variant === 'dark';

  return (
    <div
      role="alert"
      className={[
        'mt-6 max-w-sm rounded-2xl border px-5 py-4 text-center shadow-lg',
        isDark
          ? 'border-white/15 bg-white/10 text-white backdrop-blur-md'
          : 'border-border bg-card text-card-foreground',
      ].join(' ')}
    >
      <p className="text-sm font-bold">Server timeout</p>
      <p className={`mt-1 text-xs leading-relaxed ${isDark ? 'text-cyan-50/75' : 'text-muted-foreground'}`}>
        Check your connection and try again, or contact us at{' '}
        <a className="font-semibold underline underline-offset-2" href="mailto:hi@medmacs.app">
          hi@medmacs.app
        </a>
        .
      </p>
      <Button
        type="button"
        variant={isDark ? 'secondary' : 'default'}
        size="sm"
        className="mt-4"
        onClick={() => window.location.reload()}
      >
        Try again
      </Button>
    </div>
  );
};

export default LoaderTimeoutMessage;
