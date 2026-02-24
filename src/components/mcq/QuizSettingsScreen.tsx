
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Play } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      <Button 
        variant="outline" 
        onClick={onBack}
        className="mb-4 sm:mb-6 flex items-center space-x-2 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-sm sm:text-base"
      >
        <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
        <span>Back to Chapters</span>
      </Button>

      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Quiz Settings
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-2 px-4 sm:px-0">
          {subject.name} - {chapter.name}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 px-4 sm:px-0">
          Configure your practice session preferences
        </p>
      </div>

      {/* Quiz Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 sm:mb-8"
      >
        <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-white">Quiz Summary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Subject</h3>
                <p className="text-purple-600 dark:text-purple-400 text-sm sm:text-base">{subject.name}</p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Chapter</h3>
                <p className="text-purple-600 dark:text-purple-400 text-sm sm:text-base">{chapter.name}</p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Chapter Number</h3>
                <p className="text-purple-600 dark:text-purple-400 text-sm sm:text-base">Chapter {chapter.chapter_number}</p>
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

      {/* Start Quiz Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center px-4 sm:px-0"
      >
        <Button
          onClick={handleStartQuiz}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg hover:scale-105 transition-all duration-300 w-full sm:w-auto"
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
