
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchSubjects, Subject } from '@/utils/mcqData';
import { Loader2 } from 'lucide-react';

interface SubjectSelectorProps {
  selectedSubject: string | null;
  onSubjectSelect: (subjectId: string) => void;
}

export const SubjectSelector = ({ selectedSubject, onSubjectSelect }: SubjectSelectorProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);
      const data = await fetchSubjects();
      setSubjects(data);
      setLoading(false);
    };

    loadSubjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading subjects...</span>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">No subjects available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {subjects.map((subject, index) => (
        <motion.div
          key={subject.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card 
            className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 ${
              selectedSubject === subject.id 
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                : 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700'
            } bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 backdrop-blur-sm`}
            onClick={() => onSubjectSelect(subject.id)}
          >
            <CardHeader className="text-center">
              <div 
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl mb-4 bg-white/50 dark:bg-gray-800/50"
                style={{ backgroundColor: subject.color ? `${subject.color}20` : '#9333ea20' }}
              >
                {subject.icon || '📚'}
              </div>
              <CardTitle 
                className="text-xl text-gray-900 dark:text-white" 
                style={{ color: selectedSubject === subject.id ? subject.color || '#9333ea' : undefined }}
              >
                {subject.name}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                {subject.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Multiple Chapters</span>
                <span>~Questions Available</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
