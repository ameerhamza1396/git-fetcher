// AITestGenerator.tsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Brain, Wand2, BookOpen, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  const [questionCount, setQuestionCount] = useState(10);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [testSubmitted, setTestSubmitted] = useState(false);

  // Utility to strip the "X) " prefix
  const strip = (s: string) => s.split(') ')[1]?.trim();

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
        body: JSON.stringify({
          topic: topic.trim(),
          difficulty,
          questionCount,
          customPrompt: customPrompt.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (!Array.isArray(data.questions)) {
        throw new Error('Invalid response format.');
      }

      // Save to Supabase
      const { data: savedTest, error: saveError } = await supabase
        .from('ai_generated_tests')
        .insert({
          user_id: user.id,
          topic,
          difficulty,
          questions: data.questions,
          total_questions: data.questions.length,
        })
        .select()
        .single();
      if (saveError) throw saveError;

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
        (t, [idx, ans]) =>
          strip(ans) === strip(questions[+idx].answer) ? t + 1 : t,
        0
      )
    : 0;

  // ─── Final‐Results Screen ─────────────────────────────────────────────────────
  if (testSubmitted && questions) {
    return (
      <Card className="max-w-xl mx-auto my-16">
        <CardHeader>
          <CardTitle>Final Results</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p>You scored</p>
          <p className="text-4xl font-bold">
            {score} / {questions.length}
          </p>
          <div className="flex justify-center gap-4">
            {/* ← swapped order here */}
            <Button onClick={() => setQuestions(null)}>Start New Test</Button>
            <Link to="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Initial Form ─────────────────────────────────────────────────────────────
  if (!questions) {
    const predefined = [
      'Biology - Homeostasis',
      'Chemistry - Chemical Bonding',
      'Physics - Force and Motion',
      'English - Tenses',
    ];
    return (
      <Card className="max-w-lg mx-auto my-16">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>AI Test Generator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter MCAT topic…"
            />
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Quick select:
            </div>
            <div className="flex flex-wrap gap-2">
              {predefined.map((t) => (
                <Button
                  key={t}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setTopic(t)}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Number of Questions</Label>
            <Select
              value={questionCount.toString()}
              onValueChange={(v) => setQuestionCount(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 15, 20].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Custom Prompt (optional)</Label>
            <Textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add focus areas…"
            />
          </div>

          <Button
            onClick={handleGenerateTest}
            disabled={isGenerating || !topic.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              'Generating…'
            ) : (
              <>
                <Wand2 className="h-5 w-5 mr-2" />
                Generate AI Test
              </>
            )}
          </Button>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded text-sm text-blue-800 dark:text-blue-200">
            <BookOpen className="inline-block mr-2" />
            <span>How it works:</span>
            <ul className="mt-1 list-disc list-inside text-xs">
              <li>AI generates MCAT‐specific questions</li>
              <li>Includes explanations</li>
              <li>All at your chosen difficulty</li>
              <li>Saves your progress</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ─── Question View ────────────────────────────────────────────────────────────
  const q = questions[currentIndex]!;
  const userAns = answers[currentIndex];

  return (
    <Card className="max-w-2xl mx-auto my-16">
      <CardHeader>
        <CardTitle>
          Question {currentIndex + 1} of {questions.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-semibold">{q.question}</p>

        <div className="space-y-2">
          {q.options.map((opt) => {
            const isSel = userAns === opt;
            const isCorrect = strip(opt) === strip(q.answer);
            const answered = userAns != null;
            let bg = 'bg-gray-50 hover:bg-gray-100';
            if (answered) {
              if (isSel && isCorrect) bg = 'bg-green-100';
              else if (isSel && !isCorrect) bg = 'bg-red-100';
              else if (isCorrect) bg = 'bg-green-50';
            }
            return (
              <label
                key={opt}
                className={`flex items-center p-2 rounded cursor-pointer ${bg}`}
              >
                <input
                  type="radio"
                  name="opt"
                  className="mr-2 accent-purple-600"
                  disabled={answered}
                  checked={isSel}
                  onChange={() => handleSelect(opt)}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>

        {userAns && (
          <div className="p-3 bg-gray-100 rounded">
            <p className="font-medium">Correct Answer: {q.answer}</p>
            <p className="text-sm">{q.explanation}</p>
          </div>
        )}

        <div className="flex justify-between mt-4">
          <Button onClick={goPrev} disabled={currentIndex === 0}>
            Previous
          </Button>

          {currentIndex < questions.length - 1 ? (
            <Button onClick={goNext} disabled={!userAns}>
              Next
            </Button>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setTestSubmitted(true)}
              disabled={!userAns}
            >
              Final Result
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
