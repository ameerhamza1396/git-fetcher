import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Home, RefreshCw, Medal, Target, Zap, Users, ListChecks, X } from 'lucide-react';

interface BattleResultsProps {
  results: {
    finalScore: number;
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    rank: number;
    roomCode: string;
    battleType?: '1v1' | '2v2' | 'ffa';
    rankings?: any[];
    teamRankings?: any[];
    answers?: any[];
  };
  onReturnToLobby: () => void;
}

export const BattleResults = ({ results, onReturnToLobby }: BattleResultsProps) => {
  const isTeamBattle = results.battleType === '2v2';
  const winningTeam = results.teamRankings?.[0];
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const answers = results.answers || [];

  return (
    <div className="h-dvh overflow-hidden bg-transparent px-4 py-[calc(env(safe-area-inset-top)+12px)] pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-3">
        <Card className="shrink-0 border-primary/20 bg-primary/5 shadow-sm">
          <CardHeader className="px-4 pb-3 pt-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Trophy className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-black text-foreground">Battle Complete</CardTitle>
            <CardDescription className="text-sm">
              Room <span className="font-mono text-primary">{results.roomCode}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 px-4 pb-4">
            <div className="space-y-2 text-center">
              <Badge variant="outline" className="px-4 py-1.5 text-lg font-black">
                {isTeamBattle && winningTeam ? `Team ${winningTeam.team} Wins` : `#${results.rank} Overall`}
              </Badge>
              {answers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBreakdownOpen(true)}
                  className="h-9 rounded-xl font-bold"
                >
                  <ListChecks className="mr-2 h-4 w-4" />
                  Questions Breakdown
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
                <Zap className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <p className="text-xl font-black">{results.finalScore}</p>
                <p className="text-xs text-muted-foreground">Total Score</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
                <Target className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <p className="text-xl font-black">{results.correctAnswers}/{results.totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
                <Trophy className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <p className="text-xl font-black">{results.accuracy.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Accuracy</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
                <Medal className="mx-auto mb-1.5 h-4 w-4 text-primary" />
                <p className="text-xl font-black">#{results.rank}</p>
                <p className="text-xs text-muted-foreground">Your Rank</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
          {isTeamBattle && results.teamRankings?.length ? (
            <section className="mb-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                <Users className="h-4 w-4 text-primary" /> Team Ranking
              </h2>
              <div className="space-y-2">
                {results.teamRankings.map((team: any, index: number) => (
                  <div key={team.team} className="flex items-center justify-between rounded-xl bg-muted/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-black">#{index + 1} Team {team.team}</p>
                      <p className="truncate text-xs text-muted-foreground">{team.players?.join(', ')}</p>
                    </div>
                    <span className="font-black">{team.score}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              <Trophy className="h-4 w-4 text-primary" /> Player Ranking
            </h2>
            <div className="space-y-2">
              {(results.rankings || []).map((player: any, index: number) => (
                <div key={player.user_id} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2">
                  <span className="w-7 font-black text-muted-foreground">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{player.username}</p>
                    <p className="text-xs text-muted-foreground">{player.team ? `Team ${player.team}` : 'Solo'} - {player.correctAnswers || 0} correct</p>
                  </div>
                  <span className="font-black">{player.score || 0}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
          <Button onClick={onReturnToLobby} className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest">
            <Home className="w-4 h-4 mr-2" />
            Return
          </Button>
          <Button onClick={onReturnToLobby} variant="outline" className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest">
            <RefreshCw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
        </div>
      </div>

      {isBreakdownOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/45 p-4 backdrop-blur-md">
          <div className="flex max-h-[min(82vh,720px)] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/25 bg-background/65 shadow-2xl shadow-black/20 backdrop-blur-xl dark:border-white/10 dark:bg-background/55">
            <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-4 py-3">
              <div>
                <h2 className="text-base font-black uppercase tracking-widest text-foreground">Questions Breakdown</h2>
                <p className="text-xs text-muted-foreground">{answers.length} answered questions</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsBreakdownOpen(false)}
                className="h-10 w-10 rounded-full"
                aria-label="Close questions breakdown"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {answers.map((answer: any, index: number) => (
                <div key={`${answer.questionId}-${index}`} className="rounded-2xl border border-white/25 bg-card/55 p-3 backdrop-blur-md dark:border-white/10">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-relaxed">Q{index + 1}. {answer.question}</p>
                    <Badge className={answer.isCorrect ? 'border-0 bg-green-500/10 text-green-600' : 'border-0 bg-destructive/10 text-destructive'}>
                      +{answer.points || 0}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Your answer: {answer.selectedAnswer || 'No answer'}</p>
                  <p className="text-xs text-muted-foreground">Correct answer: {answer.correctAnswer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
