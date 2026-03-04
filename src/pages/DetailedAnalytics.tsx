// @ts-nocheck
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Target, BookOpen, TrendingUp, TrendingDown, Lock, Loader2, BarChart3, ChevronRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Seo from '@/components/Seo';

interface SubjectAnalytics {
  subject_id: string;
  subject_name: string;
  total: number;
  correct: number;
  accuracy: number;
  chapters: ChapterAnalytics[];
}

interface ChapterAnalytics {
  chapter_id: string;
  chapter_name: string;
  total: number;
  correct: number;
  accuracy: number;
}

const DetailedAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const userPlan = (profile as any)?.plan?.toLowerCase() || 'free';
  const isPremium = userPlan === 'premium' || userPlan === 'iconic';

  const { data: analytics, isLoading } = useQuery<SubjectAnalytics[]>({
    queryKey: ['detailed-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch all answers with MCQ + chapter + subject info
      const { data: answers, error } = await supabase
        .from('user_answers')
        .select('is_correct, mcq_id, mcqs(id, chapter_id, chapters(id, name, subject_id, subjects(id, name)))')
        .eq('user_id', user.id);

      if (error || !answers) return [];

      // Group by subject then chapter
      const subjectMap: Record<string, SubjectAnalytics> = {};

      for (const ans of answers) {
        const mcq = ans.mcqs as any;
        if (!mcq?.chapters?.subjects) continue;

        const subject = mcq.chapters.subjects;
        const chapter = mcq.chapters;

        if (!subjectMap[subject.id]) {
          subjectMap[subject.id] = {
            subject_id: subject.id,
            subject_name: subject.name,
            total: 0,
            correct: 0,
            accuracy: 0,
            chapters: [],
          };
        }

        subjectMap[subject.id].total++;
        if (ans.is_correct) subjectMap[subject.id].correct++;

        // Find or create chapter entry
        let chap = subjectMap[subject.id].chapters.find(c => c.chapter_id === chapter.id);
        if (!chap) {
          chap = { chapter_id: chapter.id, chapter_name: chapter.name, total: 0, correct: 0, accuracy: 0 };
          subjectMap[subject.id].chapters.push(chap);
        }
        chap.total++;
        if (ans.is_correct) chap.correct++;
      }

      // Calculate accuracies
      const result = Object.values(subjectMap).map(s => ({
        ...s,
        accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
        chapters: s.chapters.map(c => ({
          ...c,
          accuracy: c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0,
        })).sort((a, b) => b.total - a.total),
      }));

      return result.sort((a, b) => b.total - a.total);
    },
    enabled: !!user?.id,
  });

  // Find strongest (min 100 questions) and weakest (min 30 incorrect)
  const strongest = analytics?.filter(s => s.total >= 100).sort((a, b) => b.accuracy - a.accuracy)?.[0] || null;
  const weakest = analytics?.filter(s => (s.total - s.correct) >= 30).sort((a, b) => a.accuracy - b.accuracy)?.[0] || null;

  const strongestChapter = analytics?.flatMap(s => s.chapters).filter(c => c.total >= 100).sort((a, b) => b.accuracy - a.accuracy)?.[0] || null;
  const weakestChapter = analytics?.flatMap(s => s.chapters).filter(c => (c.total - c.correct) >= 30).sort((a, b) => a.accuracy - b.accuracy)?.[0] || null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm font-bold text-muted-foreground">Preparing your report, stay tuned...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please sign in to view analytics.</p>
      </div>
    );
  }

  const visibleSubjects = isPremium ? analytics : analytics?.slice(0, 3);
  const hiddenCount = !isPremium && analytics ? analytics.length - 3 : 0;

  return (
    <div className="min-h-screen bg-background pb-8">
      <Seo title="Detailed Analytics" description="Subject and topic-wise performance analysis" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/30 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div>
            <h1 className="text-sm font-black text-foreground">Detailed Analytics</h1>
            <p className="text-[10px] text-muted-foreground">Subject & topic breakdown</p>
          </div>
        </div>
      </header>

      <div className="px-4 mt-[var(--header-height)] space-y-5 pt-4">
        {/* Strengths & Weaknesses */}
        {(strongest || weakest || strongestChapter || weakestChapter) && (
          <div className="grid grid-cols-2 gap-3">
            {strongest && (
              <Card className="border border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4">
                  <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Strongest Subject</p>
                  <p className="text-sm font-black text-foreground mt-1 truncate">{strongest.subject_name}</p>
                  <p className="text-xs text-muted-foreground">{strongest.accuracy}% · {strongest.total} Qs</p>
                </CardContent>
              </Card>
            )}
            {weakest && (
              <Card className="border border-destructive/20 bg-destructive/5">
                <CardContent className="p-4">
                  <TrendingDown className="w-5 h-5 text-destructive mb-2" />
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Weakest Subject</p>
                  <p className="text-sm font-black text-foreground mt-1 truncate">{weakest.subject_name}</p>
                  <p className="text-xs text-muted-foreground">{weakest.accuracy}% · {weakest.total} Qs</p>
                </CardContent>
              </Card>
            )}
            {strongestChapter && (
              <Card className="border border-emerald-500/20 bg-emerald-500/5">
                <CardContent className="p-4">
                  <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Strongest Topic</p>
                  <p className="text-sm font-black text-foreground mt-1 truncate">{strongestChapter.chapter_name}</p>
                  <p className="text-xs text-muted-foreground">{strongestChapter.accuracy}% · {strongestChapter.total} Qs</p>
                </CardContent>
              </Card>
            )}
            {weakestChapter && (
              <Card className="border border-destructive/20 bg-destructive/5">
                <CardContent className="p-4">
                  <TrendingDown className="w-5 h-5 text-destructive mb-2" />
                  <p className="text-[10px] font-bold text-destructive uppercase tracking-wider">Weakest Topic</p>
                  <p className="text-sm font-black text-foreground mt-1 truncate">{weakestChapter.chapter_name}</p>
                  <p className="text-xs text-muted-foreground">{weakestChapter.accuracy}% · {weakestChapter.total} Qs</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Subject List */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Subject-wise Performance
          </h2>

          {(!analytics || analytics.length === 0) && (
            <Card className="border border-border/40 bg-card/80 p-8 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No data yet. Start attempting MCQs to see your analysis!</p>
            </Card>
          )}

          <div className="space-y-3">
            {visibleSubjects?.map((subject, idx) => (
              <SubjectCard key={subject.subject_id} subject={subject} isPremium={isPremium} index={idx} />
            ))}
          </div>

          {/* Locked content for free users */}
          {!isPremium && hiddenCount > 0 && (
            <div className="relative mt-3">
              {/* Faded preview */}
              <div className="space-y-3 opacity-30 blur-[2px] pointer-events-none">
                {analytics?.slice(3, 5).map((subject) => (
                  <Card key={subject.subject_id} className="border border-border/40 bg-card/80 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{subject.subject_name}</p>
                        <p className="text-xs text-muted-foreground">{subject.total} questions</p>
                      </div>
                      <span className="text-lg font-black">{subject.accuracy}%</span>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Overlay CTA */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-background via-background/80 to-transparent rounded-2xl">
                <Lock className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-sm font-bold text-foreground mb-1">Unlock Full Analytics</p>
                <p className="text-xs text-muted-foreground mb-4 text-center px-8">
                  {hiddenCount} more subject{hiddenCount > 1 ? 's' : ''} and all topic breakdowns
                </p>
                <Button
                  onClick={() => navigate('/pricing')}
                  className="bg-primary text-primary-foreground rounded-2xl h-10 px-6 font-bold text-sm"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Individual subject card with expandable chapters
const SubjectCard = ({ subject, isPremium, index }: { subject: SubjectAnalytics; isPremium: boolean; index: number }) => {
  const [expanded, setExpanded] = useState(false);

  const accuracyColor = subject.accuracy >= 70 ? 'text-emerald-500' : subject.accuracy >= 40 ? 'text-amber-500' : 'text-destructive';
  const progressColor = subject.accuracy >= 70 ? 'bg-emerald-500' : subject.accuracy >= 40 ? 'bg-amber-500' : 'bg-destructive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="border border-border/40 bg-card/80 overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-4 flex items-center gap-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-foreground truncate pr-2">{subject.subject_name}</p>
              <span className={`text-lg font-black ${accuracyColor} shrink-0`}>{subject.accuracy}%</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
              <span>{subject.total} attempted</span>
              <span>·</span>
              <span>{subject.correct} correct</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full ${progressColor} transition-all`} style={{ width: `${subject.accuracy}%` }} />
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded ? 'rotate-90' : ''}`} />
        </button>

        {/* Expanded chapters */}
        <AnimatedExpand expanded={expanded}>
          <div className="px-4 pb-4 space-y-2 border-t border-border/30 pt-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Topic Breakdown</p>
            {subject.chapters.map((ch) => {
              const chColor = ch.accuracy >= 70 ? 'text-emerald-500' : ch.accuracy >= 40 ? 'text-amber-500' : 'text-destructive';
              return (
                <div key={ch.chapter_id} className="flex items-center justify-between py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground truncate">{ch.chapter_name}</p>
                    <p className="text-[10px] text-muted-foreground">{ch.total} Qs · {ch.correct} correct</p>
                  </div>
                  <span className={`text-sm font-bold ${chColor} shrink-0 ml-2`}>{ch.accuracy}%</span>
                </div>
              );
            })}
            {subject.chapters.length === 0 && (
              <p className="text-xs text-muted-foreground">No topic data available</p>
            )}
          </div>
        </AnimatedExpand>
      </Card>
    </motion.div>
  );
};

// Simple animated expand
const AnimatedExpand = ({ expanded, children }: { expanded: boolean; children: React.ReactNode }) => {
  if (!expanded) return null;
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
};

export default DetailedAnalytics;
