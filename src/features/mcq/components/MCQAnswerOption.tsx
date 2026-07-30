import { memo } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type AnswerState = 'default' | 'selected' | 'correct' | 'incorrect';

type MCQAnswerOptionProps = {
  option: string;
  index: number;
  state: AnswerState;
  disabled: boolean;
  explanation?: {
    verdict: string;
    explanation: string;
  };
  isExplaining: boolean;
  onSelect: (answer: string) => void;
};

const getThemeClasses = (state: AnswerState) => {
  if (state === 'correct') {
    return 'bg-emerald-50/95 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100';
  }
  if (state === 'incorrect') {
    return 'bg-red-50/95 dark:bg-red-950/35 border-red-300 dark:border-red-800 text-red-900 dark:text-red-100';
  }
  if (state === 'selected') {
    return 'bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/15';
  }
  return 'bg-card/90 border-border/65 text-foreground hover:border-primary/35 hover:bg-primary/[0.035]';
};

export const MCQAnswerOption = memo(function MCQAnswerOption({
  option,
  index,
  state,
  disabled,
  explanation,
  isExplaining,
  onSelect,
}: MCQAnswerOptionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(option)}
        disabled={disabled}
        className={`flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-left shadow-sm transition-[background-color,border-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:brightness-95 sm:min-h-16 sm:px-4 ${getThemeClasses(state)}`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
            state === 'default'
              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800'
              : state === 'correct'
                ? 'bg-emerald-500 text-white'
                : state === 'incorrect'
                  ? 'bg-red-500 text-white'
                  : 'bg-primary text-white'
          }`}
        >
          {String.fromCharCode(65 + index)}
        </span>
        <span className="flex-1 text-[0.95rem] font-semibold leading-[1.55] tracking-[-0.005em] sm:text-base sm:leading-relaxed">{option}</span>
        {disabled && (state === 'correct' || state === 'incorrect') && (
          state === 'correct'
            ? <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            : <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        )}
      </button>

      {disabled && explanation?.explanation && (
        <div
          className={`mx-2 mb-2 mt-2 rounded-xl border p-3.5 text-sm font-medium leading-6 ${
            explanation.verdict === 'correct'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
          }`}
        >
          <span className="font-black">
            {explanation.verdict === 'correct' ? 'Supported: ' : 'Why wrong: '}
          </span>
          {explanation.explanation}
        </div>
      )}

      {disabled && isExplaining && !explanation?.explanation && (
        <div className="mx-2 mb-2 mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-3 w-16 rounded-full" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-8/12" />
        </div>
      )}
    </div>
  );
});
