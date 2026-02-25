// AITestGenerator.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Brain, Wand2, BookOpen, Play, Sparkles, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export const AITestGenerator: React.FC = () => {
  const { user } = useAuth();

  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedTestId, setSavedTestId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name, username').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

  const strip = (s: string) => s?.split(') ')[1]?.trim() || s?.trim();

  const handleGenerateTest = async () => {
    if (!user || !topic.trim()) {
      toast.error('Please enter a topic.');
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch('https://medistics-ai-bot.vercel.app/generate-ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), difficulty, questionCount, customPrompt: customPrompt.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data.questions)) throw new Error('Invalid response format.');

      const { data: savedTest, error: saveError } = await supabase
        .from('ai_generated_tests')
        .insert({ user_id: user.id, topic, difficulty, questions: data.questions, total_questions: data.questions.length })
        .select()
        .single();
      if (saveError) throw saveError;

      setSavedTestId(savedTest.id);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setTestSubmitted(false);
      toast.success(`Generated ${data.questions.length} questions!`);
    } catch (e: any) {
      console.error(e);
      toast.error(`Failed to generate test: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelect = (opt: string) => {
    setAnswers((a) => ({ ...a, [currentIndex]: opt }));
  };

  const goPrev = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex((i) => i + 1);

  const score = questions
    ? Object.entries(answers).reduce(
        (t, [idx, ans]) => strip(ans) === strip(questions[+idx].answer) ? t + 1 : t,
        0
      )
    : 0;

  const handleSubmitTest = async () => {
    setTestSubmitted(true);
    if (savedTestId && questions && user) {
      const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100 * 100) / 100 : 0;
      try {
        await supabase.from('ai_generated_tests').update({
          test_taken: true,
          score,
          accuracy,
        }).eq('id', savedTestId);
      } catch (e) {
        console.error('Error updating test results:', e);
      }
    }
  };

  // ─── Final Results ────────────────────────────────────────────────────
  if (testSubmitted && questions) {
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="max-w-xl mx-auto px-3">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-blue-500/5 to-violet-500/10 backdrop-blur-2xl border border-primary/20 shadow-2xl p-1.5">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(59,130,246,0.2) 20px, rgba(59,130,246,0.2) 40px)`,
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
          }} />
          <div className="relative z-10 bg-background/50 backdrop-blur-xl rounded-[1.5rem] border border-primary/10 p-6 text-center space-y-6">
            <Badge className="bg-gradient-to-r from-primary to-violet-500 text-white border-0 text-xs px-3 py-1">
              <Sparkles className="w-3 h-3 mr-1" /> AI Generated
            </Badge>
            <h2 className="text-2xl font-black text-foreground">Final Results</h2>
            <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">{score}/{questions.length}</p>
            <p className="text-muted-foreground text-sm">{accuracy}% accuracy</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => { setQuestions(null); setSavedTestId(null); }} className="bg-primary text-primary-foreground rounded-xl font-bold">Start New Test</Button>
              <Link to="/dashboard"><Button variant="outline" className="rounded-xl">Dashboard</Button></Link>
            </div>
          </div>
        </motion.div>

        <div className="text-center pt-6 pb-4">
          <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
          <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
        </div>
      </div>
    );
  }

  // ─── Initial Form ─────────────────────────────────────────────────────
  if (!questions) {
    const predefined = ['Biology - Homeostasis', 'Chemistry - Chemical Bonding', 'Physics - Force and Motion', 'English - Tenses'];
    return (
      <div className="max-w-lg mx-auto px-3">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-blue-500/5 to-violet-500/10 backdrop-blur-2xl border border-primary/20 shadow-2xl p-1.5">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(59,130,246,0.2) 20px, rgba(59,130,246,0.2) 40px)`,
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
          }} />
          <div className="relative z-10 bg-background/50 backdrop-blur-xl rounded-[1.5rem] border border-primary/10 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">AI Test Generator</h2>
                <Badge className="bg-gradient-to-r from-primary to-violet-500 text-white border-0 text-[10px] px-2">
                  <Sparkles className="w-2.5 h-2.5 mr-1" /> AI Powered
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic" className="text-foreground text-sm font-bold">Topic</Label>
              <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter MCAT topic…" className="rounded-xl bg-muted/20 border-border/30" />
              <p className="text-muted-foreground text-xs">Quick select:</p>
              <div className="flex flex-wrap gap-2">
                {predefined.map((t) => (
                  <Button key={t} variant="outline" size="sm" className="text-xs rounded-xl border-border/30 hover:bg-primary/10" onClick={() => setTopic(t)}>{t}</Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground text-sm font-bold">Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="rounded-xl bg-muted/20 border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground text-sm font-bold">Number of Questions</Label>
              <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(parseInt(v))}>
                <SelectTrigger className="rounded-xl bg-muted/20 border-border/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 5, 10].map((n) => (
                    <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground text-sm font-bold">Custom Prompt (optional)</Label>
              <Textarea rows={3} value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Add focus areas…" className="rounded-xl bg-muted/20 border-border/30 resize-none" />
            </div>

            <Button onClick={handleGenerateTest} disabled={isGenerating || !topic.trim()} className="w-full bg-gradient-to-r from-primary to-violet-500 text-white rounded-2xl h-12 font-black uppercase text-xs tracking-widest shadow-xl">
              {isGenerating ? 'Generating…' : <><Wand2 className="h-4 w-4 mr-2" />Generate AI Test</>}
            </Button>

            <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl text-sm text-foreground/80">
              <BookOpen className="inline-block mr-2 text-primary" />
              <span className="font-bold">How it works:</span>
              <ul className="mt-1 list-disc list-inside text-xs text-muted-foreground">
                <li>AI generates MCAT‐specific questions</li>
                <li>Includes explanations</li>
                <li>All at your chosen difficulty</li>
                <li>Saves your progress</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center pt-6 pb-4">
          <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
          <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
        </div>
      </div>
    );
  }

  // ─── Question View ────────────────────────────────────────────────────
  const q = questions[currentIndex]!;
  const userAns = answers[currentIndex];

  return (
    <div className="max-w-2xl mx-auto px-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-blue-500/5 to-violet-500/10 backdrop-blur-2xl border border-primary/20 shadow-2xl p-1.5">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(59,130,246,0.2) 20px, rgba(59,130,246,0.2) 40px)`,
              maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
            }} />
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/15 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />

            <div className="relative z-10 bg-background/50 backdrop-blur-xl rounded-[1.5rem] border border-primary/10 p-5 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Q{currentIndex + 1}/{questions.length}
                </span>
                <Badge className="bg-gradient-to-r from-primary to-violet-500 text-white border-0 text-[10px] px-2.5">
                  <Sparkles className="w-2.5 h-2.5 mr-1" /> AI Generated
                </Badge>
              </div>

              <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground mb-5">{q.question}</p>

              <div className="space-y-2.5">
                {q.options.map((opt, i) => {
                  const isSel = userAns === opt;
                  const isCorrect = strip(opt) === strip(q.answer);
                  const answered = userAns != null;

                  let optionClass = "w-full p-3.5 text-left rounded-xl transition-all duration-200 text-sm sm:text-base border cursor-pointer flex items-center justify-between ";
                  if (answered) {
                    if (isSel && isCorrect) optionClass += "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
                    else if (isSel && !isCorrect) optionClass += "bg-destructive/10 border-destructive/30 text-destructive";
                    else if (isCorrect) optionClass += "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                    else optionClass += "bg-muted/30 border-border/30 text-muted-foreground/50";
                  } else {
                    if (isSel) optionClass += "bg-primary/10 border-primary/30 text-foreground";
                    else optionClass += "bg-muted/20 border-border/30 text-foreground/80 hover:bg-muted/40 hover:border-border/50";
                  }

                  return (
                    <motion.button
                      key={opt}
                      className={optionClass}
                      disabled={answered}
                      onClick={() => handleSelect(opt)}
                      whileHover={!answered ? { scale: 1.01 } : {}}
                      whileTap={!answered ? { scale: 0.99 } : {}}
                    >
                      <span className="font-medium">{opt}</span>
                      {answered && isSel && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                      {answered && isSel && !isCorrect && <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />}
                      {answered && !isSel && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>

              {userAns && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-5 p-4 bg-muted/40 border border-border/30 rounded-xl">
                  <h4 className="font-bold text-foreground/90 mb-2 text-sm uppercase tracking-wider">Explanation</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{q.explanation}</p>
                </motion.div>
              )}

              <div className="flex justify-between mt-5">
                <Button onClick={goPrev} disabled={currentIndex === 0} variant="ghost" className="text-muted-foreground hover:text-foreground text-sm">Previous</Button>
                {currentIndex < questions.length - 1 ? (
                  <Button onClick={goNext} disabled={!userAns} className="bg-primary text-primary-foreground rounded-xl font-bold text-sm px-6">Next</Button>
                ) : (
                  <Button onClick={handleSubmitTest} disabled={!userAns} className="bg-gradient-to-r from-primary to-violet-500 text-white rounded-xl font-bold text-sm px-6">Final Result</Button>
                )}
              </div>

              {/* Best of luck */}
              <div className="mt-6 text-center space-y-1">
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-violet-500 text-xs uppercase tracking-[0.3em] font-black">Best of luck</p>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-500 text-base font-black truncate max-w-[250px] mx-auto">{displayName}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="text-center pt-6 pb-4">
        <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
      </div>
    </div>
  );
};
