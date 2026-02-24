import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Define types for fetched data (should match your Supabase schema)
interface MCQAttempt {
  question_id: string;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  is_skipped: boolean;
  // You might need to extend this to include the question and explanation directly
  // For simplicity, we'll assume the question text and explanation are also available
  // either in this table or can be joined.
  // For now, let's assume `mcqs` table provides `question` and `explanation`
}

interface TestResult {
  id: string;
  user_id: string;
  username: string;
  score: number;
  total_questions: number;
  completed_at: string;
  test_config_id: string;
  // This will hold the detailed attempts joined or fetched separately
  question_attempts: MCQAttempt[];
}

// Re-using the MCQ type from FLPQuiz for detailed question info
interface MCQ {
    id: string;
    question: string;
    options: string[];
    correct_answer: string;
    explanation: string;
}

export const FLPResults = () => {
  const { testResultId } = useParams<{ testResultId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [mcqDetails, setMcqDetails] = useState<Record<string, MCQ>>({}); // To store original MCQ details
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!testResultId) {
        setError("No test result ID provided.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch overall test result
        const { data: resultData, error: resultError } = await supabase
          .from('flp_user_attempts') // Fetch from the new table
          .select('id, user_id, username, score, total_questions, completed_at, test_config_id, question_attempts') // Ensure question_attempts is selected as JSONB
          .eq('id', testResultId)
          .single();

        if (resultError) {
          throw resultError;
        }

        if (!resultData) {
          setError("Test result not found.");
          setLoading(false);
          return;
        }

        setTestResult(resultData as TestResult); // Cast to TestResult type

        // Extract all MCQ IDs from the question_attempts to fetch their details
        const mcqIds = (resultData.question_attempts as MCQAttempt[]).map(attempt => attempt.question_id);

        if (mcqIds.length > 0) {
            const { data: fetchedMcqs, error: mcqError } = await supabase
                .from('mcqs') // Your original MCQs table
                .select('id, question, options, correct_answer, explanation')
                .in('id', mcqIds);

            if (mcqError) {
                throw mcqError;
            }

            const mcqMap: Record<string, MCQ> = {};
            fetchedMcqs?.forEach(mcq => {
                mcqMap[mcq.id] = mcq;
            });
            setMcqDetails(mcqMap);
        }

      } catch (err: any) {
        console.error("Error fetching FLP results:", err.message);
        setError(`Failed to load results: ${err.message}`);
        toast({
          title: "Error",
          description: `Failed to load results: ${err.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [testResultId, toast]);

  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <img
        src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
        alt="Loading Medistics"
        className="w-32 h-32 object-contain"
      />
    </div>
  );
}

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-600 dark:text-red-400">
        <p className="text-lg">{error}</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  if (!testResult) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-gray-600 dark:text-gray-400">
        <p className="text-lg">No results found for this test ID.</p>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  const { score, total_questions, question_attempts } = testResult;
  const percentage = total_questions > 0 ? Math.round((score / total_questions) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0 py-8">
      <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center pb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            FLP Results
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            You scored: <span className="font-bold text-purple-600 dark:text-purple-400">{score} / {total_questions}</span>
            <br />
            Percentage: <span className="font-bold text-purple-600 dark:text-purple-400">{percentage}%</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {question_attempts.map((attempt, idx) => {
            const originalMCQ = mcqDetails[attempt.question_id];
            if (!originalMCQ) {
                // This case should ideally not happen if data is consistent
                return <div key={idx} className="text-red-500">Error: MCQ details not found for question ID {attempt.question_id}</div>;
            }

            // Shuffle options for consistent display if they were shuffled in quiz
            const shuffledOptionsForDisplay = originalMCQ.options; // Assuming you want to display them as they were in the quiz component

            return (
              <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                  Question {idx + 1}: {originalMCQ.question}
                </h3>
                <ul className="space-y-1 mb-2">
                  {shuffledOptionsForDisplay.map((option, optIdx) => {
                    const isSelected = attempt.user_answer === option;
                    const isCorrectOption = originalMCQ.correct_answer === option;
                    let optionClass = "p-2 rounded-md text-sm ";

                    if (isCorrectOption) {
                      optionClass += "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-medium";
                    } else if (isSelected && !isCorrectOption) {
                      optionClass += "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 font-medium line-through";
                    } else {
                      optionClass += "text-gray-700 dark:text-gray-300";
                    }

                    return (
                      <li key={optIdx} className={optionClass}>
                        {String.fromCharCode(65 + optIdx)}. {option}
                        {isSelected && !isCorrectOption && <XCircle className="inline-block w-4 h-4 ml-2 text-red-600" />}
                        {isCorrectOption && <CheckCircle className="inline-block w-4 h-4 ml-2 text-green-600" />}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 text-sm mb-1">Explanation:</h4>
                  <p className="text-blue-800 dark:text-blue-300 text-sm">{originalMCQ.explanation}</p>
                </div>
              </div>
            );
          })}
          <div className="text-center pt-4">
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
            >
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};