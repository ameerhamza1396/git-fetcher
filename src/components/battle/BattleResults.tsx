
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Home, RefreshCw, Medal, Target, Clock, Zap } from 'lucide-react';

interface BattleResultsProps {
  results: {
    finalScore: number;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    rank: number;
    roomCode: string;
  };
  onReturnToLobby: () => void;
}

export const BattleResults = ({ results, onReturnToLobby }: BattleResultsProps) => {
  const getPerformanceMessage = () => {
    if (results.accuracy >= 90) return { message: "Outstanding Performance! 🏆", color: "text-yellow-500" };
    if (results.accuracy >= 80) return { message: "Excellent Work! 🥇", color: "text-green-500" };
    if (results.accuracy >= 70) return { message: "Great Job! 🥈", color: "text-blue-500" };
    if (results.accuracy >= 60) return { message: "Good Effort! 🥉", color: "text-orange-500" };
    return { message: "Keep Practicing! 💪", color: "text-gray-500" };
  };

  const performance = getPerformanceMessage();

  const getRankIcon = () => {
    switch (results.rank) {
      case 1: return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 2: return <Medal className="w-8 h-8 text-gray-400" />;
      case 3: return <Medal className="w-8 h-8 text-orange-600" />;
      default: return <Target className="w-8 h-8 text-blue-500" />;
    }
  };

  const getRankText = () => {
    switch (results.rank) {
      case 1: return "1st Place";
      case 2: return "2nd Place";
      case 3: return "3rd Place";
      default: return `${results.rank}th Place`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <Card className="w-full max-w-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            {getRankIcon()}
          </div>
          <CardTitle className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Battle Complete!
          </CardTitle>
          <CardDescription className="text-lg">
            Room: <span className="font-mono text-purple-600 dark:text-purple-400">{results.roomCode}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Rank and Performance */}
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-2xl px-6 py-3 font-bold">
              {getRankText()}
            </Badge>
            <p className={`text-xl font-semibold ${performance.color}`}>
              {performance.message}
            </p>
          </div>

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 p-4 rounded-lg text-center">
              <Zap className="w-6 h-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {results.finalScore}
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">Total Score</p>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 p-4 rounded-lg text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
              <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                {results.correctAnswers}/{results.totalQuestions}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">Correct</p>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 p-4 rounded-lg text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {results.accuracy.toFixed(0)}%
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">Accuracy</p>
            </div>

            <div className="bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 p-4 rounded-lg text-center">
              <Medal className="w-6 h-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                #{results.rank}
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400">Rank</p>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Performance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Questions Answered:</span>
                <span className="font-medium text-gray-900 dark:text-white">{results.totalQuestions}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Success Rate:</span>
                <span className="font-medium text-gray-900 dark:text-white">{results.accuracy.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Points per Question:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(results.finalScore / results.totalQuestions).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Final Placement:</span>
                <span className="font-medium text-gray-900 dark:text-white">{getRankText()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button
              onClick={onReturnToLobby}
              className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 text-lg font-semibold"
            >
              <Home className="w-5 h-5 mr-2" />
              Return to Lobby
            </Button>
            <Button
              onClick={onReturnToLobby}
              variant="outline"
              className="flex-1 border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/30 py-3 text-lg font-semibold"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Play Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
