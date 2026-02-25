import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Play, Clock, Zap } from 'lucide-react';
import { TimerSettings } from './TimerSettings';
import { Subject, Chapter } from '@/utils/mcqData';

interface QuizSettingsScreenProps {
  subject: Subject;
  chapter: Chapter;
  onStartQuiz: (timerEnabled: boolean, timePerQuestion: number) => void;
  onBack: () => void;
}

export const QuizSettingsScreen = ({ subject, chapter, onStartQuiz, onBack }: QuizSettingsScreenProps) => {
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timePerQuestion, setTimePerQuestion] = useState(30);

  const handleStartQuiz = () => {
    onStartQuiz(timerEnabled, timePerQuestion);
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase italic">
          Quiz <span className="text-primary">Settings</span>
        </h2>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">
          Configure your practice session
        </p>
      </div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white shadow-2xl p-1">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
          }} />
          <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 mb-4">Quiz Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Subject</p>
                <p className="text-white font-bold text-sm mt-1">{subject.name}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Chapter</p>
                <p className="text-white font-bold text-sm mt-1">{chapter.name}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Test #</p>
                <p className="text-white font-bold text-sm mt-1">{chapter.chapter_number}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Timer Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <TimerSettings
          timerEnabled={timerEnabled}
          timePerQuestion={timePerQuestion}
          onTimerToggle={setTimerEnabled}
          onTimeChange={setTimePerQuestion}
        />
      </motion.div>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <Button
          onClick={handleStartQuiz}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.01] transition-all rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl"
          size="lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Start Quiz
          {timerEnabled && (
            <span className="ml-2 opacity-75">({timePerQuestion}s per Q)</span>
          )}
        </Button>
      </motion.div>
    </div>
  );
};
