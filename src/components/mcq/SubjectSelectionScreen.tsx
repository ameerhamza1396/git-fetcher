import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen } from 'lucide-react';
import { fetchSubjects, Subject } from '@/utils/mcqData';

interface SubjectSelectionScreenProps {
  onSubjectSelect: (subject: Subject) => void;
}

const SubjectCardSkeleton = () => (
  <div className="relative overflow-hidden rounded-3xl bg-muted/20 p-6 animate-pulse border border-border/40">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-1/3 bg-muted rounded-full" />
        <div className="h-3 w-2/3 bg-muted rounded-full" />
      </div>
    </div>
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
    <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-3 block">Step 1 of 3</span>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none">
          Select <span className="text-primary">Subject</span>
        </h2>
        <p className="text-muted-foreground text-sm font-medium mt-4 max-w-lg mx-auto">
          Choose a subject to begin your practice. Each subject contains comprehensive chapters and high-yield MCQs.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SubjectCardSkeleton key={i} />)
        ) : (
          subjects.map((subject, index) => {
            const isSelected = selectedSubject?.id === subject.id;
            return (
              <motion.div
                key={subject.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSubject(subject)}
                className={`group cursor-pointer relative overflow-hidden rounded-3xl border-2 p-6 transition-all duration-300 ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10' 
                    : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {/* Background Glow */}
                {isSelected && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
                )}

                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl transition-transform duration-300 group-hover:scale-110 ${
                    isSelected ? 'bg-primary text-white' : 'bg-muted/50 text-foreground/70'
                  }`}>
                    {subject.icon || '📚'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-xl font-black uppercase italic tracking-tight transition-colors ${
                        isSelected ? 'text-primary' : 'text-foreground'
                      }`}>
                        {subject.name}
                      </h3>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs font-medium leading-relaxed line-clamp-2">
                      {subject.description || `Master ${subject.name} with our structured question bank and detailed explanations.`}
                    </p>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-primary text-white' : 'bg-muted opacity-0 group-hover:opacity-100'
                  }`}>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {selectedSubject && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-6 z-50 flex justify-center pointer-events-none"
          >
            <div className="w-full max-w-md pointer-events-auto">
              <Button
                onClick={handleContinue}
                className="w-full bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
                size="lg"
              >
                Continue to Chapters
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5 ml-2" />
                </motion.div>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center pt-20 pb-10 opacity-40">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">© 2026 Medmacs App • All rights reserved</p>
      </div>
    </div>
  );
};
