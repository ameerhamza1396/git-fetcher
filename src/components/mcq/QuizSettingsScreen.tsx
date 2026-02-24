import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-2 sm:px-0 pb-24">
      <div className="text-center mb-6 sm:mb-8">
        <img src="/images/mascots/doctor-clipboard.png" alt="Quiz settings" className="w-24 h-24 mx-auto mb-4 object-contain drop-shadow-lg" />
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
          Quiz Settings
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mb-2 px-4 sm:px-0">
          {subject.name} - {chapter.name}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground px-4 sm:px-0">
          Configure your practice session preferences
        </p>
      </div>

      {/* Quiz Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <Card className="bg-card/80 backdrop-blur-sm border-border">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-base sm:text-lg text-foreground">Quiz Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Subject</h3>
                <p className="text-primary text-sm sm:text-base">{subject.name}</p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Chapter</h3>
                <p className="text-primary text-sm sm:text-base">{chapter.name}</p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-foreground text-sm sm:text-base">Chapter Number</h3>
                <p className="text-primary text-sm sm:text-base">Chapter {chapter.chapter_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Timer Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 sm:mb-8"
      >
        <TimerSettings
          timerEnabled={timerEnabled}
          timePerQuestion={timePerQuestion}
          onTimerToggle={setTimerEnabled}
          onTimeChange={setTimePerQuestion}
        />
      </motion.div>

      {/* Fixed bottom start button */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <Button
          onClick={handleStartQuiz}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg hover:scale-[1.01] transition-all duration-300"
          size="lg"
        >
          <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Start Quiz
          {timerEnabled && (
            <span className="ml-2 text-xs sm:text-sm opacity-75">
              ({timePerQuestion}s per question)
            </span>
          )}
        </Button>
      </motion.div>
    </div>
  );
};
