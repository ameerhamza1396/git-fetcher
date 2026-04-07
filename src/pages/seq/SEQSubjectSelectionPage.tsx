import { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { fetchSEQSubjects, SEQSubject } from '@/utils/mcqData';
import { useAuth } from '@/hooks/useAuth';
import { MCQPageLayout } from '@/pages/mcq/MCQPageLayout';
import { SEQProgressTracker } from '@/components/seq/SEQProgressTracker';
import PageSkeleton from '@/components/skeletons/PageSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

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

const SEQSubjectSelectionPage = () => {
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  const [subjects, setSubjects] = useState<SEQSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<SEQSubject | null>(null);

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles').select('plan').eq('id', user.id).maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    const loadSubjects = async () => {
      setLoadingSubjects(true);
      const data = await fetchSEQSubjects();
      setSubjects(data);
      setLoadingSubjects(false);
      setLoading(false);
    };
    if (!profileLoading && user) {
      loadSubjects();
    } else if (!user) {
      setLoading(false);
    }
  }, [profileLoading, user]);

  const handleContinue = () => {
    if (selectedSubject) {
      navigate(`/seqs/chapter/${selectedSubject.id}`);
    }
  };

  if (authLoading || profileLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur-sm border-border shadow-lg p-6">
          <CardHeader className="mb-4">
            <Lock className="w-16 h-16 mx-auto text-orange-500 mb-4" />
            <CardTitle className="text-2xl font-bold text-foreground">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Please log in to access the SEQ practice section.</p>
            <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg shadow-md">
              <Link to="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = profile?.plan?.toLowerCase() || 'free';
  const hasAccess = plan === 'premium';

  if (!hasAccess) {
    return (
      <MCQPageLayout showHeader={false}>
        <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-20 rounded-full animate-pulse" />
            <div className="relative bg-gradient-to-br from-amber-500 to-yellow-500 p-6 rounded-[2.5rem] shadow-2xl">
              <Lock className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            Premium <span className="text-amber-500">Content</span>
          </h1>
          <p className="text-muted-foreground max-w-md mb-8">
            SEQs are available exclusively for <span className="text-foreground font-bold">Premium</span> users. Upgrade your plan to access our curated short essay questions!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold">
              <Link to="/pricing">Upgrade Plan</Link>
            </Button>
            <Button asChild variant="outline" className="font-bold">
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          </div>
        </div>
      </MCQPageLayout>
    );
  }

  if (loading) {
    return (
      <MCQPageLayout backTo="/">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SubjectCardSkeleton key={i} />)}
        </div>
      </MCQPageLayout>
    );
  }

  return (
    <MCQPageLayout backTo="/dashboard" showHeader={true} showBackButton={true}>
      <Seo title="SEQ Practice" description="Practice Short Essay Questions for your medical exams with Medmacs App." canonical="https://medmacs.app/seqs" />
      
      <div className="text-center mb-6 sm:mb-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground uppercase italic mb-3">
          📝 SEQ <span className="text-orange-500">Practice</span>
        </h1>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] max-w-2xl mx-auto px-4 sm:px-0">
          Master medical concepts with our comprehensive SEQ practice system
        </p>
      </div>

      <div className="mb-6 sm:mb-8">
        <SEQProgressTracker userId={user?.id} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 px-4"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-3 block">Step 1 of 3</span>
      </motion.div>

      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)] -mx-3 sm:mx-0 px-3 sm:px-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-0">
          <div className="pt-4 pb-3">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground uppercase italic leading-none text-center">
              Select <span className="text-orange-500">Subject</span>
            </h2>
            <p className="text-muted-foreground text-sm font-medium mt-2 max-w-lg mx-auto text-center">
              Choose a subject to begin your SEQ practice. Each subject contains comprehensive chapters and high-yield questions.
            </p>
          </div>
        </div>
        <div className="h-4 bg-gradient-to-b from-background/80 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-0 pb-32 grid grid-cols-1 md:grid-cols-2 gap-4">
        {loadingSubjects ? (
          Array.from({ length: 4 }).map((_, i) => <SubjectCardSkeleton key={i} />)
        ) : subjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No subjects available for your year/institute.</p>
          </div>
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
                    ? 'border-orange-500 bg-orange-500/5 shadow-2xl shadow-orange-500/10' 
                    : 'border-border/40 bg-white/5 dark:bg-zinc-900/50 hover:border-orange-500/30 hover:bg-orange-500/5'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-[60px] -mr-16 -mt-16 pointer-events-none" />
                )}

                <div className="flex items-center gap-5 relative z-10">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl transition-transform duration-300 group-hover:scale-110 ${
                    isSelected ? 'bg-orange-500 text-white' : 'bg-muted/50 text-foreground/70'
                  }`}>
                    {subject.icon || '📝'}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`text-xl font-black uppercase italic tracking-tight transition-colors ${
                        isSelected ? 'text-orange-500' : 'text-foreground'
                      }`}>
                        {subject.name}
                      </h3>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs font-medium leading-relaxed line-clamp-2">
                      {subject.description || `Master ${subject.name} with our structured SEQ questions and detailed explanations.`}
                    </p>
                  </div>

                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-orange-500 text-white' : 'bg-muted opacity-0 group-hover:opacity-100'
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
            className="fixed bottom-0 left-0 right-0 p-6 pb-[env(safe-area-inset-bottom)] z-50 flex justify-center pointer-events-none"
          >
            <div className="w-full max-w-md pointer-events-auto">
              <Button
                onClick={handleContinue}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-2xl shadow-orange-500/40 rounded-2xl h-16 uppercase font-black text-sm tracking-[0.2em] group transition-all"
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
    </MCQPageLayout>
  );
};

export default SEQSubjectSelectionPage;
