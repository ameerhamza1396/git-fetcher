// src/components/mcq/SubjectSelectionScreen.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react'; // Loader2 for fallback, but skeleton is primary
import { fetchSubjects, Subject } from '@/utils/mcqData';

interface SubjectSelectionScreenProps {
  onSubjectSelect: (subject: Subject) => void;
}

// Skeleton Card Component for loading state (reused/adapted from ChapterSelectionScreen)
const SubjectCardSkeleton = () => (
  <Card className="border-2 h-full animate-pulse overflow-hidden relative
                   border-gray-200 dark:border-gray-800
                   bg-gray-100 dark:bg-gray-900">
    {/* Shimmer Effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/30 to-transparent dark:via-gray-700/30
                    animate-shimmer"
         style={{ animationDuration: '1.5s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}></div>

    <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-center h-full"> {/* Added flex-col, items-center, justify-center, h-full */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 bg-gray-200 dark:bg-gray-700">
        {/* Placeholder for icon */}
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div> {/* Placeholder for title */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1"></div> {/* Placeholder for description line 1 */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div> {/* Placeholder for description line 2 */}
    </CardHeader>
    {/* No CardContent in original, so keeping it out for skeleton to match */}
  </Card>
);

export const SubjectSelectionScreen = ({ onSubjectSelect }: SubjectSelectionScreenProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);
      const data = await fetchSubjects();
      setSubjects(data);
      setLoading(false);
    };

    loadSubjects();
  }, []);

  const handleContinue = () => {
    if (selectedSubject) {
      onSubjectSelect(selectedSubject);
    }
  };

  // Define a number of skeleton cards to display while loading
  const numberOfSkeletons = 3; // Display 3 placeholder cards, matching the lg:grid-cols-3 layout

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-0">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
          Choose Your Subject
        </h1>
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 px-4 sm:px-0">
          Select the MDCAT subject you want to practice
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {loading ? (
          // Render skeleton loaders if loading
          Array.from({ length: numberOfSkeletons }).map((_, index) => (
            <SubjectCardSkeleton key={index} />
          ))
        ) : (
          // Render actual subjects once loaded
          subjects.map((subject, index) => (
            <motion.div
              key={subject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 h-full flex flex-col
                  ${selectedSubject?.id === subject.id
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                    : 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700'
                  } bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 backdrop-blur-sm`}
                onClick={() => setSelectedSubject(subject)}
              >
                <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6 flex-grow flex flex-col items-center justify-center"> {/* Added flex-grow, flex-col, items-center, justify-center */}
                  <div
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto flex items-center justify-center text-xl sm:text-2xl mb-3 sm:mb-4 bg-white/50 dark:bg-gray-800/50"
                    style={{ backgroundColor: subject.color ? `${subject.color}20` : '#9333ea20' }}
                  >
                    {subject.icon || '📚'}
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-white">
                    {subject.name}
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-2"> {/* Added mt-2 for spacing */}
                    {subject.description}
                  </CardDescription>
                </CardHeader>
                {/* No CardContent in the original, so it's omitted here */}
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {selectedSubject && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center px-4 sm:px-0"
        >
          <Button
            onClick={handleContinue}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg hover:scale-105 transition-all duration-300 w-full sm:w-auto"
            size="lg"
          >
            Continue with {selectedSubject.name}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};