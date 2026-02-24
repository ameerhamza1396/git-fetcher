
import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, List } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  name: string;
  subject_id: string;
}

interface SubjectChapterSelectorProps {
  selectedSubjectId: string | null;
  selectedChapterId: string | null;
  onSubjectChange: (subjectId: string, subjectName: string) => void;
  onChapterChange: (chapterId: string, chapterName: string) => void;
}

export const SubjectChapterSelector = ({
  selectedSubjectId,
  selectedChapterId,
  onSubjectChange,
  onChapterChange
}: SubjectChapterSelectorProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      loadChapters(selectedSubjectId);
    } else {
      setChapters([]);
    }
  }, [selectedSubjectId]);

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  const loadChapters = async (subjectId: string) => {
    setIsLoadingChapters(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name, subject_id')
        .eq('subject_id', subjectId)
        .order('chapter_number');

      if (error) throw error;
      setChapters(data || []);
    } catch (error) {
      console.error('Error loading chapters:', error);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (subject) {
      onSubjectChange(subjectId, subject.name);
    }
  };

  const handleChapterChange = (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (chapter) {
      onChapterChange(chapterId, chapter.name);
    }
  };

  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center">
          <BookOpen className="w-5 h-5 mr-2 text-red-600" />
          Battle Topic Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject-select">Select Subject</Label>
          <Select
            value={selectedSubjectId || ''}
            onValueChange={handleSubjectChange}
            disabled={isLoadingSubjects}
          >
            <SelectTrigger id="subject-select">
              <SelectValue placeholder={isLoadingSubjects ? "Loading subjects..." : "Choose a subject"} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedSubjectId && (
          <div className="space-y-2">
            <Label htmlFor="chapter-select">Select Chapter/Topic</Label>
            <Select
              value={selectedChapterId || ''}
              onValueChange={handleChapterChange}
              disabled={isLoadingChapters || !selectedSubjectId}
            >
              <SelectTrigger id="chapter-select">
                <SelectValue placeholder={isLoadingChapters ? "Loading chapters..." : "Choose a chapter"} />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    <div className="flex items-center">
                      <List className="w-4 h-4 mr-2" />
                      {chapter.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedSubjectId && selectedChapterId && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-300">
              ✓ Topic selected! Questions will be loaded from the selected chapter.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
