import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Play, Loader2 } from 'lucide-react';
import { fetchChaptersBySubject, Chapter } from '@/utils/mcqData';

interface ChapterSelectorProps {
  subject: string;
  selectedChapter: string | null;
  onChapterSelect: (chapterId: string) => void;
}

export const ChapterSelector = ({ subject, selectedChapter, onChapterSelect }: ChapterSelectorProps) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChapters = async () => {
      setLoading(true);
      const data = await fetchChaptersBySubject(subject);
      setChapters(data);
      setLoading(false);
    };

    if (subject) loadChapters();
  }, [subject]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading tests...</span>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">No tests available for this subject.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {chapters.map((chapter, index) => (
        <motion.div
          key={chapter.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-2 ${selectedChapter === chapter.id
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                : 'border-purple-200 dark:border-purple-800 hover:border-purple-300 dark:hover:border-purple-700'
              } bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 backdrop-blur-sm`}
            onClick={() => onChapterSelect(chapter.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-800 dark:to-pink-800 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">
                      Test {chapter.chapter_number}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                      {chapter.name}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {chapter.mcq_count || 0} Questions
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{chapter.description}</p>
              {selectedChapter === chapter.id && (
                <div className="text-center">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full text-sm">
                    <Play className="w-3 h-3" />
                    <span>Selected</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
