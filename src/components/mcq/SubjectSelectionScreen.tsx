import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { fetchSubjects, Subject } from '@/utils/mcqData';

interface SubjectSelectionScreenProps {
  onSubjectSelect: (subject: Subject) => void;
}

const SubjectCardSkeleton = () => (
  <Card className="border-2 h-full animate-pulse overflow-hidden relative border-border bg-muted/50">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent animate-shimmer"
      style={{ animationDuration: '1.5s', animationIterationCount: 'infinite', animationTimingFunction: 'linear' }}></div>
    <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6 flex flex-col items-center justify-center h-full">
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-3 sm:mb-4 bg-muted"></div>
      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
      <div className="h-3 bg-muted rounded w-full mb-1"></div>
      <div className="h-3 bg-muted rounded w-5/6"></div>
    </CardHeader>
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
    if (selectedSubject) onSubjectSelect(selectedSubject);
  };

  const numberOfSkeletons = 3;

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-0 pb-24">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">
          Choose Your Subject
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground px-4 sm:px-0">
          Select the subject you want to practice
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {loading ? (
          Array.from({ length: numberOfSkeletons }).map((_, index) => (
            <SubjectCardSkeleton key={index} />
          ))
        ) : (
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
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                  } bg-card/80 backdrop-blur-sm`}
                onClick={() => setSelectedSubject(subject)}
              >
                <CardHeader className="text-center px-4 sm:px-6 py-4 sm:py-6 flex-grow flex flex-col items-center justify-center">
                  <div
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto flex items-center justify-center text-xl sm:text-2xl mb-3 sm:mb-4 bg-accent/50"
                    style={{ backgroundColor: subject.color ? `${subject.color}20` : undefined }}
                  >
                    {subject.icon || '📚'}
                  </div>
                  <CardTitle className="text-lg sm:text-xl text-foreground">
                    {subject.name}
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base text-muted-foreground mt-2">
                    {subject.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Fixed bottom continue button */}
      {selectedSubject && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <Button
            onClick={handleContinue}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg hover:scale-[1.01] transition-all duration-300"
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
