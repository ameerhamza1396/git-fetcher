// @ts-nocheck
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, FlaskConical, Target } from 'lucide-react';
import Seo from '@/components/Seo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MCQPageLayout } from '@/pages/mcq/MCQPageLayout';
import { Titration } from '@/components/dashboard/personalization/Titration';
import { usePersonalizationData } from '@/components/dashboard/personalization/usePersonalizationData';

const TitrationPage = () => {
  const { groupedSubjects, weakestChapter, wrongAttempts, isLoading } = usePersonalizationData();
  const upcomingChapters = groupedSubjects
    .flatMap(subject => subject.chapters.map(chapter => ({ ...chapter, subjectName: subject.name })))
    .filter(chapter => chapter.id !== weakestChapter?.id)
    .sort((a, b) => b.attempts.length - a.attempts.length)
    .slice(0, 3);

  return (
    <MCQPageLayout backTo="/dashboard" showHeader showBackButton>
      <Seo title="Titration" description="Repair your weakest MCQ chapter with flashcards and correction practice on Medmacs App." canonical="https://medmacs.app/titration" />

      <div className="text-center mb-6 sm:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic mb-3">
          Learning <span className="text-primary">Titration</span>
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] max-w-2xl mx-auto px-4 sm:px-0">
          Repair the weakest chapter first
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 mb-6">
        <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-violet-500/10 via-background to-cyan-500/10 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-background/80 p-3 text-center ring-1 ring-border/40">
              <p className="text-lg font-black text-foreground">{wrongAttempts.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Signals</p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3 text-center ring-1 ring-border/40">
              <p className="text-lg font-black text-foreground">{weakestChapter?.attempts.length || 0}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target</p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3 text-center ring-1 ring-border/40">
              <p className="text-lg font-black text-foreground">{upcomingChapters.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Queued</p>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)] -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden py-3 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 block">Adaptive Repair</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none">
              Weakest <span className="live-gradient-text">Chapter</span>
            </h2>
          </motion.div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-20 space-y-4">
        {isLoading ? (
          <div className="h-48 animate-pulse rounded-3xl border border-border/30 bg-muted/20" />
        ) : wrongAttempts.length === 0 || !weakestChapter ? (
          <Card className="border-border/40 bg-card/80">
            <CardContent className="p-5 text-center">
              <FlaskConical className="mx-auto mb-3 h-8 w-8 text-primary" />
              <p className="text-sm font-black text-foreground">No titration target yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Once you have wrong MCQ attempts, your weakest chapter will appear here.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Titration weakestChapter={weakestChapter} />

            <Card className="overflow-hidden border-border/40 bg-card/80 shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-foreground">Upcoming 3 Chapters</p>
                    <p className="text-[11px] text-muted-foreground">Next weakest chapters in queue</p>
                  </div>
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="divide-y divide-border/40">
                  {upcomingChapters.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground">No additional weak chapters yet.</div>
                  ) : upcomingChapters.map((chapter, index) => (
                    <div key={chapter.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-foreground">{chapter.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">Chapter {chapter.number} - {chapter.subjectName} - {chapter.attempts.length} wrong attempts</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MCQPageLayout>
  );
};

export default TitrationPage;
