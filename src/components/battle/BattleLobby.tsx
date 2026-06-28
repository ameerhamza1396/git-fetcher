import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Clock, Trophy, Swords, RefreshCw, Hash, Sparkles } from 'lucide-react';
import { SubjectChapterSelector } from './SubjectChapterSelector';
import { motion } from 'framer-motion';
import { Switch } from '@/components/ui/switch';

type BattleType = '1v1' | '2v2' | 'ffa' | 'rapid_fire';

interface BattleLobbyProps {
  onJoinBattle: (roomId: string, options?: { joinedByCode?: boolean; createdRoom?: boolean }) => Promise<void> | void;
  mode: 'create' | 'join';
}

interface BattleRoom {
  id: string;
  room_code: string;
  battle_type: BattleType;
  max_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  current_players: number;
  host_id: string;
  time_per_question: number;
  total_questions: number;
  win_target?: number;
  questions: any[] | null;
  subject: string;
  countdown_initiated_at?: string | null;
  is_private?: boolean;
}

export const BattleLobby = ({ onJoinBattle, mode }: BattleLobbyProps) => {
  const [rooms, setRooms] = useState<BattleRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [createStep, setCreateStep] = useState<'idle' | 'creating' | 'opening'>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [battleType, setBattleType] = useState<BattleType>('1v1');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
  const [isPrivateRoom, setIsPrivateRoom] = useState(false);
  const [rapidNegativeMarking, setRapidNegativeMarking] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (battleType === 'rapid_fire' && timePerQuestion < 20) {
      setTimePerQuestion(20);
    }
    if (battleType === 'rapid_fire' && numQuestions < 20) {
      setNumQuestions(20);
    }
  }, [battleType, timePerQuestion, numQuestions]);

  useEffect(() => {
    loadRooms();
    const channel = supabase
      .channel('battle_rooms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms' }, () => loadRooms())
      .subscribe();
    const interval = setInterval(loadRooms, 10000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select('*, battle_participants(id, username, user_id), countdown_initiated_at')
        .in('status', ['waiting', 'in_progress'])
        .eq('is_private', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const typedRooms: BattleRoom[] = (data || []).map((room: any) => ({
        ...room,
        battle_type: room.battle_type as BattleType,
        status: room.status as 'waiting' | 'in_progress' | 'completed',
        current_players: room.battle_participants?.length || 0,
        time_per_question: room.time_per_question || 15,
        total_questions: room.total_questions || 10,
        win_target: room.win_target || 20,
        questions: Array.isArray(room.questions) ? room.questions : null,
        subject: room.subject || 'Biology',
        countdown_initiated_at: room.countdown_initiated_at || null,
      }));
      setRooms(typedRooms);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createRoom = async () => {
    if (!user) return toast({ title: "Login Required", variant: "destructive" });
    if (!selectedSubjectId) return toast({ title: "Select a subject first", variant: "destructive" });
    try {
      setIsCreating(true);
      setCreateStep('creating');
      const maxPlayers = battleType === '1v1' ? 2 : battleType === 'rapid_fire' ? 50 : 4;
      const totalQuestions = battleType === 'rapid_fire' ? Math.max(numQuestions, 20) : numQuestions;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase.from('battle_rooms').insert([{
        room_code: code, battle_type: battleType, max_players: maxPlayers, current_players: 0,
        status: 'waiting', host_id: user.id, time_per_question: battleType === 'rapid_fire' ? Math.max(timePerQuestion, 20) : timePerQuestion,
        total_questions: totalQuestions,
        win_target: battleType === 'rapid_fire' ? totalQuestions * 100 : 20,
        negative_marking: battleType === 'rapid_fire' ? rapidNegativeMarking : false,
        is_private: isPrivateRoom,
        subject: selectedSubjectName,
        subject_id: selectedSubjectId,
        chapter_id: null
      }]).select().single();
      if (error) throw error;
      setCreateStep('opening');
      await onJoinBattle(data.id, { createdRoom: true });
    } catch (error: any) {
      console.error('Error creating battle room:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create room.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
      setCreateStep('idle');
    }
  };

  const joinRoomByCode = async () => {
    if (!roomCode.trim()) return;
    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select('*, battle_participants(id, user_id)')
        .eq('room_code', roomCode.toUpperCase().trim())
        .eq('status', 'waiting')
        .single();
      if (error || !data) return toast({ title: "Room Not Found", variant: "destructive" });
      if ((data.battle_participants?.length || 0) >= data.max_players) return toast({ title: "Room Full", variant: "destructive" });
      onJoinBattle(data.id, { joinedByCode: true });
      setRoomCode('');
    } catch { toast({ title: "Error joining room", variant: "destructive" }); }
  };

  const handleSubjectChange = (subjectId: string, subjectName: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedSubjectName(subjectName);
  };

  const handleBattleTypeChange = (nextType: BattleType) => {
    setBattleType(nextType);
    if (nextType === 'rapid_fire') {
      setNumQuestions(20);
      setTimePerQuestion(current => Math.max(current, 20));
    } else if (numQuestions > 15) {
      setNumQuestions(10);
    }
  };

  const getBattleTypeGradient = (type: string) => {
    switch (type) {
      case '1v1': return 'border-blue-500/25 bg-blue-500/5';
      case '2v2': return 'border-emerald-500/25 bg-emerald-500/5';
      case 'ffa': return 'border-orange-500/25 bg-orange-500/5';
      case 'rapid_fire': return 'border-primary/30 bg-primary/5';
      default: return 'border-border/40 bg-card';
    }
  };

  const getBattleTypeLabel = (type: string) => {
    switch (type) {
      case '1v1': return '1v1 Duel';
      case '2v2': return '2v2 Team';
      case 'ffa': return 'Free For All';
      case 'rapid_fire': return 'Rapid Fire';
      default: return type.toUpperCase();
    }
  };

  const getBattleTypeRules = (type: BattleType) => {
    switch (type) {
      case '1v1':
        return {
          title: '1v1 Duel Rules',
          description: 'Two players face the same topic set. The room starts automatically when both players join, and the higher final score wins.',
        };
      case '2v2':
        return {
          title: '2v2 Team Rules',
          description: 'Four players compete in team format. The room starts automatically when full, with scoring based on correct answers and speed bonuses.',
        };
      case 'ffa':
        return {
          title: 'Free For All Rules',
          description: 'Multiple players compete individually. The host can start once at least two players join, and the highest final score takes the room.',
        };
      case 'rapid_fire':
        return {
          title: 'Rapid Fire Rules',
          description: 'Up to 50 players compete solo. The host selects the MCQ count, and faster correct answers score more points.',
        };
      default:
        return {
          title: 'Battle Rules',
          description: 'Choose a room type, invite players, and compete on the selected topic.',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ─── CREATE TAB ─── */
  if (mode === 'create') {
    return (
      <div className="relative space-y-5 pb-[calc(env(safe-area-inset-bottom)+108px)]">
        {isCreating && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 px-6 backdrop-blur-md">
            <div className="w-full max-w-xs rounded-2xl border border-border/50 bg-card p-5 text-center shadow-2xl shadow-primary/20">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
              <p className="text-sm font-black uppercase tracking-widest text-foreground">
                {createStep === 'opening' ? 'Opening room' : 'Creating room'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {createStep === 'opening' ? 'Setting up the lobby now...' : 'Saving your battle settings...'}
              </p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute -right-4 top-24 h-14 w-14 rounded-full border border-primary/15 bg-primary/5" />
        <div className="pointer-events-none absolute left-2 top-64 h-8 w-8 rounded-full border border-emerald-500/20 bg-emerald-500/10" />
        <SubjectChapterSelector
          selectedSubjectId={selectedSubjectId}
          onSubjectChange={handleSubjectChange}
        />

        {/* Create Room Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-xl shadow-primary/10">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full border border-primary/15 bg-primary/5 pointer-events-none" />
            <div className="absolute right-10 top-20 h-8 w-8 rounded-full border border-emerald-500/20 bg-emerald-500/10 pointer-events-none" />
            <div className="absolute -left-5 bottom-16 h-16 w-16 rounded-full border border-orange-500/15 bg-orange-500/10 pointer-events-none" />
            <div className="relative z-10 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/15">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Battle Arena</p>
                  <h3 className="text-lg font-black text-foreground">Create New Battle</h3>
                </div>
              </div>

              {/* Battle Type - pill buttons instead of dropdown */}
              <div>
                <label className="text-muted-foreground text-xs font-bold uppercase tracking-wider block mb-2">Battle Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['1v1', '2v2', 'ffa', 'rapid_fire'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => handleBattleTypeChange(t)}
                      className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                        battleType === t
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-muted/30 border-border/40 text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                      }`}
                    >
                      {t === '1v1' ? '1v1 Duel' : t === '2v2' ? '2v2 Team' : t === 'rapid_fire' ? 'Rapid' : 'FFA'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
                <p className="font-black uppercase tracking-wider text-primary">{getBattleTypeRules(battleType).title}</p>
                <p className="mt-1">{getBattleTypeRules(battleType).description}</p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 bg-muted/20 p-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-foreground">Private Room</p>
                  <p className="text-xs text-muted-foreground">Code-only room. Public listing stays off.</p>
                </div>
                <Switch checked={isPrivateRoom} onCheckedChange={setIsPrivateRoom} />
              </div>

              {battleType === 'rapid_fire' && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/40 bg-muted/20 p-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-foreground">Negative Marking</p>
                    <p className="text-xs text-muted-foreground">Wrong answers lose 25 points. Correct answers start at 100 points.</p>
                  </div>
                  <Switch checked={rapidNegativeMarking} onCheckedChange={setRapidNegativeMarking} />
                </div>
              )}

              {/* Questions & Time - cleaner inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-muted-foreground text-xs font-bold uppercase tracking-wider block mb-2">Questions</label>
                  <div className="flex gap-1.5">
                    {battleType === 'rapid_fire' ? [20, 30, 40].map(n => (
                      <button
                        key={n}
                        onClick={() => setNumQuestions(n)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                          numQuestions === n
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 border-border/40 text-muted-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    )) : [5, 10, 15].map(n => (
                      <button
                        key={n}
                        onClick={() => setNumQuestions(n)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                          numQuestions === n
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 border-border/40 text-muted-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-muted-foreground text-xs font-bold uppercase tracking-wider block mb-2">Time (sec)</label>
                  <div className="flex gap-1.5">
                    {(battleType === 'rapid_fire' ? [20, 30, 45] : [10, 15, 30]).map(t => (
                      <button
                        key={t}
                        onClick={() => setTimePerQuestion(t)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                          timePerQuestion === t
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/30 border-border/40 text-muted-foreground'
                        }`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </motion.div>

        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-12px_30px_rgba(0,0,0,0.08)]">
          <div className="mx-auto w-full max-w-lg">
            <Button onClick={createRoom} disabled={isCreating || !selectedSubjectId} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl h-12 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20">
              {isCreating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{createStep === 'opening' ? 'Opening...' : 'Creating...'}</> : <><Trophy className="w-4 h-4 mr-2" />Create Battle Room</>}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 pb-4">
          <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
          <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
        </div>
      </div>
    );
  }

  /* ─── JOIN TAB ─── */
  return (
      <div className="relative space-y-5 pb-8">
      <div className="pointer-events-none absolute -right-5 top-16 h-16 w-16 rounded-full border border-primary/15 bg-primary/5" />
      <div className="pointer-events-none absolute left-3 top-56 h-10 w-10 rounded-full border border-orange-500/15 bg-orange-500/10" />
      {/* Join by Code */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-6 shadow-xl shadow-primary/10">
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full border border-primary/15 bg-primary/5" />
          <div className="pointer-events-none absolute left-8 bottom-6 h-8 w-8 rounded-full border border-emerald-500/20 bg-emerald-500/10" />
          <div className="relative z-10">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4 text-foreground">
              <Hash className="w-4 h-4" /> Join by Code
            </h3>
            <Input
              placeholder="ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-widest bg-background border-border/60 text-foreground placeholder:text-muted-foreground/50 rounded-xl h-12"
              maxLength={6}
            />
            <Button onClick={joinRoomByCode} disabled={!roomCode.trim()} className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-12 font-black uppercase text-xs tracking-widest">
              Join Room
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Available Rooms */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Available Rooms
          </h3>
          <Button variant="ghost" size="sm" onClick={loadRooms} className="text-primary text-xs h-8 w-8 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {rooms.length === 0 ? (
          <div className="relative overflow-hidden rounded-[2rem] bg-card border border-border/40 p-8 text-center shadow-lg">
            <div className="pointer-events-none absolute right-6 top-5 h-10 w-10 rounded-full border border-primary/15 bg-primary/5" />
            <Swords className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-bold text-foreground">No Active Battles</p>
            <p className="text-xs text-muted-foreground mt-1">Create a room or check back later!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room, idx) => (
              <motion.div key={room.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <div className={`relative overflow-hidden rounded-2xl border ${getBattleTypeGradient(room.battle_type)} px-4 py-3.5 shadow-md flex items-center gap-3`}>
                    <div className="pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full border border-current/10 bg-current/5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-[10px] px-2">{getBattleTypeLabel(room.battle_type)}</Badge>
                        <span className="text-foreground font-mono text-xs font-bold">{room.room_code}</span>
                        {room.status === 'in_progress' && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px]">
                            Room active
                          </Badge>
                        )}
                        {room.countdown_initiated_at && <Badge className="bg-primary/10 text-primary border-0 text-[10px] animate-pulse">Starting...</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground text-xs">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.current_players}/{room.max_players}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{room.time_per_question}s</span>
                        {room.battle_type === 'rapid_fire' && <span>{room.total_questions || 20} MCQs</span>}
                        {room.subject && <span className="font-semibold text-foreground/80 truncate">{room.subject}</span>}
                      </div>
                    </div>
                    <Button
                      onClick={() => onJoinBattle(room.id)}
                      disabled={room.current_players >= room.max_players || (room.status === 'in_progress' && room.battle_type !== 'rapid_fire')}
                      size="sm"
                      className={room.current_players >= room.max_players || (room.status === 'in_progress' && room.battle_type !== 'rapid_fire')
                        ? "bg-muted text-muted-foreground rounded-xl cursor-not-allowed"
                        : "bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary rounded-xl font-bold border border-primary/20"
                      }
                    >
                      {room.status === 'in_progress'
                        ? (room.battle_type === 'rapid_fire' ? 'Watch' : 'Active')
                        : room.current_players >= room.max_players ? 'Full' : 'Join'}
                    </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Footer */}
      <div className="text-center pt-4 pb-4">
        <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
      </div>
    </div>
  );
};
