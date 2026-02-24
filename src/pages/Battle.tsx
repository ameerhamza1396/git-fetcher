// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BattleLobby } from '@/components/battle/BattleLobby';
import { BattleRoom } from '@/components/battle/BattleRoom';
import { BattleGame } from '@/components/battle/BattleGame';
import { BattleResults } from '@/components/battle/BattleResults';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Swords, Hash, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import Seo from '@/components/Seo';

type BattleState = 'lobby' | 'room' | 'game' | 'results';

interface RoomData {
  id: string;
  room_code: string;
  battle_type: '1v1' | '2v2' | 'ffa';
  max_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  time_per_question: number;
  total_questions: number;
  subject: string;
  host_id: string;
  questions: any[] | null;
  current_question: number;
  battle_participants: { id: string; user_id: string; username: string; score: number; }[];
}

const Battle: React.FC = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [battleState, setBattleState] = useState<BattleState>('lobby');
  const [lobbyTab, setLobbyTab] = useState<'create' | 'join'>('create');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<RoomData | null>(null);
  const [battleResults, setBattleResults] = useState<any>(null);
  const [roomCode, setRoomCode] = useState('');

  const handleJoinBattle = async (roomId: string) => {
    if (!user) {
      toast({ title: "Auth Required", description: "Please log in.", variant: "destructive" });
      return;
    }
    try {
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
      const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';
      const { data: roomData, error: roomError } = await supabase
        .from('battle_rooms').select('*, battle_participants(*)').eq('id', roomId).single();
      if (roomError) throw new Error('Room not found');

      const existing = roomData.battle_participants?.find((p: any) => p.user_id === user.id);
      if (!existing) {
        if ((roomData.battle_participants?.length || 0) >= roomData.max_players) {
          toast({ title: "Room Full", description: "This room is full.", variant: "destructive" });
          return;
        }
        const { error: joinError } = await supabase.from('battle_participants').insert([{
          battle_room_id: roomId, user_id: user.id, username, score: 0, is_ready: false
        }]);
        if (joinError) throw joinError;
        await supabase.from('battle_rooms').update({
          current_players: (roomData.battle_participants?.length || 0) + 1,
          host_id: roomData.host_id || user.id
        }).eq('id', roomId);
      }

      setCurrentRoomId(roomId);
      setBattleState('room');
      toast({ title: "Joined!", description: `Room ${roomData.room_code}` });
    } catch (error: any) {
      toast({ title: "Failed", description: error.message || "Could not join.", variant: "destructive" });
    }
  };

  const joinByCode = async () => {
    if (!roomCode.trim()) {
      toast({ title: "Invalid", description: "Enter a room code.", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.from('battle_rooms')
        .select('*, battle_participants(id, user_id)')
        .eq('room_code', roomCode.toUpperCase().trim())
        .eq('status', 'waiting').single();
      if (error || !data) throw new Error('Room not found');
      if ((data.battle_participants?.length || 0) >= data.max_players) {
        toast({ title: "Full", description: "Room is full.", variant: "destructive" });
        return;
      }
      handleJoinBattle(data.id);
      setRoomCode('');
    } catch {
      toast({ title: "Error", description: "Failed to join.", variant: "destructive" });
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Swords className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Battle Arena</h1>
        <p className="text-muted-foreground text-center mb-6">Log in to compete with other students</p>
        <div className="flex gap-3">
          <Link to="/login"><Button>Sign In</Button></Link>
          <Link to="/signup"><Button variant="outline">Sign Up</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Battle Arena" description="Compete in MCQ battles" canonical="https://medmacs.app/battle" />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 h-12">
          {battleState !== 'lobby' ? (
            <button onClick={handleLeaveBattle} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <Swords className="w-5 h-5 text-red-500" />
          <span className="text-sm font-bold text-foreground">Battle Arena</span>
        </div>
      </header>

      <main className="px-4 mt-[calc(env(safe-area-inset-top)+60px)] pb-8 max-w-lg mx-auto">
        {battleState === 'lobby' && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-foreground">⚔️ Battle Arena</h2>
              <p className="text-sm text-muted-foreground">Challenge others in real-time</p>
            </div>

            {/* Create / Join toggle */}
            <div className="flex bg-muted rounded-xl p-1 gap-1">
              <button
                onClick={() => setLobbyTab('create')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  lobbyTab === 'create'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              <button
                onClick={() => setLobbyTab('join')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  lobbyTab === 'join'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground'
                }`}
              >
                <Users className="w-4 h-4" /> Join
              </button>
            </div>

            {lobbyTab === 'create' ? (
              <BattleLobby onJoinBattle={handleJoinBattle} />
            ) : (
              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hash className="w-4 h-4 text-muted-foreground" /> Join by Code
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Enter room code (e.g. ABC123)"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="text-center font-mono text-lg tracking-widest"
                    maxLength={6}
                  />
                  <Button onClick={joinByCode} className="w-full bg-red-600 hover:bg-red-700 text-white">
                    Join Room
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {battleState === 'room' && currentRoomId && (
          <BattleRoom roomId={currentRoomId} userId={user.id} onLeave={handleLeaveBattle} onBattleStart={handleBattleStart} />
        )}
        {battleState === 'game' && gameData && (
          <BattleGame roomData={gameData} userId={user.id} onGameComplete={handleGameComplete} />
        )}
        {battleState === 'results' && battleResults && (
          <BattleResults results={battleResults} onReturnToLobby={handleLeaveBattle} />
        )}
      </main>
    </div>
  );
};

export default Battle;
