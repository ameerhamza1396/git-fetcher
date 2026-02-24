// FLPResultDetail.tsx
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ListChecks, Award, Calendar, BarChart, XCircle, CheckCircle, HelpCircle } from 'lucide-react';

// Import the QuestionBreakdownModal component
import QuestionBreakdownModal from '@/components/QuestionBreakdownModal'; // Adjust path if needed

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

  // --- Helper function to get score remarks ---
  const getScoreRemark = (percentage: number) => {
    if (percentage >= 90) {
      return {
        text: "Outstanding work! You've mastered these concepts.",
        color: "text-green-600 dark:text-green-400",
        icon: <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
      };
    } else if (percentage >= 75) {
      return {
        text: "Excellent performance! You're on the right track.",
        color: "text-blue-600 dark:text-blue-400",
        icon: <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      };
    } else if (percentage >= 50) {
      return {
        text: "Good effort! There's room for improvement in some areas.",
        color: "text-amber-600 dark:text-amber-400",
        icon: <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      };
    } else {
      return {
        text: "Keep learning! Focus on reviewing weaker topics.",
        color: "text-red-600 dark:text-red-400",
        icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      };
    }
  };

  // --- Loading States ---
  if (isLoadingResult || isLoadingMcqs) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10">
        <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-auto p-6 flex flex-col items-center">
          <CardContent className="text-center py-6 sm:py-8 flex flex-col items-center justify-center">
            {/* Custom Image Loader */}
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-402fb889f8c5.png"
              alt="Loading"
              className="w-24 h-24 sm:w-32 sm:h-32 animate-pulse mb-4"
            />
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-4">Loading detailed report...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Error States ---
  if (isErrorResult) {
    return (
      <div className="text-center text-red-500 mt-8">
        Error loading detailed result: {errorResult?.message}.
        <br />Please ensure the URL is correct or the test exists.
        <br /><Link to="/dashboard"><Button className="mt-4">Back to Dashboard</Button></Link> {/* Updated path and text */}
      </div>
    );
  }
  if (isErrorMcqs) {
    return (
      <div className="text-center text-red-500 mt-8">
        Error loading question details: {errorMcqs?.message}.
        <br />Some questions might be missing.
        <br /><Link to="/dashboard"><Button className="mt-4">Back to Dashboard</Button></Link> {/* Updated path and text */}
      </div>
    );
  }

  // --- No Result Found State ---
  if (!flpResult) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4">
            <Card className="p-8 text-center bg-white dark:bg-gray-800 shadow-xl border-purple-200 dark:border-purple-800 mx-auto max-w-lg">
                <CardTitle className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">Report Not Found</CardTitle>
                <CardContent>
                    <p className="text-md sm:text-lg text-gray-700 dark:text-gray-300 mb-6">
                        The Full-Length Paper result with ID "{testResultId}" could not be found.
                        This might happen if the ID is incorrect or the record was deleted.
                    </p>
                    <Link to="/dashboard"> {/* Updated path */}
                        <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700">
                            Go to Dashboard
                        </Button> {/* Updated text */}
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
  }

  // --- Main Content Display ---
  const scorePercentage = flpResult.total_questions > 0
    ? ((flpResult.score / flpResult.total_questions) * 100).toFixed(2)
    : '0.00';

  const remarks = getScoreRemark(parseFloat(scorePercentage));

  // Calculate correct, incorrect, unattempted counts
  const correctCount = flpResult.question_attempts.filter(a => a.isCorrect).length;
  const incorrectCount = flpResult.question_attempts.filter(a => !a.isCorrect && (a.selectedAnswer !== null && a.selectedAnswer !== '')).length;
  const unattemptedCount = flpResult.question_attempts.filter(a => a.selectedAnswer === null || a.selectedAnswer === '').length;


  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 p-4 sm:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header with Back Button and Title */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
          <Link to="/dashboard" className="mb-4 sm:mb-0"> {/* Updated path */}
            {/* Modified Button Styling */}
            <Button
              variant="ghost" // Use ghost variant for no background
              className="w-full sm:w-auto flex items-center text-purple-600 dark:text-purple-400 hover:bg-purple-100/50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Dashboard {/* Updated text */}
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center sm:text-right flex-grow">
            Detailed FLP Report
          </h1>
          <div className="hidden sm:block w-auto"></div>
        </div>

        {/* Summary Card */}
        <Card className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-800 dark:to-purple-950/20 shadow-lg border border-purple-100 dark:border-purple-800/50">
          <CardHeader className="text-center mb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-2">
              <BarChart className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" /> Your Performance Summary
            </CardTitle>
          </CardHeader>

          {/* CardContent: This must be a flex column container that fills its available height */}
          <CardContent className="flex flex-col h-full justify-between items-center text-center p-0">

            {/* Content area that should grow and push the button down */}
            <div className="flex-grow flex flex-col justify-center items-center w-full">

                {/* Score */}
                <div className="flex items-center justify-center gap-2 text-4xl sm:text-5xl font-extrabold text-purple-700 dark:text-purple-400 leading-none mb-2">
                    {flpResult.score} <span className="text-2xl sm:text-3xl text-gray-500 dark:text-gray-400">/</span> {flpResult.total_questions}
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold mb-6">
                  Score: <span className="text-purple-600 dark:text-purple-300">{scorePercentage}%</span>
                </p>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-6">
                    <Card className="p-4 bg-green-50/50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <CardContent className="flex flex-col items-center p-0">
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400 mb-2" />
                            <p className="text-md sm:text-lg font-bold text-green-700 dark:text-green-300">{correctCount}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Correct</p>
                        </CardContent>
                    </Card>
                    <Card className="p-4 bg-red-50/50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <CardContent className="flex flex-col items-center p-0">
                            <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 mb-2" />
                            <p className="text-md sm:text-lg font-bold text-red-700 dark:text-red-300">{incorrectCount}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Incorrect</p>
                        </CardContent>
                    </Card>
                    <Card className="p-4 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <CardContent className="flex flex-col items-center p-0">
                            <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-400 mb-2" />
                            <p className="text-md sm:text-lg font-bold text-amber-700 dark:text-amber-300">{unattemptedCount}</p>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Unattempted</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Remarks and Attempt Date (Responsive Ordering) */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-4 w-full">
                  <p className={`flex items-center justify-center gap-2 text-sm sm:text-md font-medium ${remarks.color} sm:order-1`}>
                    {remarks.icon} {remarks.text}
                  </p>
                  <p className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-0 sm:order-2">
                    <Calendar className="w-3 h-3 sm:w-4 h-4" /> Attempt Date: {new Date(flpResult.completed_at).toLocaleString()}
                  </p>
                </div>

            </div> {/* End of flex-grow div */}

            {/* Button to open the Question Breakdown Modal - Always at the bottom */}
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 w-full">
              {flpResult && mcqsData && (
                <QuestionBreakdownModal flpResult={flpResult} mcqsData={mcqsData}>
                  <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-md transition-all duration-200 ease-in-out hover:scale-[1.02]">
                    <ListChecks className="w-4 h-4 mr-2" /> View Question Breakdown
                  </Button>
                </QuestionBreakdownModal>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default FLPResultDetail;