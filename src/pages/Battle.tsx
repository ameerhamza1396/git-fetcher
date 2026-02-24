// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BattleLobby } from '@/components/battle/BattleLobby';
import { BattleRoom } from '@/components/battle/BattleRoom';
import { BattleGame } from '@/components/battle/BattleGame';
import { BattleResults } from '@/components/battle/BattleResults';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Swords, Hash, Plus, Users, RefreshCw, Clock, Trophy } from 'lucide-react';
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

interface AvailableRoom {
  id: string;
  room_code: string;
  battle_type: '1v1' | '2v2' | 'ffa';
  max_players: number;
  current_players: number;
  time_per_question: number;
  total_questions: number;
  subject: string;
  countdown_initiated_at?: string | null;
  status: string;
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
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  // Load available rooms for join tab
  useEffect(() => {
    if (lobbyTab === 'join' && battleState === 'lobby') {
      loadAvailableRooms();
      const interval = setInterval(loadAvailableRooms, 10000);
      const channel = supabase
        .channel('battle_rooms_join')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms' }, () => loadAvailableRooms())
        .subscribe();
      return () => { supabase.removeChannel(channel); clearInterval(interval); };
    }
  }, [lobbyTab, battleState]);

  const loadAvailableRooms = async () => {
    setRoomsLoading(true);
    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select('*, battle_participants(id, user_id)')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAvailableRooms((data || []).map((r: any) => ({
        ...r,
        current_players: r.battle_participants?.length || 0,
      })));
    } catch { /* silent */ } finally { setRoomsLoading(false); }
  };

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

  const getBattleTypeLabel = (type: string) => {
    switch (type) {
      case '1v1': return '1v1';
      case '2v2': return '2v2';
      case 'ffa': return 'FFA';
      default: return type;
    }
  };

  const getBattleTypeColor = (type: string) => {
    switch (type) {
      case '1v1': return 'bg-blue-500/15 text-blue-600 dark:text-blue-400';
      case '2v2': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
      case 'ffa': return 'bg-violet-500/15 text-violet-600 dark:text-violet-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Swords className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-2">Battle Arena</h1>
        <p className="text-muted-foreground text-center text-sm mb-6">Log in to compete with other students</p>
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/30 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 h-12">
          {battleState !== 'lobby' ? (
            <button onClick={handleLeaveBattle} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <Swords className="w-5 h-5 text-primary" />
          <span className="text-sm font-extrabold text-foreground tracking-tight">Battle Arena</span>
        </div>
      </header>

      <main className="px-4 mt-[calc(env(safe-area-inset-top)+60px)] pb-8 max-w-lg mx-auto">
        {battleState === 'lobby' && (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <h2 className="text-lg font-bold text-foreground">⚔️ Battle Arena</h2>
              <p className="text-xs text-muted-foreground font-medium">Challenge others in real-time</p>
            </div>

            {/* Create / Join toggle */}
            <div className="flex bg-muted/60 rounded-2xl p-1 gap-1">
              <button
                onClick={() => setLobbyTab('create')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  lobbyTab === 'create'
                    ? 'bg-card text-foreground shadow-md'
                    : 'text-muted-foreground'
                }`}
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              <button
                onClick={() => setLobbyTab('join')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  lobbyTab === 'join'
                    ? 'bg-card text-foreground shadow-md'
                    : 'text-muted-foreground'
                }`}
              >
                <Users className="w-4 h-4" /> Join
              </button>
            </div>

            {lobbyTab === 'create' ? (
              <BattleLobby onJoinBattle={handleJoinBattle} />
            ) : (
              <div className="space-y-4">
                {/* Join by code */}
                <Card className="border border-border/40 shadow-sm bg-card/80">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 font-bold">
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
                    <Button onClick={joinByCode} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                      Join Room
                    </Button>
                  </CardContent>
                </Card>

                {/* Available rooms */}
                <Card className="border border-border/40 shadow-sm bg-card/80">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 font-bold">
                      <Trophy className="w-4 h-4 text-primary" /> Available Rooms
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={loadAvailableRooms} className="h-8 w-8 p-0 text-muted-foreground">
                      <RefreshCw className={`w-3.5 h-3.5 ${roomsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {roomsLoading && availableRooms.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableRooms.length === 0 ? (
                      <div className="text-center py-8">
                        <Swords className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground font-medium">No active rooms</p>
                        <p className="text-[11px] text-muted-foreground/70">Create one or check back later</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {availableRooms.map((room) => (
                          <div key={room.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background/50 hover:bg-accent/30 transition-colors">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-[10px] font-bold border-0 px-1.5 py-0 ${getBattleTypeColor(room.battle_type)}`}>
                                  {getBattleTypeLabel(room.battle_type)}
                                </Badge>
                                <span className="font-mono text-xs font-bold text-foreground">{room.room_code}</span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-0.5">
                                  <Users className="w-3 h-3" />
                                  {room.current_players}/{room.max_players}
                                </span>
                                <span className="flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />
                                  {room.time_per_question}s
                                </span>
                                {room.subject && <span className="text-primary font-semibold truncate">{room.subject}</span>}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleJoinBattle(room.id)}
                              disabled={room.current_players >= room.max_players}
                              className={`text-xs font-bold h-8 px-4 rounded-xl ${
                                room.current_players >= room.max_players
                                  ? 'bg-muted text-muted-foreground'
                                  : 'bg-primary text-primary-foreground'
                              }`}
                            >
                              {room.current_players >= room.max_players ? 'Full' : 'Join'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
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
