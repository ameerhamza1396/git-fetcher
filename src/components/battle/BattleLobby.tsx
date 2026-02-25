import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Clock, Trophy, Swords, RefreshCw, Hash, Timer, ArrowRight, Sparkles } from 'lucide-react';
import { SubjectChapterSelector } from './SubjectChapterSelector';
import { motion } from 'framer-motion';

interface BattleLobbyProps {
  onJoinBattle: (roomId: string) => void;
}

interface BattleRoom {
  id: string;
  room_code: string;
  battle_type: '1v1' | '2v2' | 'ffa';
  max_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  current_players: number;
  host_id: string;
  time_per_question: number;
  total_questions: number;
  questions: any[] | null;
  subject: string;
  countdown_initiated_at?: string | null;
}

export const BattleLobby = ({ onJoinBattle }: BattleLobbyProps) => {
  const [rooms, setRooms] = useState<BattleRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [battleType, setBattleType] = useState<'1v1' | '2v2' | 'ffa'>('1v1');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [selectedChapterName, setSelectedChapterName] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadRooms();
    const channel = supabase
      .channel('battle_rooms_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms' }, () => loadRooms())
      .subscribe();
    const interval = setInterval(loadRooms, 10000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  useEffect(() => {
    rooms.forEach(async (room) => {
      if (room.status === 'waiting' && room.current_players === room.max_players) {
        if (!room.countdown_initiated_at) {
          await supabase.from('battle_rooms').update({ countdown_initiated_at: new Date().toISOString() }).eq('id', room.id);
        } else {
          const countdownDuration = room.battle_type === '1v1' ? 5 : 10;
          const elapsed = (Date.now() - new Date(room.countdown_initiated_at).getTime()) / 1000;
          if (elapsed >= countdownDuration) {
            await supabase.from('battle_rooms').update({ status: 'in_progress' }).eq('id', room.id);
          }
        }
      }
    });
  }, [rooms]);

  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select('*, battle_participants(id, username, user_id), countdown_initiated_at')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const typedRooms: BattleRoom[] = (data || []).map((room: any) => ({
        ...room,
        battle_type: room.battle_type as '1v1' | '2v2' | 'ffa',
        status: room.status as 'waiting' | 'in_progress' | 'completed',
        current_players: room.battle_participants?.length || 0,
        time_per_question: room.time_per_question || 15,
        total_questions: room.total_questions || 10,
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
    if (!selectedSubjectId || !selectedChapterId) return toast({ title: "Select a topic first", variant: "destructive" });
    try {
      setIsCreating(true);
      const maxPlayers = battleType === '1v1' ? 2 : 4;
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data, error } = await supabase.from('battle_rooms').insert([{
        room_code: code, battle_type: battleType, max_players: maxPlayers, current_players: 0,
        status: 'waiting', host_id: user.id, time_per_question: timePerQuestion,
        total_questions: numQuestions, subject: selectedSubjectName,
        subject_id: selectedSubjectId, chapter_id: selectedChapterId
      }]).select().single();
      if (error) throw error;
      toast({ title: "Room Created!", description: `Code: ${code}` });
      onJoinBattle(data.id);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to create room.", variant: "destructive" });
    } finally { setIsCreating(false); }
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
      onJoinBattle(data.id);
      setRoomCode('');
    } catch { toast({ title: "Error joining room", variant: "destructive" }); }
  };

  const handleSubjectChange = (subjectId: string, subjectName: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedSubjectName(subjectName);
    setSelectedChapterId(null);
    setSelectedChapterName(null);
  };

  const handleChapterChange = (chapterId: string, chapterName: string) => {
    setSelectedChapterId(chapterId);
    setSelectedChapterName(chapterName);
  };

  const getBattleTypeGradient = (type: string) => {
    switch (type) {
      case '1v1': return 'from-blue-600 via-indigo-600 to-violet-700';
      case '2v2': return 'from-emerald-600 via-teal-600 to-cyan-700';
      case 'ffa': return 'from-orange-500 via-red-500 to-rose-600';
      default: return 'from-slate-500 to-slate-600';
    }
  };

  const getBattleTypeLabel = (type: string) => {
    switch (type) {
      case '1v1': return '1v1 Duel';
      case '2v2': return '2v2 Team';
      case 'ffa': return 'Free For All';
      default: return type.toUpperCase();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0 space-y-6 pb-8">
      {/* Subject/Chapter Selector */}
      <SubjectChapterSelector
        selectedSubjectId={selectedSubjectId}
        selectedChapterId={selectedChapterId}
        onSubjectChange={handleSubjectChange}
        onChapterChange={handleChapterChange}
      />

      {/* Create Room Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white shadow-2xl p-1">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.4) 20px, rgba(255,255,255,0.4) 40px)`,
            maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
          }} />
          <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.8rem] p-5 border border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-black text-white">Create New Battle</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-white/60 text-xs font-bold uppercase tracking-wider block mb-1.5">Type</label>
                <Select value={battleType} onValueChange={(v: any) => setBattleType(v)}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1v1">1v1 Duel</SelectItem>
                    <SelectItem value="2v2">2v2 Team</SelectItem>
                    <SelectItem value="ffa">Free For All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-white/60 text-xs font-bold uppercase tracking-wider block mb-1.5">Questions</label>
                <Input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(5, Math.min(20, parseInt(e.target.value) || 5)))} className="bg-white/10 border-white/20 text-white rounded-xl text-sm" min={5} max={20} />
              </div>
              <div>
                <label className="text-white/60 text-xs font-bold uppercase tracking-wider block mb-1.5">Time (s)</label>
                <Input type="number" value={timePerQuestion} onChange={(e) => setTimePerQuestion(Math.max(10, Math.min(60, parseInt(e.target.value) || 10)))} className="bg-white/10 border-white/20 text-white rounded-xl text-sm" min={10} max={60} />
              </div>
            </div>

            <Button onClick={createRoom} disabled={isCreating || !selectedSubjectId || !selectedChapterId} className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/20 rounded-2xl h-12 font-black uppercase text-xs tracking-widest">
              {isCreating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : <><Trophy className="w-4 h-4 mr-2" />Create Battle Room</>}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Join by Code */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary/10 via-blue-500/5 to-violet-500/10 backdrop-blur-2xl border border-primary/20 shadow-xl p-1.5">
          <div className="relative z-10 bg-background/50 backdrop-blur-xl rounded-[1.5rem] border border-primary/10 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="text-base font-black text-foreground">Join by Room Code</h3>
            </div>
            <div className="flex gap-3">
              <Input placeholder="e.g., ABC123" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="flex-1 uppercase rounded-xl bg-muted/20 border-border/30 font-mono" maxLength={6} />
              <Button onClick={joinRoomByCode} disabled={!roomCode.trim()} className="bg-primary text-primary-foreground rounded-xl font-bold px-6">Join</Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Available Rooms */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Available Rooms
          </h3>
          <Button variant="ghost" size="sm" onClick={loadRooms} className="text-primary text-xs">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {rooms.length === 0 ? (
          <div className="relative overflow-hidden rounded-[2rem] bg-muted/20 backdrop-blur-xl border border-border/20 p-8 text-center">
            <Swords className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm font-bold text-foreground">No Active Battles</p>
            <p className="text-xs text-muted-foreground mt-1">Create a room or check back later!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room, idx) => (
              <motion.div key={room.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                <div className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${getBattleTypeGradient(room.battle_type)} shadow-xl p-1`}>
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
                    maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                  }} />
                  <div className="relative z-10 bg-white/10 backdrop-blur-xl rounded-[1.3rem] px-4 py-3.5 border border-white/10 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-white/20 text-white border-0 text-[10px] px-2">{getBattleTypeLabel(room.battle_type)}</Badge>
                        <span className="text-white font-mono text-xs font-bold">{room.room_code}</span>
                        {room.countdown_initiated_at && <Badge className="bg-white/30 text-white border-0 text-[10px] animate-pulse">Starting...</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-white/60 text-xs">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.current_players}/{room.max_players}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{room.time_per_question}s</span>
                        {room.subject && <span className="font-semibold text-white/80">{room.subject}</span>}
                      </div>
                    </div>
                    <Button
                      onClick={() => onJoinBattle(room.id)}
                      disabled={room.current_players >= room.max_players}
                      size="sm"
                      className={room.current_players >= room.max_players
                        ? "bg-white/10 text-white/50 rounded-xl cursor-not-allowed"
                        : "bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold border border-white/20"
                      }
                    >
                      {room.current_players >= room.max_players ? 'Full' : 'Join'}
                    </Button>
                  </div>
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
