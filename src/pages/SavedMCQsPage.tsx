// @ts-nocheck
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookmarkX, Moon, Sun, ChevronDown, ChevronUp, Loader2, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

import { useToast } from '@/hooks/use-toast';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';
import PlanBadge from '@/components/PlanBadge';

interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  chapter: string;
  subject: string;
}

const SavedMCQsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedMcqId, setExpandedMcqId] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Scroll-hide header
  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    if (currentY > 80 && currentY > lastScrollY.current) {
      setHeaderVisible(false);
    } else {
      setHeaderVisible(true);
    }
    lastScrollY.current = currentY;
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.from('profiles').select('plan, avatar_url').eq('id', user.id).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  const { data: savedMcqs, isLoading, isError, error } = useQuery<MCQ[], Error>({
    queryKey: ['savedMcqs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: savedIds, error: idsErr } = await supabase.from('saved_mcqs').select('mcq_id').eq('user_id', user.id);
      if (idsErr) throw idsErr;
      const mcqIds = savedIds.map(item => item.mcq_id);
      if (mcqIds.length === 0) return [];
      const { data: mcqDetails, error: detailsErr } = await supabase.from('mcqs').select('*').in('id', mcqIds);
      if (detailsErr) throw detailsErr;
      return mcqDetails as MCQ[];
    },
    enabled: !!user?.id,
  });

  const unsaveMCQMutation = useMutation({
    mutationFn: async (mcqId: string) => {
      if (!user?.id) throw new Error("User not authenticated.");
      const { error } = await supabase.from('saved_mcqs').delete().eq('user_id', user.id).eq('mcq_id', mcqId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedMcqs', user?.id] });
      setExpandedMcqId(null); 
      toast({ title: "MCQ Unsaved", description: "This question has been removed from your saved list." });
    }
  });

  const handleToggleExpand = (mcqId: string) => setExpandedMcqId(prevId => (prevId === mcqId ? null : mcqId));

  const handleUnsaveMcq = (mcqId: string) => {
    toast({
      title: "Unsave Question?",
      description: "Remove this question from your saved list?",
      action: (
        <Button 
          variant="destructive" size="sm" 
          onClick={() => unsaveMCQMutation.mutate(mcqId)}
          disabled={unsaveMCQMutation.isLoading}
        >
          {unsaveMCQMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Yes, Unsave
        </Button>
      ),
    });
  };

  return (
    <div className="min-h-screen w-full bg-background bg-mesh pb-28 overflow-x-hidden relative">
      <Seo title="Saved MCQs" description="Access and review your saved MCQs on Medmacs App." canonical="https://medmacs.app/saved-mcqs" />
      
      {/* Floating gradient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Glass Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="container mx-auto px-4 py-3 flex justify-between items-center max-w-7xl">
          <Link to="/dashboard" className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-semibold">Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-6 h-6" />
            <span className="text-sm font-black text-foreground tracking-tight hidden sm:inline">Saved MCQs</span>
          </div>

          <div className="flex items-center gap-3">
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl mt-[var(--header-height)]">
        <header className="mb-10 text-center animate-fade-in">
          <h1 className="text-3xl font-black text-foreground uppercase italic tracking-tight">
            📚 Saved <span className="text-shimmer">Questions</span>
          </h1>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
            Review your bookmarked MCQs
          </p>
        </header>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 animate-pulse">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading knowledge...</p>
          </div>
        )}

        {isError && (
          <div className="text-center p-8 bg-destructive/5 rounded-3xl border border-destructive/20 animate-alive">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <BookmarkX className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm font-bold text-destructive">Error loading saved MCQs: {error?.message}</p>
          </div>
        )}

        {user && !isLoading && savedMcqs && savedMcqs.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-24 px-6 border border-dashed border-border/60 rounded-[2.5rem] bg-card/40 backdrop-blur-sm">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-6">
              <BookmarkX className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No saved questions yet</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto">Start practicing and bookmark questions you'd like to review later.</p>
            <Button asChild className="rounded-2xl font-black h-12 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Link to="/mcqs">Start Practicing</Link>
            </Button>
          </motion.div>
        )}

        {user && savedMcqs && savedMcqs.length > 0 && (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {savedMcqs.map((mcq, idx) => (
                <motion.div
                  key={mcq.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  layout
                >
                  <Card className={`overflow-hidden border-border/40 shadow-sm transition-all duration-300 transform-gpu alive-card ${expandedMcqId === mcq.id ? 'ring-2 ring-primary bg-card/90' : 'bg-card/50 hover:bg-card/80 backdrop-blur-sm shadow-black/5 hover:shadow-black/10'}`}>
                    <CardHeader className="p-5 flex flex-row justify-between items-start gap-4">
                      <div className="flex-grow space-y-3">
                         <div className="flex items-center gap-2">
                           <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/5 text-primary border-primary/20 rounded-sm">
                             {mcq.subject || 'Medical'}
                           </Badge>
                         </div>
                        <h2 className="text-[15px] font-bold text-foreground leading-relaxed">
                          {mcq.question}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pt-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleUnsaveMcq(mcq.id)}
                          className="w-8 h-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all"
                        >
                          <BookmarkX className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleToggleExpand(mcq.id)}
                          className={`w-8 h-8 rounded-xl transition-all ${expandedMcqId === mcq.id ? 'bg-primary text-white hover:bg-primary/90 rotate-180' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <AnimatePresence>
                      {expandedMcqId === mcq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                          <CardContent className="px-5 pb-6 pt-0">
                            <div className="space-y-2 mt-2">
                              {mcq.options.map((option, index) => {
                                const isCorrect = option === mcq.correct_answer;
                                return (
                                  <div 
                                    key={index} 
                                    className={`relative p-3.5 rounded-2xl border-2 transition-all duration-200 group flex items-center justify-between ${
                                      isCorrect 
                                        ? 'bg-primary/5 border-primary shadow-sm shadow-primary/10' 
                                        : 'bg-muted/30 border-transparent hover:border-border'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${isCorrect ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                        {String.fromCharCode(65 + index)}
                                      </div>
                                      <span className={`text-sm font-medium ${isCorrect ? 'text-foreground' : 'text-muted-foreground'}`}>{option}</span>
                                    </div>
                                    {isCorrect && (
                                       <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 bg-primary/20 p-1 rounded-full">
                                          <CheckCircle className="w-4 h-4 text-primary" />
                                       </motion.div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {mcq.explanation && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 p-4 rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border border-indigo-200/50 dark:border-indigo-800/30"
                              >
                                <div className="flex items-baseline gap-2 mb-2">
                                  <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Deep Insights</span>
                                </div>
                                <p className="text-sm font-medium text-indigo-900/80 dark:text-indigo-200/80 leading-relaxed italic">
                                  "{mcq.explanation}"
                                </p>
                              </motion.div>
                            )}
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center pt-10 pb-28 opacity-50">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Medmacs Intelligence Core</p>
        <p className="text-[8px] font-bold text-muted-foreground mt-1">© 2026 Hmacs Studios.</p>
      </footer>
    </div>
  );
};

export default SavedMCQsPage;
