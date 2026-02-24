// FLPResultDetail.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, CheckCircle, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

// Import Accordion components
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// ---
// Define types (ensure these match your database schemas)
interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  chapter_id?: string;
}

interface QuestionAttempt {
  mcq_id: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
  timeTaken: number;
}

interface FLPAttempt {
  id: string;
  user_id: string;
  username: string;
  score: number;
  total_questions: number;
  completed_at: string; // ISO string (e.g., "2023-10-27T10:00:00Z")
  question_attempts: QuestionAttempt[]; // This is the JSONB array column in your DB
  test_config_id: string;
}

// ---

const FLPResultDetail = () => {
  const { id: testResultId } = useParams<{ id: string }>();

  const {
    data: flpResult,
    isLoading: isLoadingResult,
    isError: isErrorResult,
    error: errorResult
  } = useQuery<FLPAttempt, Error>({
    queryKey: ['flpResultDetail', testResultId],
    queryFn: async () => {
      if (!testResultId) {
        throw new Error("Test Result ID is missing in the URL. Cannot fetch detailed report.");
      }
      const { data, error } = await supabase
        .from('flp_user_attempts')
        .select('*')
        .eq('id', testResultId)
        .single();

      if (error) {
        throw new Error(`Error fetching FLP result: ${error.message}`);
      }
      return data;
    },
    enabled: !!testResultId,
    staleTime: 5 * 60 * 1000,
  });

  const mcqIds = flpResult?.question_attempts.map(attempt => attempt.mcq_id) || [];

  const {
    data: mcqsData,
    isLoading: isLoadingMcqs,
    isError: isErrorMcqs,
    error: errorMcqs
  } = useQuery<MCQ[], Error>({
    queryKey: ['flpMcqsDetail', mcqIds],
    queryFn: async () => {
      if (mcqIds.length === 0) {
        return [];
      }
      const { data, error } = await supabase
        .from('mcqs')
        .select('*')
        .in('id', mcqIds);

      if (error) {
        throw new Error(`Error fetching MCQs: ${error.message}`);
      }
      return data;
    },
    enabled: !!flpResult && flpResult.question_attempts.length > 0 && mcqIds.length > 0,
    staleTime: Infinity,
  });

  if (isLoadingResult || isLoadingMcqs) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-2 sm:mx-0">
          <CardContent className="text-center py-6 sm:py-8 flex flex-col items-center justify-center h-full">
            <div className="flex justify-center items-end h-24 space-x-2">
              <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0s' }}></div>
              <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-3 h-12 bg-purple-600 dark:bg-purple-400 rounded-full wave-bar" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-4">Loading detailed report...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isErrorResult) {
    return (
      <div className="text-center text-red-500 mt-8">
        Error loading detailed result: {errorResult?.message}.
        <br />Please ensure the URL is correct or the test exists.
        <br /><Link to="/dashboard"><Button className="mt-4">Dashboard</Button></Link>
      </div>
    );
  }
  if (isErrorMcqs) {
    return (
      <div className="text-center text-red-500 mt-8">
        Error loading question details: {errorMcqs?.message}.
        <br />Some questions might be missing.
        <br /><Link to="/dashboard"><Button className="mt-4">Dashboard</Button></Link>
      </div>
    );
  }

  if (!flpResult) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4">
            <Card className="p-8 text-center bg-white dark:bg-gray-800 shadow-xl border-purple-200 dark:border-purple-800">
                <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Report Not Found</CardTitle>
                <CardContent>
                    <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                        The Full-Length Paper result with ID "{testResultId}" could not be found.
                        This might happen if the ID is incorrect or the record was deleted.
                    </p>
                    <Link to="/dashboard">
                        <Button className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                            Dasboard
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  const mcqMap = new Map(mcqsData?.map(mcq => [mcq.id, mcq]) || []);
  const scorePercentage = flpResult.total_questions > 0
    ? ((flpResult.score / flpResult.total_questions) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4 sm:p-8">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <Link to="/results/dashboard">
            <Button variant="outline" className="flex items-center bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600">
              <ChevronLeft className="w-4 h-4 mr-2" /> Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Detailed FLP Report</h1>
          <div className="w-24"></div>
        </div>

        <Card className="mb-8 p-6 bg-white dark:bg-gray-800 shadow-lg border-purple-200 dark:border-purple-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white">Your Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-4xl font-extrabold text-purple-600 dark:text-purple-400 mb-2">
              {flpResult.score} / {flpResult.total_questions}
            </p>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Score: {scorePercentage}%
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Attempt Date: {new Date(flpResult.completed_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Question-by-Question Breakdown</h2>

        <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-260px)] lg:h-[calc(100vh-200px)] pr-4">
          {/* Use Accordion to wrap all questions */}
          <Accordion type="single" collapsible className="w-full">
            {flpResult.question_attempts.map((attempt, index) => {
              const originalMcq = mcqMap.get(attempt.mcq_id);
              if (!originalMcq) {
                return (
                  <AccordionItem value={`item-${attempt.mcq_id}`} key={attempt.mcq_id}>
                    <AccordionTrigger className="text-red-500 hover:no-underline">
                        Question {index + 1}: Details not found for ID: {attempt.mcq_id}
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="p-4 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
                        <CardContent>
                          <p className="text-red-500">
                            Error: Question details could not be loaded for this entry. It might have been removed from the database.
                          </p>
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                );
              }

              const isCorrectAttempt = attempt.isCorrect;
              const triggerColorClass = isCorrectAttempt
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-700 dark:text-red-400';
              const icon = isCorrectAttempt ? (
                <CheckCircle className="w-5 h-5 ml-2" />
              ) : (
                <XCircle className="w-5 h-5 ml-2" />
              );

              return (
                <AccordionItem value={`item-${attempt.mcq_id}`} key={attempt.mcq_id} className={`border-b border-gray-200 dark:border-gray-700 ${isCorrectAttempt ? 'bg-green-50/10 dark:bg-green-900/10' : 'bg-red-50/10 dark:bg-red-900/10'}`}>
                  <AccordionTrigger className={`flex items-center justify-between text-left font-semibold hover:no-underline px-4 py-3 rounded-t-md ${triggerColorClass}`}>
                    <span className="flex items-center">
                      Question {index + 1}: {originalMcq.question.substring(0, 100)}{originalMcq.question.length > 100 ? '...' : ''} {/* Truncate long questions */}
                      {icon}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                      {originalMcq.options.map((option, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-md transition-colors duration-200
                            ${option === originalMcq.correct_answer
                              ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                              : attempt.selectedAnswer === option
                                ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                                : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          {option}
                          {option === originalMcq.correct_answer && (
                            <span className="ml-2 font-medium"> (Correct Answer)</span>
                          )}
                          {attempt.selectedAnswer === option && attempt.selectedAnswer !== originalMcq.correct_answer && (
                            <span className="ml-2 font-medium"> (Your Answer)</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {originalMcq.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-blue-800 dark:text-blue-200">
                        <h4 className="font-semibold mb-1">Explanation:</h4>
                        <p className="text-sm">{originalMcq.explanation}</p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </ScrollArea>
      </div>
    </div>
  );
};

export default FLPResultDetail;