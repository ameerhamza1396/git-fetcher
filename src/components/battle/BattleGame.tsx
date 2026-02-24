// BattleGame.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, Trophy, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BattleGameProps {
  roomData: {
    id: string;
    room_code: string;
    battle_type: '1v1' | '2v2' | 'ffa';
    max_players: number;
    time_per_question: number;
    total_questions: number;
    subject: string;
    subject_id?: string;
    chapter_id?: string;
    battle_participants: { 
      id: string; 
      user_id: string; 
      username: string; 
      score: number; 
      answers?: any[];
      is_finished?: boolean;
    }[];
  };
  userId: string;
  onGameComplete: (results: {
    finalScore: number;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    rank: number;
    roomCode: string;
  }) => void; 
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export const BattleGame = ({ roomData, userId, onGameComplete }: BattleGameProps) => {
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roomData.time_per_question);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [gameFinishedLocally, setGameFinishedLocally] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadQuestionsFromDatabase();
  }, [roomData.chapter_id, roomData.total_questions]);

  const loadQuestionsFromDatabase = async () => {
    try {
      setIsLoading(true);
      
      if (!roomData.chapter_id) {
        console.error('No chapter_id provided, falling back to sample questions');
        loadSampleQuestions();
        return;
      }

      console.log('Loading questions for chapter:', roomData.chapter_id);
      
      const { data: mcqs, error } = await supabase
        .from('mcqs')
        .select('id, question, options, correct_answer, explanation')
        .eq('chapter_id', roomData.chapter_id)
        .limit(roomData.total_questions * 2);

      if (error) {
        console.error('Error fetching MCQs:', error);
        toast({
          title: "Error Loading Questions",
          description: "Failed to load questions from database. Using sample questions.",
          variant: "destructive",
        });
        loadSampleQuestions();
        return;
      }

      if (!mcqs || mcqs.length === 0) {
        console.warn('No MCQs found for chapter, using sample questions');
        toast({
          title: "No Questions Available",
          description: "No questions found for this topic. Using sample questions.",
        });
        loadSampleQuestions();
        return;
      }

      const transformedQuestions: Question[] = mcqs.map(mcq => {
        let options: string[] = [];
        
        // Handle different option formats
        if (Array.isArray(mcq.options)) {
          options = mcq.options as string[];
        } else if (typeof mcq.options === 'string') {
          try {
            options = JSON.parse(mcq.options);
          } catch {
            options = [];
          }
        }
        
        return {
          id: mcq.id,
          question: mcq.question,
          options: options,
          correct_answer: mcq.correct_answer,
          explanation: mcq.explanation || undefined
        };
      });

      const shuffledQuestions = transformedQuestions
        .sort(() => Math.random() - 0.5)
        .slice(0, roomData.total_questions);

      setQuestions(shuffledQuestions);
      console.log(`Loaded ${shuffledQuestions.length} questions from database`);

    } catch (error) {
      console.error('Error in loadQuestionsFromDatabase:', error);
      toast({
        title: "Error",
        description: "Failed to load questions. Using sample questions.",
        variant: "destructive",
      });
      loadSampleQuestions();
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleQuestions = () => {
    const sampleQuestions: Question[] = [
      {
        id: 'sample_1',
        question: 'What is the powerhouse of the cell?',
        options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
        correct_answer: 'Mitochondria',
        explanation: 'Mitochondria are known as the powerhouse of the cell because they produce ATP.'
      },
      {
        id: 'sample_2',
        question: 'Which organ system is responsible for transporting blood throughout the body?',
        options: ['Respiratory system', 'Digestive system', 'Circulatory system', 'Nervous system'],
        correct_answer: 'Circulatory system',
        explanation: 'The circulatory system, consisting of the heart and blood vessels, transports blood throughout the body.'
      },
      {
        id: 'sample_3',
        question: 'What is the basic unit of heredity?',
        options: ['Chromosome', 'Gene', 'DNA', 'Protein'],
        correct_answer: 'Gene',
        explanation: 'A gene is the basic unit of heredity that carries genetic information.'
      },
      {
        id: 'sample_4',
        question: 'Which part of the brain controls balance and coordination?',
        options: ['Cerebrum', 'Cerebellum', 'Brainstem', 'Hypothalamus'],
        correct_answer: 'Cerebellum',
        explanation: 'The cerebellum is responsible for balance, coordination, and fine motor control.'
      },
      {
        id: 'sample_5',
        question: 'What type of blood cell fights infections?',
        options: ['Red blood cells', 'White blood cells', 'Platelets', 'Plasma cells'],
        correct_answer: 'White blood cells',
        explanation: 'White blood cells are part of the immune system and help fight infections.'
      }
    ];

    setQuestions(sampleQuestions.slice(0, roomData.total_questions));
  };

  useEffect(() => {
    if (!isLoading && !gameFinishedLocally) {
      startTimer();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentQuestionIndex, isLoading, gameFinishedLocally]);

  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimeLeft(roomData.time_per_question);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    handleAnswerSubmit(null);
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    
    setTimeout(() => {
      handleAnswerSubmit(answer);
    }, 500);
  };

  const handleAnswerSubmit = async (answer: string | null) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = answer === currentQuestion.correct_answer;
    
    let questionScore = 0;
    if (isCorrect) {
      const timeBonus = Math.max(0, timeLeft);
      questionScore = 100 + timeBonus * 2;
      setScore(prev => prev + questionScore);
      
      toast({
        title: "Correct! 🎉",
        description: `+${questionScore} points (including time bonus)`,
      });
    } else {
      toast({
        title: "Incorrect ❌",
        description: `Correct answer: ${currentQuestion.correct_answer}`,
        variant: "destructive",
      });
    }

    try {
      console.log('Attempting to fetch participant for room:', roomData.id, 'user:', userId);
      const { data: participantData, error: fetchError } = await supabase
        .from('battle_participants')
        .select('score, answers')
        .eq('battle_room_id', roomData.id)
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching participant:', fetchError);
        console.warn('Participant not found or multiple found. Ensure battle_participants has unique (battle_room_id, user_id) constraint.', fetchError);
        if (fetchError.code === 'PGRST116') {
          console.log('Participant not found, attempting to insert new one.');
          const { error: insertError } = await supabase
            .from('battle_participants')
            .insert({
              battle_room_id: roomData.id,
              user_id: userId,
              username: "Player",
              score: 0,
              answers: [],
              is_finished: false
            });
          if (insertError) {
            console.error('Error inserting new participant:', insertError);
            throw insertError;
          }
          console.log('New participant inserted after initial fetch failed.');
        } else {
          throw fetchError;
        }
      }

      const existingAnswers = participantData?.answers || [];
      const updatedScore = (participantData?.score || 0) + questionScore;

      console.log('Attempting to update participant with score:', updatedScore, 'and answers:', existingAnswers.length + 1);
      const { error: updateError } = await supabase
        .from('battle_participants')
        .update({
          score: updatedScore,
          answers: [...existingAnswers, {
            questionId: currentQuestion.id,
            selectedAnswer: answer,
            isCorrect,
            timeLeft,
            points: questionScore
          }]
        })
        .eq('battle_room_id', roomData.id)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating participant:', updateError);
        throw updateError;
      }

      console.log('Answer and score saved to battle_participants successfully.');
    } catch (error) {
      console.error('Error in handleAnswerSubmit (Supabase operation failed):', error);
      toast({
        title: "Error",
        description: `Failed to save answer: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        variant: "destructive"
      });
    }

    setTimeout(() => {
      if (currentQuestionIndex + 1 >= questions.length) {
        finishGame();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
      }
    }, 2000);
  };

  const finishGame = async () => {
    setGameFinishedLocally(true);
    
    try {
      console.log('Attempting to update final score and finish status for current participant.');
      const { error: updateParticipantError } = await supabase
        .from('battle_participants')
        .update({ score: score, is_finished: true })
        .eq('battle_room_id', roomData.id)
        .eq('user_id', userId);

      if (updateParticipantError) {
        console.error('Error updating final participant status:', updateParticipantError);
        throw updateParticipantError;
      }
      console.log('Final score and finished status updated for current participant successfully.');

      console.log('Fetching all participants for room:', roomData.id, 'to calculate ranks.');
      const { data: allParticipants, error: fetchParticipantsError } = await supabase
        .from('battle_participants')
        .select('user_id, username, score')
        .eq('battle_room_id', roomData.id);

      if (fetchParticipantsError) {
        console.error('Error fetching all participants for ranking:', fetchParticipantsError);
        toast({
          title: "Error",
          description: `Failed to fetch participant data for ranking: ${fetchParticipantsError.message}`,
          variant: "destructive"
        });
        return;
      }
      console.log('Fetched participants:', allParticipants);

      const updatedParticipants = allParticipants.map(p => 
        p.user_id === userId ? { ...p, score: score } : p
      );

      const sortedParticipants = [...updatedParticipants].sort((a, b) => b.score - a.score);
      console.log('Sorted participants for rank calculation:', sortedParticipants);

      const playerRank = sortedParticipants.findIndex(p => p.user_id === userId) + 1;
      console.log('Calculated player rank:', playerRank);

      const totalCorrect = Math.floor(score / 100);
      const accuracyPercentage = (totalCorrect / questions.length) * 100;

      console.log('Attempting to upsert battle results with calculated rank:', playerRank);
      const { error: upsertResultError } = await supabase
        .from('battle_results')
        .upsert({
          battle_room_id: roomData.id,
          user_id: userId,
          final_score: score,
          rank: playerRank,
          total_correct: totalCorrect,
          total_questions: questions.length,
          accuracy_percentage: accuracyPercentage,
          time_bonus: score - (totalCorrect * 100)
        }, { onConflict: 'battle_room_id,user_id' });

      if (upsertResultError) {
        console.error('Error upserting battle results:', upsertResultError);
        throw upsertResultError;
      }
      console.log('Battle results (including client-side calculated rank) upserted successfully.');

      const results = {
        finalScore: score,
        totalQuestions: questions.length,
        correctAnswers: totalCorrect,
        accuracy: accuracyPercentage,
        rank: playerRank,
        roomCode: roomData.room_code
      };

      setTimeout(() => {
        onGameComplete(results);
      }, 2000);

    } catch (error) {
      console.error('Error in finishGame (Supabase operation failed):', error);
      toast({
        title: "Error",
        description: `Failed to save game results or calculate rank: ${error instanceof Error ? error.message : JSON.stringify(error)}`,
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <Card className="w-full max-w-md p-8 text-center">
          <CardTitle className="text-2xl mb-4">Loading Questions...</CardTitle>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-4">
            Fetching questions from {roomData.subject}
          </p>
        </Card>
      </div>
    );
  }

  if (gameFinishedLocally) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <Card className="w-full max-w-md p-8 text-center">
          <CardTitle className="text-2xl mb-4 flex items-center justify-center">
            <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
            Battle Complete!
          </CardTitle>
          <p className="text-lg font-semibold text-purple-600 dark:text-purple-400">
            Final Score: {score}
          </p>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Calculating ranks...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mt-4"></div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4">
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Users className="w-4 h-4 mr-2" />
            Room: {roomData.room_code}
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            <Trophy className="w-4 h-4 mr-2" />
            Score: {score}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-red-500" />
            <span className={`font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700 dark:text-gray-300'}`}>
              {timeLeft}s
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-center">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentQuestion.options.map((option, index) => {
            const letters = ['A', 'B', 'C', 'D'];
            const isSelected = selectedAnswer === option;
            const isCorrect = selectedAnswer && option === currentQuestion.correct_answer;
            const isWrong = selectedAnswer && selectedAnswer !== currentQuestion.correct_answer && isSelected;
            
            return (
              <Button
                key={index}
                variant="outline"
                className={`w-full p-4 h-auto text-left justify-start text-wrap ${
                  isCorrect ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-400 dark:text-green-200' :
                  isWrong ? 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-400 dark:text-red-200' :
                  isSelected ? 'bg-blue-100 border-blue-500 dark:bg-blue-900/30 dark:border-blue-400' :
                  'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => handleAnswerSelect(option)}
                disabled={selectedAnswer !== null}
              >
                <div className="flex items-start space-x-3">
                  <Badge variant="secondary" className="mt-0.5 flex-shrink-0">
                    {letters[index]}
                  </Badge>
                  <span className="flex-1">{option}</span>
                  {isCorrect && <Zap className="w-4 h-4 text-green-600 flex-shrink-0" />}
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      <div className="max-w-4xl mx-auto mt-6 text-center">
        <Badge variant="secondary" className="px-4 py-2">
          {roomData.battle_type.toUpperCase()} Battle • {roomData.subject}
        </Badge>
      </div>
    </div>
  );
};
// This component handles the battle game logic, including question loading, answer submission, and game completion.