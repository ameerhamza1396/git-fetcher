import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Clock, Zap, Timer, CheckCircle, ArrowRight } from 'lucide-react';
import { Subject, Chapter } from '@/utils/mcqData';

interface QuizSettingsScreenProps {
  subject: Subject;
  chapter: Chapter;
  onStartQuiz: (timerEnabled: boolean, timePerQuestion: number) => void;
  onBack: () => void;
}

interface TimerPreset {
  value: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  description: string;
  accentColor: string;
  bgClass: string;
}

const timerPresets: TimerPreset[] = [
  {
    value: 0,
    label: 'No Timer',
    sublabel: 'Relaxed',
    icon: <CheckCircle className="w-5 h-5" />,
    description: 'Study at your own pace. No time pressure.',
    accentColor: 'text-slate-500',
    bgClass: 'bg-slate-500',
  },
  {
    value: 15,
    label: '15 sec',
    sublabel: 'Rapid Fire',
    icon: <Timer className="w-5 h-5" />,
    description: 'Quick recall. Ideal for high-yield facts.',
    accentColor: 'text-emerald-500',
    bgClass: 'bg-emerald-500',
  },
  {
    value: 30,
    label: '30 sec',
    sublabel: 'Focused',
    icon: <Timer className="w-5 h-5" />,
    description: 'Standard MDCAT exam timing per question.',
    accentColor: 'text-blue-500',
    bgClass: 'bg-blue-500',
  },
  {
    value: 45,
    label: '45 sec',
    sublabel: 'Balanced',
    icon: <Timer className="w-5 h-5" />,
    description: 'Comfortable pace with mild pressure.',
    accentColor: 'text-indigo-500',
    bgClass: 'bg-indigo-500',
  },
  {
    value: 60,
    label: '60 sec',
    sublabel: 'Deliberate',
    icon: <Timer className="w-5 h-5" />,
    description: 'Think carefully before selecting an answer.',
    accentColor: 'text-purple-500',
    bgClass: 'bg-purple-500',
  },
  {
    value: 90,
    label: '90 sec',
    sublabel: 'Extended',
    icon: <Timer className="w-5 h-5" />,
    description: 'Complex scenario-based questions.',
    accentColor: 'text-rose-500',
    bgClass: 'bg-rose-500',
  },
  {
    value: 120,
    label: '120 sec',
    sublabel: 'In-Depth',
    icon: <Timer className="w-5 h-5" />,
    description: 'Maximum time for complex case analysis.',
    accentColor: 'text-amber-500',
    bgClass: 'bg-amber-500',
  },
];

export const QuizSettingsScreen = ({ subject, chapter, onStartQuiz }: QuizSettingsScreenProps) => {
  const [timePerQuestion, setTimePerQuestion] = useState(0);

  const selectedPreset = timerPresets.find(p => p.value === timePerQuestion) ?? timerPresets[0];

  const handleStartQuiz = () => {
    onStartQuiz(timePerQuestion > 0, timePerQuestion);
  };

  return (
    <div>
      {/* Header — same pattern as Subject/Chapter screens */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 px-4"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block">Step 3 of 3</span>
      </motion.div>
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <div className="pt-4 pb-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none text-center">
              Quiz <span className="live-gradient-text">Settings</span>
            </h2>
            <div className="mt-2 flex flex-col items-center gap-1">
              <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">
                {subject.name} • Chapter {chapter.chapter_number}
              </p>
              <p className="text-muted-foreground/60 text-[10px] font-medium uppercase tracking-[0.2em]">
                Configure your practice session
              </p>
            </div>
          </div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0">
      {/* Session summary card — same card pattern as sister screens */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-primary/5 p-5 mb-8"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/30 text-2xl">
            {subject.icon || <Zap className="w-7 h-7" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">Ready to Start</p>
            <h3 className="text-xl font-black uppercase italic tracking-tight text-foreground">{subject.name}</h3>
            <p className="text-muted-foreground text-xs font-medium truncate">
              Chapter {chapter.chapter_number} — {chapter.name}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </motion.div>

      {/* Section header — same style as sister screens */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-5"
      >
        <Clock className="w-4 h-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Timer Per Question</p>
      </motion.div>

      {/* Timer cards grid — same card pattern as subject/chapter cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {timerPresets.map((preset, idx) => {
          const isSelected = preset.value === timePerQuestion;
          return (
            <motion.div
              key={preset.value}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + idx * 0.04 }}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setTimePerQuestion(preset.value)}
              className={`group cursor-pointer relative overflow-hidden rounded-2xl border-2 p-4 transition-all duration-300 ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                  : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-primary/30 hover:bg-primary/5'
              }`}
            >
              {/* Selected glow — same as subject cards */}
              {isSelected && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/20 blur-[50px] -mr-12 -mt-12 pointer-events-none" />
              )}

              <div className="flex items-center gap-4 relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : 'bg-muted/50 text-foreground/70'
                }`}>
                  {preset.value === 0
                    ? <CheckCircle className="w-5 h-5" />
                    : <Timer className="w-5 h-5" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`text-sm font-black uppercase italic tracking-tight transition-colors ${
                      isSelected ? 'text-primary' : 'text-foreground'
                    }`}>
                      {preset.label}
                    </h3>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs font-medium leading-relaxed line-clamp-1">
                    {preset.description}
                  </p>
                </div>

                <div className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  isSelected
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 text-muted-foreground/60 opacity-0 group-hover:opacity-100'
                }`}>
                  {preset.sublabel}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Active timer summary pill */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPreset.value}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="flex items-center justify-center gap-3 py-3 px-5 rounded-2xl bg-muted/30 border border-border/40 mb-2"
        >
          <div className={`w-2 h-2 rounded-full ${selectedPreset.bgClass} ${selectedPreset.value > 0 ? 'animate-pulse' : ''}`} />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            {selectedPreset.value === 0
              ? 'No time limit — study at your own pace'
              : `${selectedPreset.value}s per question — ${selectedPreset.sublabel} mode`
            }
          </p>
        </motion.div>
      </AnimatePresence>

      {/* CTA — same fixed-bottom pattern as sister screens */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
      >
        <div className="w-full max-w-md pointer-events-auto">
          <Button
            onClick={handleStartQuiz}
            className="w-full bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Quiz
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="ml-2"
            >
              <ArrowRight className="w-5 h-5" />
            </motion.div>
          </Button>
        </div>
      </motion.div>

      <div className="text-center pt-20 pb-10 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • MCQ Practice System</p>
      </div>
      </div>
    </div>
  );
};
