import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, Check } from 'lucide-react';
import { fetchSubjects } from '@/utils/mcqData';

interface Subject {
  id: string;
  name: string;
  institutes?: string[] | null;
}

interface SubjectChapterSelectorProps {
  selectedSubjectId: string | null;
  onSubjectChange: (subjectId: string, subjectName: string) => void;
}

export const SubjectChapterSelector = ({
  selectedSubjectId,
  onSubjectChange,
}: SubjectChapterSelectorProps) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
  const [showSubjects, setShowSubjects] = useState(false);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);

  useEffect(() => { loadSubjects(); }, []);

  const loadSubjects = async () => {
    try {
      setSubjects(await fetchSubjects());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-blue-500/5 to-violet-500/10 backdrop-blur-2xl border border-primary/20 shadow-xl p-1.5">
      <div className="relative z-10 bg-background/50 backdrop-blur-xl rounded-[1.5rem] border border-primary/10 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-base font-black text-foreground">Battle Subject</h3>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Subject</label>
          <button
            onClick={() => setShowSubjects(!showSubjects)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/40 text-sm font-medium text-foreground hover:bg-muted/50 transition-all"
          >
            <span className={selectedSubject ? 'text-foreground' : 'text-muted-foreground'}>
              {isLoadingSubjects ? 'Loading...' : selectedSubject?.name || 'Choose a subject'}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showSubjects ? 'rotate-180' : ''}`} />
          </button>
          {showSubjects && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border/40 bg-background/90 backdrop-blur-xl shadow-lg">
              {subjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => {
                    onSubjectChange(subject.id, subject.name);
                    setShowSubjects(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${
                    selectedSubjectId === subject.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                  }`}
                >
                  {subject.name}
                  {selectedSubjectId === subject.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSubjectId && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Subject selected. Ready to battle.</p>
          </div>
        )}
      </div>
    </div>
  );
};
