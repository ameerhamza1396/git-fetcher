// @ts-nocheck
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Crown, Sparkles, Target } from 'lucide-react';
import Seo from '@/components/Seo';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MCQPageLayout } from '@/pages/mcq/MCQPageLayout';
import { MistakeBook } from '@/components/dashboard/personalization/MistakeBook';
import { usePersonalizationData } from '@/components/dashboard/personalization/usePersonalizationData';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const MistakeBookPage = () => {
  const { user } = useAuth();
  const { groupedSubjects, wrongAttempts, isLoading } = usePersonalizationData();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id,
  });

  const isPremium = ['premium', 'iconic'].includes(String(profile?.plan || 'free').toLowerCase());
  const chapterCount = groupedSubjects.reduce((total, subject) => total + subject.chapters.length, 0);

  return (
    <MCQPageLayout backTo="/dashboard" showHeader showBackButton>
      <Seo title="Mistake Book" description="Review and correct your wrong MCQ attempts on Medmacs App." canonical="https://medmacs.app/mistake-book" />

      <div className="text-center mb-6 sm:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic mb-3">
          Mistake <span className="text-primary">Book</span>
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] max-w-2xl mx-auto px-4 sm:px-0">
          Review marked answers chapter by chapter
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 mb-6">
        <div className="rounded-3xl border border-border/40 bg-gradient-to-br from-rose-500/10 via-background to-primary/10 p-4 shadow-sm">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-background/80 p-3 text-center ring-1 ring-border/40">
              <p className="text-lg font-black text-foreground">{wrongAttempts.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MCQs</p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3 text-center ring-1 ring-border/40">
              <p className="text-lg font-black text-foreground">{chapterCount}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chapters</p>
            </div>
            <div className="rounded-2xl bg-background/80 p-3 text-center ring-1 ring-border/40">
              <p className="text-lg font-black text-foreground">{groupedSubjects.length}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subjects</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-background/70 px-3 py-2 text-xs text-muted-foreground ring-1 ring-border/40">
            {isPremium ? <Sparkles className="h-4 w-4 text-primary" /> : <Crown className="h-4 w-4 text-amber-500" />}
            <span>{isPremium ? 'AI Explain is active for your plan.' : 'AI Explain is locked until premium.'}</span>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)] -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden py-3 text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2 block">Correction Mode</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none">
              Select <span className="live-gradient-text">Chapter</span>
            </h2>
          </motion.div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
      </div>

      {isLoading ? (
        <div className="max-w-4xl mx-auto px-4 sm:px-0 grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl border border-border/30 bg-muted/20" />
          ))}
        </div>
      ) : wrongAttempts.length === 0 ? (
        <Card className="max-w-md mx-auto border-border/40 bg-card/80">
          <CardContent className="p-5 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-primary" />
            <p className="text-sm font-black text-foreground">No mistake book yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Wrong MCQ attempts will appear here by subject and chapter.</p>
          </CardContent>
        </Card>
      ) : (
        <MistakeBook subjects={groupedSubjects} isPremium={isPremium} />
      )}
    </MCQPageLayout>
  );
};

export default MistakeBookPage;
