import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, FlaskConical, Target, ArrowLeft } from 'lucide-react';
import Seo from '@/components/Seo';
import { Card, CardContent } from '@/components/ui/card';
import { SmartDeck } from '@/components/dashboard/personalization/SmartDeck';
import { usePersonalizationData } from '@/components/dashboard/personalization/usePersonalizationData';

const SmartDeckPage = () => {
  const { groupedSubjects, weakestChapter, wrongAttempts, isLoading } = usePersonalizationData();
  const upcomingChapters = groupedSubjects
    .flatMap(subject => subject.chapters.map(chapter => ({ ...chapter, subjectName: subject.name })))
    .filter(chapter => chapter.id !== weakestChapter?.id)
    .sort((a, b) => b.attempts.length - a.attempts.length)
    .slice(0, 3);

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground overflow-hidden">
      <Seo title="Smart Deck" description="Repair your weakest MCQ chapter with flashcards and correction practice on Medmacs App." canonical="https://medmacs.app/smart-deck" />

      {/* Mesh Background Blurs */}
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-primary/10 to-transparent dark:from-primary/15" />

      {/* Glassmorphic Header */}
      <header className="shrink-0 relative z-30 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+10px)] backdrop-blur-2xl border-b border-border/60 bg-background/88 animate-fade-in">
        <div className="mx-auto flex items-center justify-between gap-3 max-w-4xl">
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="flex shrink-0 items-center justify-center bg-muted text-foreground transition active:scale-95 active:bg-primary active:text-primary-foreground h-11 w-11 rounded-2xl border border-border/40"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div className="min-w-0 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Medmacs</p>
            <h1 className="truncate text-base font-black tracking-tight uppercase italic">Smart Deck</h1>
          </div>

          <div className="flex shrink-0 items-center justify-center bg-primary/10 text-primary h-11 w-11 rounded-2xl">
            <FlaskConical className="h-5 w-5" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 w-full max-w-4xl mx-auto px-4 pt-6 pb-6 overflow-hidden gap-5 animate-fade-in">
        {/* Intro text */}
        <div className="text-center shrink-0">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase italic">
            Smart <span className="live-gradient-text">Deck</span>
          </h2>
          <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em] mt-1">
            Repair the weakest chapter first
          </p>
        </div>

        {/* Stat Summary Box */}
        <div className="shrink-0">
          <div className="rounded-3xl border border-border/40 bg-white/5 dark:bg-white/[0.035] backdrop-blur-xl p-4 shadow-sm">
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

        {/* Sub-header */}
        <div className="shrink-0 text-center">
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary mb-1 block">Adaptive Repair</span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase italic leading-none">
            Weakest Chapter
          </h3>
        </div>

        {/* Scrollable List Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-3xl border border-border/30 bg-muted/20" />
          ) : wrongAttempts.length === 0 || !weakestChapter ? (
            <Card className="border-border/40 bg-card/80">
              <CardContent className="p-5 text-center">
                <FlaskConical className="mx-auto mb-3 h-8 w-8 text-primary" />
                <p className="text-sm font-black text-foreground">Your Smart Deck is empty</p>
                <p className="mt-1 text-xs text-muted-foreground">Once you have wrong MCQ attempts, your weakest chapter will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <SmartDeck weakestChapter={weakestChapter} />

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
          
          <p className="pb-4 pt-8 text-center text-[10px] text-muted-foreground tracking-widest">
            © 2026 Medmacs App • All rights reserved
          </p>
        </div>
      </main>
    </div>
  );
};

export default SmartDeckPage;
