// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BattleLobby } from '@/components/battle/BattleLobby';
import { BattleRoom } from '@/components/battle/BattleRoom';
import { BattleGame } from '@/components/battle/BattleGame';
import { RapidFireGame } from '@/components/battle/RapidFireGame';
import { BattleResults } from '@/components/battle/BattleResults';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Swords, Plus, Users, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import Seo from '@/components/Seo';
import PageSkeleton from '@/components/skeletons/PageSkeleton';

type BattleState = 'lobby' | 'room' | 'game' | 'results';

interface RoomData {
  id: string;
  room_code: string;
  battle_type: '1v1' | '2v2' | 'ffa' | 'rapid_fire';
  max_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  time_per_question: number;
  total_questions: number;
  subject: string;
  host_id: string;
  questions: any[] | null;
  current_question: number;
  question_started_at?: string | null;
  win_target?: number | null;
  winner_user_id?: string | null;
  winner_team?: number | null;
  paused_at?: string | null;
  is_private?: boolean | null;
  battle_participants: {
    id: string;
    user_id: string;
    username: string;
    team?: number | null;
    score: number;
    is_bot?: boolean | null;
    bot_accuracy?: number | null;
  }[];
}

const Battle: React.FC = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [battleState, setBattleState] = useState<BattleState>('lobby');
  const [lobbyTab, setLobbyTab] = useState<'create' | 'join' | 'leaderboard'>('create');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<RoomData | null>(null);
  const [battleResults, setBattleResults] = useState<any>(null);
  const battleMusicRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!battleMusicRef.current) {
      battleMusicRef.current = new Audio('/music/battle.mp3');
      battleMusicRef.current.loop = true;
      battleMusicRef.current.volume = 0.28;
    }

    const audio = battleMusicRef.current;
    const shouldPlayMusic = Boolean(user) && battleState !== 'game';

    if (shouldPlayMusic) {
      audio.play().catch(() => {
        // Browser autoplay policies may block until the user interacts.
      });
    } else {
      audio.pause();
    }

    return () => {
      audio.pause();
    };
  }, [battleState, user]);

  const handleJoinBattle = async (roomId: string, options?: { joinedByCode?: boolean; createdRoom?: boolean }) => {
    if (!user) {
      toast({ title: "Auth Required", description: "Please log in.", variant: "destructive" });
      return;
    }
    try {
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';
      const joinedByCode = Boolean(options?.joinedByCode);
      const { data: roomData, error: roomError } = await supabase
        .from('battle_rooms').select('*, battle_participants(*)').eq('id', roomId).single();
      if (roomError) throw new Error('Room not found');

      const existing = roomData.battle_participants?.find((p: any) => p.user_id === user.id);
      if (!existing && roomData.status === 'waiting') {
        if ((roomData.battle_participants?.length || 0) >= roomData.max_players) {
          toast({ title: "Room Full", variant: "destructive" });
          return;
        }
        const teamOneCount = (roomData.battle_participants || []).filter((participant: any) => participant.team === 1).length;
        const teamTwoCount = (roomData.battle_participants || []).filter((participant: any) => participant.team === 2).length;
        const assignedTeam = roomData.battle_type === '2v2'
          ? (teamOneCount <= teamTwoCount ? 1 : 2)
          : null;
        const { error: joinError } = await supabase.from('battle_participants').insert([{
          battle_room_id: roomId, user_id: user.id, username, score: 0, is_ready: false, team: assignedTeam
        }]);
        if (joinError) throw joinError;
        await supabase.from('battle_rooms').update({
          current_players: (roomData.battle_participants?.length || 0) + 1,
          host_id: roomData.host_id || user.id,
          is_private: Boolean(roomData.is_private || joinedByCode)
        }).eq('id', roomId);
      } else if (!existing && roomData.status === 'in_progress' && roomData.battle_type === 'rapid_fire') {
        toast({ title: "Spectator Mode", description: "This Rapid Fire room already started, so you can watch the live match." });
      } else if (!existing) {
        toast({ title: "Battle Already Started", variant: "destructive" });
        return;
      }

      setCurrentRoomId(roomId);
      setBattleState('room');
      if (!options?.createdRoom) {
        toast({ title: "Joined!", description: `Room ${roomData.room_code}` });
      }
    } catch (error: any) {
      toast({ title: "Failed", description: error.message || "Could not join.", variant: "destructive" });
    }
  };

  const handleLeaveBattle = () => {
    setCurrentRoomId(null);
    setGameData(null);
    setBattleResults(null);
    setBattleState('lobby');
  };

  const handleBattleStart = (roomData: RoomData) => {
    setGameData(roomData);
    setBattleState('game');
  };

  const handleGameComplete = (results: any) => {
    setBattleResults(results);
    setBattleState('results');
  };

  if (loading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-400 blur-2xl opacity-30 rounded-full" />
          <div className="relative bg-gradient-to-br from-orange-500 to-red-600 p-5 rounded-3xl shadow-2xl mb-6">
            <Swords className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2 uppercase tracking-tight italic">Battle Arena</h1>
        <p className="text-muted-foreground text-center text-sm mb-8 max-w-xs">Log in to compete with other medical students in real-time MCQ battles</p>
        <div className="flex gap-3">
          <Link to="/login"><Button className="bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-2xl h-12 px-8 font-black uppercase text-xs tracking-widest">Sign In</Button></Link>
          <Link to="/signup"><Button variant="outline" className="rounded-2xl h-12 px-8 font-bold">Sign Up</Button></Link>
        </div>
      </div>
    );
  }

  const showLivingBackground = battleState !== 'game';

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <Seo title="Battle Arena" description="Compete in MCQ battles" canonical="https://medmacs.app/battle" />
      {showLivingBackground && <BattleLivingBackground />}

      <main className={`relative z-10 ${battleState === 'game' || battleState === 'results' || battleState === 'room' ? 'w-full' : 'px-4 pb-[calc(env(safe-area-inset-bottom)+60px)] max-w-lg mx-auto'}`}>
        {battleState === 'lobby' && (
          <div className="space-y-5 pt-[calc(env(safe-area-inset-top)+122px)]">
            <div className="fixed inset-x-0 top-0 z-50 bg-background/85 px-4 pt-[calc(env(safe-area-inset-top)+14px)] pb-3 backdrop-blur-md">
              <div className="mx-auto max-w-lg">
              {/* Hero */}
              <div className="text-center mb-3">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Live Competition</p>
                <h1 className="text-2xl font-black text-foreground uppercase tracking-tight italic">Battle Arena</h1>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Challenge others in real-time</p>
              </div>

              {/* 3-tab toggle */}
              <div className="inline-flex items-center w-full p-1 bg-muted/50 backdrop-blur-md rounded-2xl border border-border/40 shadow-sm">
                {[
                  { key: 'create', label: 'Create', icon: Plus },
                  { key: 'join', label: 'Join', icon: Users },
                  { key: 'leaderboard', label: 'Rankings', icon: Trophy },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setLobbyTab(key as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      lobbyTab === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
              </div>
            </div>

            {lobbyTab === 'create' && (
              <BattleLobby onJoinBattle={handleJoinBattle} mode="create" />
            )}
            {lobbyTab === 'join' && (
              <BattleLobby onJoinBattle={handleJoinBattle} mode="join" />
            )}
            {lobbyTab === 'leaderboard' && (
              <BattleLeaderboard />
            )}
          </div>
        )}

        {battleState === 'room' && currentRoomId && (
          <BattleRoom roomId={currentRoomId} userId={user.id} onLeave={handleLeaveBattle} onBattleStart={handleBattleStart} />
        )}
        {battleState === 'game' && gameData && gameData.battle_type !== 'rapid_fire' && (
          <BattleGame roomData={gameData} userId={user.id} onGameComplete={handleGameComplete} onExit={handleLeaveBattle} />
        )}
        {battleState === 'game' && gameData && gameData.battle_type === 'rapid_fire' && (
          <RapidFireGame roomData={gameData as any} userId={user.id} onGameComplete={handleGameComplete} />
        )}
        {battleState === 'results' && battleResults?.mode === 'rapid_fire' && (
          <RapidFireResults results={battleResults} onReturnToLobby={handleLeaveBattle} />
        )}
        {battleState === 'results' && battleResults && battleResults.mode !== 'rapid_fire' && (
          <BattleResults results={battleResults} onReturnToLobby={handleLeaveBattle} />
        )}
      </main>
    </div>
  );
};

const BattleLivingBackground = () => (
  <div aria-hidden="true" className="battle-live-bg" />
);

/* ───── Battle Leaderboard ───── */
import { Loader2, Medal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const BattleLeaderboard = () => {
  const { data: leaders, isLoading } = useQuery({
    queryKey: ['battleLeaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_results')
        .select('user_id, final_score, total_correct, total_questions, accuracy_percentage')
        .order('final_score', { ascending: false })
        .limit(50);
      if (error) throw error;

      // Group by user_id to aggregate
      const map = new Map<string, { wins: number; totalScore: number; totalCorrect: number; totalQ: number; bestScore: number }>();
      for (const r of data || []) {
        const existing = map.get(r.user_id) || { wins: 0, totalScore: 0, totalCorrect: 0, totalQ: 0, bestScore: 0 };
        existing.wins += 1;
        existing.totalScore += r.final_score;
        existing.totalCorrect += r.total_correct;
        existing.totalQ += r.total_questions;
        existing.bestScore = Math.max(existing.bestScore, r.final_score);
        map.set(r.user_id, existing);
      }

      // Fetch usernames
      const userIds = Array.from(map.keys());
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from('profiles').select('id, username, full_name').in('id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return Array.from(map.entries())
        .map(([uid, stats]) => ({
          userId: uid,
          username: profileMap.get(uid)?.username || profileMap.get(uid)?.full_name || 'Anonymous',
          ...stats,
          avgAccuracy: stats.totalQ > 0 ? Math.round((stats.totalCorrect / stats.totalQ) * 100) : 0,
        }))
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 20);
    },
    staleTime: 30000,
  });

  const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  if (!leaders || leaders.length === 0) {
    return (
      <div className="text-center py-16 rounded-2xl bg-muted/30 border border-border/30">
        <Trophy className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm font-bold text-foreground">No battle data yet</p>
        <p className="text-xs text-muted-foreground mt-1">Play some battles to appear here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
        <Trophy className="w-4 h-4 text-yellow-500" /> Battle Rankings
      </h3>
      <div className="space-y-2">
        {leaders.map((leader, idx) => (
          <div key={leader.userId} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
            idx < 3
              ? 'bg-gradient-to-r from-primary/5 to-transparent border-primary/20'
              : 'bg-card/80 border-border/30'
          }`}>
            <div className="w-8 text-center font-black text-sm">
              {idx < 3 ? <Medal className={`w-5 h-5 mx-auto ${medalColors[idx]}`} /> : <span className="text-muted-foreground">{idx + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{leader.username}</p>
              <p className="text-[11px] text-muted-foreground">{leader.wins} battles · {leader.avgAccuracy}% accuracy</p>
            </div>
            <div className="text-right">
              <p className="font-black text-sm text-foreground">{leader.totalScore}</p>
              <p className="text-[10px] text-muted-foreground">total pts</p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center pt-4 pb-4">
        <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
      </div>
    </div>
  );
};

export default Battle;

const RapidFireResults = ({ results, onReturnToLobby }: { results: any; onReturnToLobby: () => void }) => {
  const winnerName = results.players?.find((player: any) => player.userId === results.winnerUserId)?.username || results.players?.[0]?.username || 'Rapid Fire winner';

  return (
    <div className="min-h-screen bg-transparent p-4">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Trophy className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black text-foreground">Rapid Fire Complete</h1>
          <p className="mt-2 text-muted-foreground">Room {results.roomCode}</p>
          <div className="mt-5 rounded-2xl border border-border/40 bg-card p-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Winner</p>
            <p className="text-2xl font-black text-foreground">{winnerName}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-black uppercase tracking-widest">Player Ranking</h2>
          <div className="space-y-2">
            {results.players?.map((player: any, index: number) => (
              <div key={player.userId} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2">
                <span className="w-7 font-black text-muted-foreground">#{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{player.username}</p>
                  <p className="text-xs text-muted-foreground">
                    fastest {player.fastest ? `${(player.fastest / 1000).toFixed(2)}s` : 'n/a'}
                  </p>
                </div>
                <span className="font-black">{player.points ?? player.correct} pts</span>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={onReturnToLobby} className="h-12 w-full rounded-2xl font-black uppercase tracking-widest">
          Return to Battle Arena
        </Button>
      </div>
    </div>
  );
};
