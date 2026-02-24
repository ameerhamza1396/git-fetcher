// src/components/QuestionBreakdownModal.tsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// --- Types (Can be imported from a shared types file if available)
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
  completed_at: string; // ISO string
  question_attempts: QuestionAttempt[];
  test_config_id: string;
}
// ---

interface QuestionBreakdownModalProps {
  flpResult: FLPAttempt;
  mcqsData: MCQ[];
  children: React.ReactElement; // Explicitly type as a single React element
}

const QuestionBreakdownModal: React.FC<QuestionBreakdownModalProps> = ({ flpResult, mcqsData, children }) => {
  const mcqMap = new Map(mcqsData?.map(mcq => [mcq.id, mcq]) || []);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {React.cloneElement(children)}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Question Breakdown</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Review each question, your answer, the correct answer, and explanations.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow pr-4 -mr-4">
          <div className="space-y-4 py-2">
            <Accordion type="single" collapsible className="w-full">
              {flpResult.question_attempts.map((attempt, index) => {
                const originalMcq = mcqMap.get(attempt.mcq_id);
                if (!originalMcq) {
                  return (
                    <AccordionItem value={`item-${attempt.mcq_id}`} key={attempt.mcq_id}
                      className="rounded-md mb-2 overflow-hidden transition-all duration-200 ease-in-out bg-gray-50 dark:bg-gray-700" // Default for missing, neutral bg
                    >
                      <AccordionTrigger className="text-gray-900 dark:text-gray-100 hover:no-underline px-4 py-3">
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

                // Determine the state of the attempt
                const isCorrectAttempt = attempt.isCorrect;
                const isUnattempted = (attempt.selectedAnswer === null || attempt.selectedAnswer === '');

                let itemBgClasses = '';
                let icon = null;

                if (isUnattempted) {
                  itemBgClasses = 'bg-amber-50 dark:bg-amber-950/20'; // Lighter amber tint for bg
                  icon = <AlertCircle className="w-5 h-5 ml-2 text-amber-600 dark:text-amber-400" />;
                } else if (isCorrectAttempt) {
                  itemBgClasses = 'bg-green-50 dark:bg-green-950/20'; // Lighter green tint for bg
                  icon = <CheckCircle className="w-5 h-5 ml-2 text-green-600 dark:text-green-400" />;
                } else { // Incorrect
                  itemBgClasses = 'bg-red-50 dark:bg-red-950/20'; // Lighter red tint for bg
                  icon = <XCircle className="w-5 h-5 ml-2 text-red-600 dark:text-red-400" />;
                }

                return (
                  <AccordionItem
                    value={`item-${attempt.mcq_id}`}
                    key={attempt.mcq_id}
                    className={`
                      rounded-md mb-2 overflow-hidden transition-all duration-200 ease-in-out
                      ${itemBgClasses}
                    `}
                  >
                    <AccordionTrigger className="flex items-center justify-between text-left font-semibold hover:no-underline px-4 py-3 text-gray-900 dark:text-gray-100">
                      <span className="flex items-center">
                        Question {index + 1}: {originalMcq.question.substring(0, 100)}{originalMcq.question.length > 100 ? '...' : ''}
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
                                : (attempt.selectedAnswer === option && !isUnattempted)
                                  ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                                  : 'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                            }
                          `}
                        >
                          {option}
                          {option === originalMcq.correct_answer && (
                            <span className="ml-2 font-medium"> (Correct Answer)</span>
                          )}
                          {attempt.selectedAnswer === option && !isUnattempted && attempt.selectedAnswer !== originalMcq.correct_answer && (
                            <span className="ml-2 font-medium"> (Your Answer)</span>
                          )}
                          {isUnattempted && option === originalMcq.correct_answer && (
                            <span className="ml-2 font-medium text-amber-700 dark:text-amber-300"> (Unattempted)</span>
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
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default QuestionBreakdownModal;