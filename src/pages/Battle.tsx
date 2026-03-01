// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BattleLobby } from '@/components/battle/BattleLobby';
import { BattleRoom } from '@/components/battle/BattleRoom';
import { BattleGame } from '@/components/battle/BattleGame';
import { BattleResults } from '@/components/battle/BattleResults';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Swords, Hash, Plus, Users, RefreshCw, Clock, Trophy, Shield } from 'lucide-react';
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
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const [battleState, setBattleState] = useState<BattleState>('lobby');
  const [lobbyTab, setLobbyTab] = useState<'create' | 'join'>('create');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<RoomData | null>(null);
  const [battleResults, setBattleResults] = useState<any>(null);
  const [roomCode, setRoomCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);

  // Scroll-hide header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHeaderVisible(currentScrollY < lastScrollY.current || currentScrollY < 10);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-gray-950">
        <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-24 h-24 object-contain animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-gray-950 p-6">
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

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
      <Seo title="Battle Arena" description="Compete in MCQ battles" canonical="https://medmacs.app/battle" />

      {/* Scroll-hide header */}
      <header
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {battleState !== 'lobby' ? (
              <Button variant="ghost" size="sm" className="w-9 h-9 p-0" onClick={handleLeaveBattle}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="w-9 h-9 p-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
            <span className="text-lg font-black tracking-tight">Battle Arena</span>
          </div>
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 text-[10px] font-bold px-3">
            <Swords className="w-3 h-3 mr-1" /> Live
          </Badge>
        </div>
      </header>

      <main className="px-4 mt-[calc(env(safe-area-inset-top))] pb-8 max-w-lg mx-auto">
        {battleState === 'lobby' && (
          <div className="space-y-5">
            {/* Hero */}
            <div className="text-center mb-2">
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tight italic">⚔️ Battle Arena</h1>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Challenge others in real-time</p>
            </div>

            {/* Create / Join toggle - pricing style */}
            <div className="inline-flex items-center w-full p-1 bg-slate-200/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setLobbyTab('create')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  lobbyTab === 'create'
                    ? 'bg-white dark:bg-gray-700 text-foreground shadow-xl'
                    : 'text-muted-foreground'
                }`}
              >
                <Plus className="w-4 h-4" /> Create
              </button>
              <button
                onClick={() => setLobbyTab('join')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  lobbyTab === 'join'
                    ? 'bg-white dark:bg-gray-700 text-foreground shadow-xl'
                    : 'text-muted-foreground'
                }`}
              >
                <Users className="w-4 h-4" /> Join
              </button>
            </div>

            {lobbyTab === 'create' ? (
              <BattleLobby onJoinBattle={handleJoinBattle} />
            ) : (
              <div className="space-y-5">
                {/* Join by code - pricing card style */}
                <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-500 via-slate-600 to-slate-700 text-white shadow-2xl p-6">
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                  }} />
                  <div className="relative z-10">
                    <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                      <Hash className="w-4 h-4" /> Join by Code
                    </h3>
                    <Input
                      placeholder="ABC123"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="text-center font-mono text-lg tracking-widest bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl h-12"
                      maxLength={6}
                    />
                    <Button onClick={joinByCode} className="w-full mt-3 bg-white text-slate-900 hover:scale-105 transition-all rounded-xl h-12 font-black uppercase text-xs tracking-widest">
                      Join Room
                    </Button>
                  </div>
                </div>

                {/* Available rooms */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" /> Available Rooms
                    </h3>
                    <Button variant="ghost" size="sm" onClick={loadAvailableRooms} className="h-8 w-8 p-0 text-muted-foreground">
                      <RefreshCw className={`w-3.5 h-3.5 ${roomsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>

                  {roomsLoading && availableRooms.length === 0 ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableRooms.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-muted/30 border border-border/30">
                      <Swords className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                      <p className="text-xs text-muted-foreground font-bold">No active rooms</p>
                      <p className="text-[11px] text-muted-foreground/70">Create one or check back later</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableRooms.map((room) => (
                        <div key={room.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/30 bg-card/80 backdrop-blur-sm hover:shadow-md transition-all">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={`text-[10px] font-bold border-0 px-2 py-0.5 ${getBattleTypeColor(room.battle_type)}`}>
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
                            className={`text-xs font-black h-9 px-5 rounded-xl uppercase tracking-wider ${
                              room.current_players >= room.max_players
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
                            }`}
                          >
                            {room.current_players >= room.max_players ? 'Full' : 'Join'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
