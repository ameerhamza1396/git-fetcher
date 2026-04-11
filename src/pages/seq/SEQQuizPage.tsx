import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { MCQPageLayout } from '@/pages/mcq/MCQPageLayout';
import PageSkeleton from '@/components/skeletons/PageSkeleton';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchSEQByChapter, evaluateSEQAnswer, saveSEQAnswer, SEQ, SEQEvaluationResult } from '@/utils/mcqData';
import { useReferenceSearch } from '@/hooks/useReferenceSearch';
import { SEQQuizSkeleton, SEQResultSkeleton } from '@/components/skeletons/SEQSkeleton';
import { 
  Clock, CheckCircle, XCircle, Bot, BookOpen, Loader2, 
  ArrowRight, AlertCircle, Sparkles, ThumbsUp, ThumbsDown, Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const SEQQuizPage = () => {
  useLayoutEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  }, []);

  const { subjectId, chapterId } = useParams<{ subjectId: string; chapterId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const startTimeRef = useRef<number>(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [currentSEQ, setCurrentSEQ] = useState<SEQ | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isLoadingSEQs, setIsLoadingSEQs] = useState(true);
  const [result, setResult] = useState<SEQEvaluationResult | null>(null);
  const [allSEQs, setAllSEQs] = useState<SEQ[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [references, setReferences] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showEvaluatingSkeleton, setShowEvaluatingSkeleton] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  const { search: searchReference, loading: isSearchingReference, data: referenceData } = useReferenceSearch();
  const referenceResults = referenceData?.results || [];

  useEffect(() => {
    const loadSEQs = async () => {
      if (!chapterId) return;
      setIsLoadingSEQs(true);
      const seqs = await fetchSEQByChapter(chapterId);
      if (seqs.length > 0) {
        setAllSEQs(seqs);
        setCurrentSEQ(seqs[0]);
      }
      setIsLoadingSEQs(false);
    };
    loadSEQs();
  }, [chapterId]);

  useEffect(() => {
    if (currentSEQ?.question) {
      searchReference(currentSEQ.question, 3);
    }
  }, [currentSEQ?.id]);

  useEffect(() => {
    if (referenceResults.length > 0) {
      const refText = referenceResults.map((r: any) => {
        const bookInfo = r.book ? `[${r.book}${r.page ? `, p.${r.page}` : ''}]` : '';
        const content = r.text || r.content || "";
        return `${bookInfo}\n${content}`.trim();
      }).join("\n\n");
      setReferences(refText);
    }
  }, [referenceResults]);

  const evaluateMutation = useMutation({
    mutationFn: async ({ userAnswer, question }: { userAnswer: string; question: string }) => {
      const evaluation = await evaluateSEQAnswer(userAnswer, question, references);
      return evaluation;
    },
    onSuccess: async (evaluation) => {
      setResult(evaluation);
      setIsEvaluating(false);
      setShowEvaluatingSkeleton(false);

      if (user && currentSEQ) {
        const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
        await saveSEQAnswer(
          currentSEQ.id,
          userAnswer,
          evaluation.is_correct,
          evaluation.satisfaction_index,
          evaluation.corrected_answer,
          evaluation.explanation,
          '',
          timeTaken
        );
      }
    },
    onError: () => {
      setIsEvaluating(false);
      setShowEvaluatingSkeleton(false);
      setShowErrorModal(true);
    }
  });

  useEffect(() => {
    if (currentSEQ && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentSEQ]);

  const handleSubmit = async () => {
    if (!currentSEQ || !userAnswer.trim() || isEvaluating) return;
    
    if (textareaRef.current) {
      textareaRef.current.blur();
      setTimeout(() => {
        setIsEvaluating(true);
        setShowEvaluatingSkeleton(true);
        startTimeRef.current = Date.now();
        
        const timeoutId = setTimeout(() => {
          setShowErrorModal(true);
          setIsEvaluating(false);
          setShowEvaluatingSkeleton(false);
        }, 15000);
        
        evaluateMutation.mutate({
          userAnswer,
          question: currentSEQ.question
        });
      }, 100);
    } else {
      setIsEvaluating(true);
      setShowEvaluatingSkeleton(true);
      startTimeRef.current = Date.now();
      
      setTimeout(() => {
        setShowErrorModal(true);
        setIsEvaluating(false);
        setShowEvaluatingSkeleton(false);
      }, 15000);
      
      evaluateMutation.mutate({
        userAnswer,
        question: currentSEQ.question
      });
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < allSEQs.length) {
      setCurrentIndex(nextIndex);
      setCurrentSEQ(allSEQs[nextIndex]);
      setUserAnswer('');
      setResult(null);
      startTimeRef.current = Date.now();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } else {
      navigate('/seqs');
    }
  };

  const handleBack = () => {
    if (subjectId && chapterId) {
      navigate(`/seqs/chapter/${subjectId}`);
    } else {
      navigate('/seqs');
    }
  };

  const getSatisfactionColor = (index: number) => {
    if (index >= 80) return 'text-green-500';
    if (index >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSatisfactionBg = (index: number) => {
    if (index >= 80) return 'bg-green-500';
    if (index >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (authLoading || profileLoading || isLoadingSEQs) {
    return (
      <MCQPageLayout backTo="/seqs">
        <div className="max-w-4xl mx-auto">
          <SEQQuizSkeleton />
        </div>
      </MCQPageLayout>
    );
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

  if (!subjectId || !chapterId || !currentSEQ) {
    return (
      <MCQPageLayout backTo="/seqs">
        <div className="text-center py-20">
          <p className="text-muted-foreground">No SEQ found for this chapter.</p>
          <Button onClick={() => navigate('/seqs')} className="mt-4 bg-orange-500 hover:bg-orange-600">
            Go Back
          </Button>
        </div>
      </MCQPageLayout>
    );
  }

  return (
    <MCQPageLayout backAction={handleBack} backLabel="Back to Chapters">
      <div className="max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-4"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 mb-2 block">
            Question {currentIndex + 1} of {allSEQs.length}
          </span>
          <Progress value={((currentIndex + 1) / allSEQs.length) * 100} className="h-1 bg-orange-100 dark:bg-orange-900/30" />
        </motion.div>

        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md -mx-4 px-4 py-3 mb-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800">
              <BookOpen className="w-3 h-3 mr-1" />
              SEQ Practice
            </Badge>
            {profile?.plan === 'free' && (
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-200">
                <Sparkles className="w-3 h-3 mr-1" />
                Free Plan
              </Badge>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isEvaluating ? (
            <motion.div
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-black uppercase italic text-foreground">
                    Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium text-foreground leading-relaxed">
                    {currentSEQ.question}
                  </p>
                </CardContent>
              </Card>
              <div className="flex justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
                  <p className="text-lg font-bold text-orange-600">AI is evaluating your answer...</p>
                  <p className="text-sm text-muted-foreground mt-2">This may take a few seconds</p>
                </div>
              </div>
            </motion.div>
          ) : !result ? (
            <motion.div
              key="question"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-black uppercase italic text-foreground">
                    Question
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium text-foreground leading-relaxed">
                    {currentSEQ.question}
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <label className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  Your Answer
                </label>
                <Textarea
                  ref={textareaRef}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Write your answer here..."
                  className="min-h-[200px] text-lg p-4 border-2 border-orange-200 dark:border-orange-800 focus:border-orange-500 focus:ring-orange-500"
                  disabled={isEvaluating}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmit}
                  disabled={!userAnswer.trim() || isEvaluating}
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30 rounded-2xl h-14 px-8 font-black uppercase tracking-wider"
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      Submit Answer
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ) : showEvaluatingSkeleton ? (
            <motion.div
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <SEQResultSkeleton />
              <div className="text-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  AI is analyzing your answer...
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <Card className={`border-2 shadow-lg ${
                result.is_correct 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                  : 'border-red-500 bg-red-50 dark:bg-red-900/10'
              }`}>
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-28 h-28 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'score', value: result.satisfaction_index },
                              { name: 'remaining', value: 100 - result.satisfaction_index }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={44}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            <Cell fill={result.satisfaction_index >= 80 ? '#22c55e' : result.satisfaction_index >= 50 ? '#f97316' : '#ef4444'} />
                            <Cell fill="#e5e7eb" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-2xl font-black text-foreground leading-none">{result.satisfaction_index}%</span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Score</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left">
                      <CardTitle className="text-lg font-black uppercase italic flex items-center gap-2 justify-center sm:justify-start">
                        {result.is_correct ? (
                          <>
                            <CheckCircle className="w-6 h-6 text-green-500" />
                            <span className="text-green-600">Correct!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-6 h-6 text-red-500" />
                            <span className="text-red-600">Needs Improvement</span>
                          </>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Based on book references and AI analysis
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      Your Answer (Corrected)
                    </h4>
                    <p className="text-muted-foreground leading-relaxed bg-white dark:bg-gray-900 rounded-lg p-3 border border-border">
                      {result.corrected_answer}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-orange-500" />
                      AI Explanation
                    </h4>
                    <p className="text-muted-foreground leading-relaxed bg-white dark:bg-gray-900 rounded-lg p-3 border border-border">
                      {result.explanation}
                    </p>
                  </div>

                  {referenceResults.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-orange-500" />
                        Book References
                      </h4>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {referenceResults.map((ref: any, idx: number) => (
                          <div
                            key={idx}
                            className="min-w-[240px] max-w-[240px] p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 shrink-0"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200">
                                {ref.book || 'Reference'}
                              </Badge>
                              {ref.page && (
                                <span className="text-[10px] text-muted-foreground ml-auto">p. {ref.page}</span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                              "{ref.content}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Button
                  onClick={() => {
                    setUserAnswer('');
                    setResult(null);
                    startTimeRef.current = Date.now();
                    if (textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                >
                  Try Again
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg rounded-2xl h-12 px-8 font-black uppercase tracking-wider"
                >
                  {currentIndex + 1 < allSEQs.length ? 'Next Question' : 'Finish'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="w-5 h-5" />
                Something went wrong
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                We're having trouble evaluating your answer right now. This could be due to a temporary network issue or high server load.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                  asChild
                >
                  <Link to="/contact">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Us
                  </Link>
                </Button>
                <a 
                  href="mailto:hi@medmacs.app" 
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-orange-500 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  hi@medmacs.app
                </a>
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button 
                onClick={() => {
                  setShowErrorModal(false);
                  navigate('/dashboard');
                }}
                variant="ghost"
                className="text-muted-foreground"
              >
                Go to Dashboard
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MCQPageLayout>
  );
};

export default SEQQuizPage;
