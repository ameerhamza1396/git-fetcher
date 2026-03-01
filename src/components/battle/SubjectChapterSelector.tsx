import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, ChevronDown, Check } from 'lucide-react';

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
  const [showSubjects, setShowSubjects] = useState(false);
  const [showChapters, setShowChapters] = useState(false);

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedChapter = chapters.find(c => c.id === selectedChapterId);

  useEffect(() => { loadSubjects(); }, []);
  useEffect(() => {
    if (selectedSubjectId) loadChapters(selectedSubjectId);
    else setChapters([]);
  }, [selectedSubjectId]);

  const loadSubjects = async () => {
    try {
      const { data, error } = await supabase.from('subjects').select('id, name').order('name');
      if (error) throw error;
      setSubjects(data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoadingSubjects(false); }
  };

  const loadChapters = async (subjectId: string) => {
    setIsLoadingChapters(true);
    try {
      const { data, error } = await supabase.from('chapters').select('id, name, subject_id').eq('subject_id', subjectId).order('chapter_number');
      if (error) throw error;
      setChapters(data || []);
    } catch (e) { console.error(e); }
    finally { setIsLoadingChapters(false); }
  };

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-blue-500/5 to-violet-500/10 backdrop-blur-2xl border border-primary/20 shadow-xl p-1.5">
      <div className="relative z-10 bg-background/50 backdrop-blur-xl rounded-[1.5rem] border border-primary/10 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-base font-black text-foreground">Battle Topic</h3>
        </div>

        {/* Subject selector - custom expandable */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Subject</label>
          <button
            onClick={() => { setShowSubjects(!showSubjects); setShowChapters(false); }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/40 text-sm font-medium text-foreground hover:bg-muted/50 transition-all"
          >
            <span className={selectedSubject ? 'text-foreground' : 'text-muted-foreground'}>
              {isLoadingSubjects ? 'Loading...' : selectedSubject?.name || 'Choose a subject'}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showSubjects ? 'rotate-180' : ''}`} />
          </button>
          {showSubjects && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border/40 bg-background/90 backdrop-blur-xl shadow-lg">
              {subjects.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSubjectChange(s.id, s.name);
                    setShowSubjects(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${
                    selectedSubjectId === s.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                  }`}
                >
                  {s.name}
                  {selectedSubjectId === s.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chapter selector */}
        {selectedSubjectId && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Chapter</label>
            <button
              onClick={() => { setShowChapters(!showChapters); setShowSubjects(false); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-muted/30 border border-border/40 text-sm font-medium text-foreground hover:bg-muted/50 transition-all"
            >
              <span className={selectedChapter ? 'text-foreground' : 'text-muted-foreground'}>
                {isLoadingChapters ? 'Loading...' : selectedChapter?.name || 'Choose a chapter'}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showChapters ? 'rotate-180' : ''}`} />
            </button>
            {showChapters && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-border/40 bg-background/90 backdrop-blur-xl shadow-lg">
                {chapters.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onChapterChange(c.id, c.name);
                      setShowChapters(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40 transition-colors ${
                      selectedChapterId === c.id ? 'bg-primary/10 text-primary font-semibold' : 'text-foreground'
                    }`}
                  >
                    {c.name}
                    {selectedChapterId === c.id && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedSubjectId && selectedChapterId && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">✓ Topic selected! Ready to battle.</p>
          </div>
        )}
      </div>
    </div>
  );
};
