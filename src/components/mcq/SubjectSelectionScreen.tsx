import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import { fetchSubjects, Subject } from '@/utils/mcqData';

interface SubjectSelectionScreenProps {
  onSubjectSelect: (subject: Subject) => void;
}

const SubjectCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 shadow-2xl p-1 animate-pulse">
    <div className="bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-6 border border-white/10 h-24" />
  </div>
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

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0 pb-24">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase italic">
          Choose Your <span className="text-primary">Subject</span>
        </h2>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">
          Select the subject you want to practice
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SubjectCardSkeleton key={i} />)
        ) : (
          subjects.map((subject, index) => {
            // Grey out subjects with no description (placeholder) - we don't have mcq_count on subjects
            // but we keep them selectable
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSubject(subject)}
                className="cursor-pointer"
              >
                <div className={`relative overflow-hidden rounded-[2rem] p-1 shadow-2xl transition-all duration-300 ${
                  selectedSubject?.id === subject.id
                    ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700'
                    : 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600'
                }`}>
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                  }} />

                  <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-5 border border-white/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl border border-white/20 flex-shrink-0">
                      {subject.icon || '📚'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-black text-white tracking-tight">{subject.name}</h3>
                      <p className="text-white/60 text-xs mt-0.5 truncate">{subject.description}</p>
                    </div>
                    {selectedSubject?.id === subject.id && (
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <div className="w-3 h-3 rounded-full bg-indigo-600" />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {selectedSubject && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        >
          <Button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.01] transition-all rounded-2xl h-14 uppercase font-black text-xs tracking-widest shadow-2xl"
            size="lg"
          >
            Continue with {selectedSubject.name}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Footer */}
      <div className="text-center pt-6 pb-4">
        <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
      </div>
    </div>
  );
};
