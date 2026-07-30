type AccuracyDonutProps = {
  value?: number;
  solved?: number;
};

export function AccuracyDonut({ value = 0, solved = 0 }: AccuracyDonutProps) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;

  return (
    <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-background/95 py-1 pl-1 pr-2 shadow-lg shadow-primary/10 backdrop-blur-xl">
      <div className="relative h-10 w-10 shrink-0">
        <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90" aria-hidden="true">
          <circle cx="20" cy="20" r={radius} className="fill-none stroke-primary/15" strokeWidth="4" />
          <circle
            cx="20"
            cy="20"
            r={radius}
            className="fill-none stroke-primary transition-[stroke-dashoffset] duration-300 ease-out"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary">
          {safeValue}%
        </span>
      </div>
      <div className="min-w-0 leading-none">
        <p className="text-[10px] font-black uppercase tracking-wide text-foreground">Accuracy</p>
        <p className="text-[9px] font-semibold text-muted-foreground">{solved} solved</p>
      </div>
    </div>
  );
}
