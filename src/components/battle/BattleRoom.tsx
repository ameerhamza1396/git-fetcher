import React, { useState, useEffect, useRef } from 'react';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Swords, XCircle, Gamepad2, Hourglass, Copy, BookOpenText, Play, Bell, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { createBotAccuracy, getBotName, getGameControllerConfig } from '@/utils/gameController';

type BattleType = '1v1' | '2v2' | 'ffa' | 'rapid_fire';

const createBotUserId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0');
};

interface BattleRoomProps {
  roomId: string;
  userId: string;
  onLeave: () => void;
  onBattleStart: (roomData: RoomData) => void;
}

interface RoomData {
  id: string;
  room_code: string;
  battle_type: BattleType;
  max_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  time_per_question: number;
  total_questions: number;
  subject_id: string | null;
  chapter_id: string | null;
  questions: any[] | null;
  subject: string;
  host_id: string;
  host_ping_requested_at: string | null;
  last_ping_sender_id: string | null;
  last_ping_sender_username: string | null;
  countdown_initiated_at: string | null;
  question_started_at: string | null;
  win_target?: number;
  winner_user_id?: string | null;
  winner_team?: number | null;
  paused_at?: string | null;
  is_private?: boolean | null;
  created_at: string;
  battle_participants: { 
    id: string; 
    user_id: string; 
    username: string; 
    team: number | null;
    score: number | null;
    is_bot?: boolean | null;
    bot_accuracy?: number | null;
    created_at: string; 
  }[];
}

export const BattleRoom = ({ roomId, userId, onLeave, onBattleStart }: BattleRoomProps) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isLeaving, setIsLeaving] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevHostPingRequestedAt = useRef<string | null>(null);
  const prevHostPingSenderId = useRef<string | null>(null);
  const [showConfirmLeaveModal, setShowConfirmLeaveModal] = useState(false);
  const [participantAvatars, setParticipantAvatars] = useState<Record<string, string | null>>({});
  const prevParticipantsCount = useRef<number | null>(null);
  const botFillInFlightRef = useRef(false);
  const rapidFireChurnScheduledRef = useRef(false);
  const rapidFireChurnTimersRef = useRef<number[]>([]);
  const battleStartHandledRef = useRef(false);

  // Fetch room details and participants in real-time
  const { data: room, isLoading: roomLoading, error: roomError } = useQuery({
    queryKey: ['battleRoom', roomId],
    queryFn: async (): Promise<RoomData> => {
      console.log('BattleRoom.tsx: Fetching battle room for roomId:', roomId);
      const { data, error } = await supabase
        .from('battle_rooms')
        .select(`
          *,
          battle_participants(id, user_id, username, team, score, is_bot, bot_accuracy, created_at)
        `)
        .eq('id', roomId)
        .single();

      if (error) {
        console.error("BattleRoom.tsx: Error fetching battle room:", error);
        throw error;
      }
      console.log('BattleRoom.tsx: Successfully fetched room data:', data);
      return data as RoomData;
    },
    refetchInterval: 3000, // Refetch every 3 seconds to keep data fresh
    enabled: !!roomId, // Only run query if roomId is available
  });

  // Check if battle should start immediately when room data changes
  useEffect(() => {
    if (room && room.status === 'in_progress' && !battleStartHandledRef.current) {
      battleStartHandledRef.current = true;
      console.log("BattleRoom.tsx: Room status is 'in_progress'. Starting battle immediately...");
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      // Add a small delay to ensure the UI transitions smoothly
      setTimeout(() => {
        onBattleStart(room);
      }, 500);
    }
  }, [room, onBattleStart]);

  // Real-time subscription
  useEffect(() => {
    if (!roomId) return;

    console.log('BattleRoom.tsx: Setting up real-time subscriptions for roomId:', roomId);

    const participantChannel = supabase
      .channel(`battle_room_${roomId}_participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_participants',
          filter: `battle_room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('BattleRoom.tsx: Real-time participant change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
        }
      )
      .subscribe();

    const roomStatusChannel = supabase
      .channel(`battle_room_${roomId}_status`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('BattleRoom.tsx: Real-time room status change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
          const updatedRoom = payload.new as RoomData; // Cast to RoomData
          if (updatedRoom.status === 'in_progress') {
            console.log("BattleRoom.tsx: Room status changed to 'in_progress' via real-time. Waiting for full room refresh.");
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
          } else if (updatedRoom.status === 'completed') {
            console.log("BattleRoom.tsx: Room status changed to 'completed'. Leaving room.");
            onLeave();
            toast({
              title: "Room Closed",
              description: "This battle room has been closed.",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('BattleRoom.tsx: Cleaning up real-time channels');
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(roomStatusChannel);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [roomId, queryClient, onBattleStart, onLeave, toast]);

  useEffect(() => {
    if (!room?.battle_participants?.length) {
      setParticipantAvatars({});
      return;
    }

    const userIds = Array.from(new Set(
      room.battle_participants
        .map(participant => participant.user_id)
        .filter(Boolean)
    ));
    if (userIds.length === 0) return;

    let cancelled = false;
    const loadParticipantAvatars = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds);

      if (cancelled || error) return;

      const avatarMap = (data || []).reduce<Record<string, string | null>>((map, profile: any) => {
        map[profile.id] = profile.avatar_url || null;
        return map;
      }, {});
      setParticipantAvatars(avatarMap);
    };

    loadParticipantAvatars();
    return () => {
      cancelled = true;
    };
  }, [room?.battle_participants]);

  useEffect(() => {
    if (!room || room.status !== 'waiting' || room.host_id !== userId || room.is_private) return;
    if (botFillInFlightRef.current) return;

    const fillBots = async () => {
      const config = await getGameControllerConfig();
      if (!config.botsEnabled) return;

      const rule = config.roomFill[room.battle_type];
      if (!rule) return;

      const participants = room.battle_participants || [];
      const botCount = participants.filter(participant => participant.is_bot).length;
      const targetPlayers = room.battle_type === 'rapid_fire'
        ? room.max_players
        : Math.min(room.max_players, rule.targetPlayers);
      const missingPlayers = Math.max(0, targetPlayers - participants.length);
      const maxBotsForRoom = room.battle_type === 'rapid_fire'
        ? Math.max(0, room.max_players - participants.filter(participant => !participant.is_bot).length)
        : rule.maxBots;
      const botsToAdd = Math.min(missingPlayers, Math.max(0, maxBotsForRoom - botCount));
      if (botsToAdd <= 0) return;

      botFillInFlightRef.current = true;
      const usedNames = new Set(participants.map(participant => participant.username));

      const rapidFireFillDuration = 100_000 + Math.random() * 60_000;
      const baseJoinDelay = room.battle_type === 'ffa'
        ? Math.min(config.botJoinDelayMs, 850)
        : config.botJoinDelayMs;
      const joinJitter = room.battle_type === 'rapid_fire' ? 350 : room.battle_type === 'ffa' ? 450 : 1400;

      Array.from({ length: botsToAdd }).forEach((_, index) => {
        window.setTimeout(async () => {
          try {
            const botName = getBotName(config.botNames, usedNames);
            usedNames.add(botName);
            const team = room.battle_type === '2v2'
              ? ((participants.length + index) % 2) + 1
              : null;

            const botRow = {
              battle_room_id: room.id,
              user_id: createBotUserId(),
              username: botName,
              team,
              score: 0,
              answers: [],
              is_ready: true,
              is_bot: true,
              bot_accuracy: createBotAccuracy(config),
            };

            const { data: latestRoom } = await supabase
              .from('battle_rooms')
              .select('status, countdown_initiated_at, current_players')
              .eq('id', room.id)
              .single();
            if (latestRoom?.status !== 'waiting' || latestRoom?.countdown_initiated_at) return;

            const { error } = await supabase.from('battle_participants').insert(botRow);
            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
          } catch (error) {
            console.warn('Unable to add battle bot.', error);
          } finally {
            if (index === botsToAdd - 1) botFillInFlightRef.current = false;
          }
        }, room.battle_type === 'rapid_fire'
          ? ((index + 1) / botsToAdd) * rapidFireFillDuration + Math.random() * joinJitter
          : baseJoinDelay * (index + 1) + Math.random() * joinJitter);
      });
    };

    fillBots();
  }, [room, roomId, userId, queryClient]);

  useEffect(() => {
    if (!room || room.status !== 'waiting' || room.host_id !== userId || room.is_private || room.countdown_initiated_at) return;
    if (room.battle_type === '1v1' || room.battle_type === '2v2') return;

    if (room.battle_type === 'rapid_fire') {
      if (rapidFireChurnScheduledRef.current) return;
      rapidFireChurnScheduledRef.current = true;

      const leavesToSchedule = Math.floor(Math.random() * 6) + 3;
      rapidFireChurnTimersRef.current = Array.from({ length: leavesToSchedule }).map((_, index) => {
        const delay = 24_000 + index * (9_000 + Math.random() * 8_000);
        return window.setTimeout(async () => {
          const { data: latestRoom } = await supabase
            .from('battle_rooms')
            .select('status, countdown_initiated_at')
            .eq('id', room.id)
            .single();
          if (latestRoom?.status !== 'waiting' || latestRoom?.countdown_initiated_at) return;

          const { data: candidates } = await supabase
            .from('battle_participants')
            .select('user_id')
            .eq('battle_room_id', room.id)
            .eq('is_bot', true)
            .limit(30);
          if (!candidates || candidates.length === 0) return;

          const leavingParticipant = candidates[Math.floor(Math.random() * candidates.length)];
          await supabase
            .from('battle_participants')
            .delete()
            .eq('battle_room_id', room.id)
            .eq('user_id', leavingParticipant.user_id);
          queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
        }, delay);
      });
      return;
    }

    const bots = (room.battle_participants || []).filter(participant => participant.is_bot);
    const humans = (room.battle_participants || []).filter(participant => !participant.is_bot);
    const churnChance = room.battle_type === 'ffa' ? 0.08 : 0.25;
    const churnDelay = room.battle_type === 'ffa'
      ? 18000 + Math.random() * 15000
      : 7000 + Math.random() * 9000;
    if (bots.length === 0 || humans.length === 0 || Math.random() > churnChance) return;
    if (room.battle_type === 'ffa' && bots.length < 2) return;

    const timer = window.setTimeout(async () => {
      const leavingBot = bots[Math.floor(Math.random() * bots.length)];
      await supabase
        .from('battle_participants')
        .delete()
        .eq('battle_room_id', room.id)
        .eq('user_id', leavingBot.user_id);
      queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
    }, churnDelay);

    return () => window.clearTimeout(timer);
  }, [room, roomId, userId, queryClient]);

  useEffect(() => {
    return () => {
      rapidFireChurnTimersRef.current.forEach(timer => window.clearTimeout(timer));
      rapidFireChurnTimersRef.current = [];
    };
  }, []);

  // Countdown management
  useEffect(() => {
    console.log('BattleRoom.tsx: Countdown effect triggered. Room status:', room?.status, 'countdown_initiated_at:', room?.countdown_initiated_at);
    
    if (countdownTimerRef.current) {
      console.log('BattleRoom.tsx: Clearing existing countdown timer.');
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (!room || room.status === 'in_progress' || room.status === 'completed') {
      console.log('BattleRoom.tsx: Room is not in waiting state or already in progress/completed. Resetting countdown.');
      setCountdown(null);
      return;
    }

    const currentPlayers = room.battle_participants?.length || 0;
    const isRoomFull = currentPlayers === room.max_players;
    const isWaitingStatus = room.status === 'waiting';
    const isCountdownInitiated = room.countdown_initiated_at !== null;

    console.log(`BattleRoom.tsx: isRoomFull: ${isRoomFull}, isWaitingStatus: ${isWaitingStatus}, isCountdownInitiated: ${isCountdownInitiated}`);

    if (room.battle_type !== 'rapid_fire' && isWaitingStatus && (isRoomFull || isCountdownInitiated)) {
      const countdownDuration = 5;
      let elapsedSeconds = 0;

      if (isCountdownInitiated && room.countdown_initiated_at) {
        elapsedSeconds = Math.min(countdownDuration, Math.max(0, Math.floor((Date.now() - new Date(room.countdown_initiated_at).getTime()) / 1000) + 1));
      } else if (isRoomFull && !isCountdownInitiated) {
        if (room.host_id !== userId) return;
        const updateCountdownInitiated = async () => {
          const { error } = await supabase
            .from('battle_rooms')
            .update({ countdown_initiated_at: new Date().toISOString() })
            .eq('id', room.id)
            .eq('host_id', userId)
            .eq('status', 'waiting');
          if (error) {
            console.error('BattleRoom.tsx: Error setting countdown_initiated_at:', error);
            toast({
              title: "Error",
              description: "Failed to initiate battle countdown. Please check database permissions.",
              variant: "destructive",
            });
          } else {
            queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
          }
        };
        updateCountdownInitiated();
        return;
      }

      setCountdown(elapsedSeconds);
      
      if (elapsedSeconds >= countdownDuration) {
        if (room.host_id !== userId) return;
        const updateStatus = async () => {
          const { error } = await supabase
            .from('battle_rooms')
            .update({
              status: 'in_progress',
              started_at: new Date().toISOString(),
            })
            .eq('id', roomId)
            .eq('host_id', userId)
            .eq('status', 'waiting');
          if (error) {
            console.error('BattleRoom.tsx: Error updating room status to in_progress:', error);
            toast({
              title: "Error",
              description: "Failed to start battle automatically.",
              variant: "destructive",
            });
          } else {
            console.log('BattleRoom.tsx: Room status successfully updated to in_progress.');
          }
        };
        updateStatus();
        return;
      }

      countdownTimerRef.current = setInterval(() => {
        if (!room.countdown_initiated_at) return;
        const nextElapsed = Math.min(countdownDuration, Math.max(0, Math.floor((Date.now() - new Date(room.countdown_initiated_at).getTime()) / 1000) + 1));
        setCountdown(nextElapsed);
        if (nextElapsed >= countdownDuration) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          if (room.host_id === userId) {
            supabase
              .from('battle_rooms')
              .update({
                status: 'in_progress',
                started_at: new Date().toISOString(),
              })
              .eq('id', roomId)
              .eq('host_id', userId)
              .eq('status', 'waiting')
              .then(({ error }) => {
                if (error) {
                  console.error('BattleRoom.tsx: Error finalizing countdown start:', error);
                  toast({
                    title: "Start Failed",
                    description: error.message || "Failed to start battle automatically.",
                    variant: "destructive",
                  });
                } else {
                  queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
                }
              });
          }
        }
      }, 250);
    } else {
      console.log('BattleRoom.tsx: Room not full or countdown not initiated, and not in waiting state. Resetting countdown to null.');
      setCountdown(null);
    }

    return () => {
      console.log('BattleRoom.tsx: Cleanup function for countdown effect.');
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [room, roomId, userId, toast, queryClient]); // Added queryClient to dependencies

  // Participant safety checks
  useEffect(() => {
    if (!room) return;

    const currentPlayers = room.battle_participants?.length || 0;
    const isHost = room.host_id === userId;
    prevParticipantsCount.current = currentPlayers;

    const currentUserIsParticipant = room.battle_participants?.some(
      (participant) => participant.user_id === userId
    );

    if (!currentUserIsParticipant && !isHost && !isLeaving) {
      toast({
        title: "Kicked from Room",
        description: "You have been removed from this battle room.",
        variant: "destructive",
      });
      console.log('BattleRoom.tsx: User kicked from room notification.');
      onLeave();
    }
  }, [room, userId, onLeave, toast, isLeaving]);

  // Host ping notification
  useEffect(() => {
    if (!room || room.host_id !== userId) return;

    if (room.host_ping_requested_at &&
        (room.host_ping_requested_at !== prevHostPingRequestedAt.current ||
         room.last_ping_sender_id !== prevHostPingSenderId.current)) {
      const senderName = room.last_ping_sender_username || "A participant";
      toast({
        title: "Ping Received!",
        description: `${senderName} wants to start the battle!`,
        duration: 3000,
      });
      console.log('BattleRoom.tsx: Host ping received notification.');
    }
    prevHostPingRequestedAt.current = room.host_ping_requested_at;
    prevHostPingSenderId.current = room.last_ping_sender_id;
  }, [room, userId, toast]);

  // Leave room mutation
  const leaveRoomMutation = useMutation({
    mutationFn: async () => {
      setIsLeaving(true);
      console.log('BattleRoom.tsx: Attempting to delete participant from room.');
      const { error } = await supabase
        .from('battle_participants')
        .delete()
        .eq('battle_room_id', roomId)
        .eq('user_id', userId);

      if (error) {
        console.error("BattleRoom.tsx: Error leaving room:", error);
        throw error;
      }
      console.log('BattleRoom.tsx: Participant successfully deleted.');
    },
    onSuccess: async () => {
      if (room && room.host_id === userId) {
        const remainingParticipants = room.battle_participants?.filter(p => p.user_id !== userId);

        if (remainingParticipants && remainingParticipants.length > 0) {
          const newHost = remainingParticipants.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];

          console.log('BattleRoom.tsx: Host leaving, assigning new host:', newHost.user_id);
          const { error: updateHostError } = await supabase
            .from('battle_rooms')
            .update({ host_id: newHost.user_id })
            .eq('id', roomId);

          if (updateHostError) {
            console.error('BattleRoom.tsx: Error updating new host:', updateHostError);
          } else {
            toast({
              title: "Host Changed",
              description: `${newHost.username} is now the host.`,
            });
          }
        } else {
          console.log('BattleRoom.tsx: Host leaving, no remaining participants. Room will likely be cleaned up by backend.');
          // Optionally, you could set room status to 'completed' or 'empty' here if no participants are left
          // await supabase.from('battle_rooms').update({ status: 'completed' }).eq('id', roomId);
        }
      }

      toast({ 
        title: "Left Room", 
        description: "You have left the battle room." 
      });
      onLeave();
      console.log('BattleRoom.tsx: User successfully left room and transitioned to lobby.');
    },
    onError: (error: any) => {
      console.error('BattleRoom.tsx: Error in leaveRoomMutation:', error);
      toast({
        title: "Error",
        description: `Failed to leave room: ${error.message}`,
        variant: "destructive"
      });
      setIsLeaving(false);
    }
  });

  // Remove participant mutation
  const removeParticipantMutation = useMutation({
    mutationFn: async (participantUserId: string) => {
      if (!room || room.host_id !== userId) {
        throw new Error("Only the host can remove participants.");
      }
      if (participantUserId === userId) {
        throw new Error("You cannot remove yourself.");
      }

      console.log('BattleRoom.tsx: Host attempting to remove participant:', participantUserId);
      const { error } = await supabase
        .from('battle_participants')
        .delete()
        .eq('battle_room_id', roomId)
        .eq('user_id', participantUserId);

      if (error) {
        console.error("BattleRoom.tsx: Error removing participant:", error);
        throw error;
      }
      console.log('BattleRoom.tsx: Participant removed successfully.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
      toast({ 
        title: "Participant Removed", 
        description: "A participant has been removed from the room." 
      });
    },
    onError: (error: any) => {
      console.error('BattleRoom.tsx: Error in removeParticipantMutation:', error);
      toast({
        title: "Error",
        description: `Failed to remove participant: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const loadRapidFireQuestions = async () => {
    if (!room?.subject_id) return [];

    const requestedQuestions = Math.max(20, room.total_questions || 20);
    const { data: mcqs, error } = await supabase
      .from('mcqs')
      .select('id, question, options, correct_answer, explanation, chapters!inner(subject_id)')
      .eq('chapters.subject_id', room.subject_id)
      .limit(requestedQuestions * 2);

    if (error) throw error;
    if (!mcqs || mcqs.length === 0) {
      throw new Error("No MCQs found for this Rapid Fire subject.");
    }

    return mcqs
      .map((mcq: any) => ({
        id: mcq.id,
        question: mcq.question,
        options: Array.isArray(mcq.options)
          ? mcq.options
          : typeof mcq.options === 'string'
            ? JSON.parse(mcq.options)
            : [],
        correct_answer: mcq.correct_answer,
        explanation: mcq.explanation,
      }))
      .sort(() => Math.random() - 0.5)
      .slice(0, requestedQuestions);
  };

  // Start battle mutation (FFA and Rapid Fire)
  const startBattleMutation = useMutation({
    mutationFn: async () => {
      if (!room || room.host_id !== userId) {
        throw new Error("Only the host can start the battle.");
      }
      if (room.battle_type !== 'ffa' && room.battle_type !== 'rapid_fire') {
        throw new Error("Only FFA and Rapid Fire battles can be started manually by the host.");
      }
      if (room.status !== 'waiting') {
        throw new Error("Battle can only be started from 'waiting' status.");
      }
      if ((room.battle_participants?.length || 0) < 2) {
        throw new Error("At least 2 participants are required to start.");
      }

      if (room.battle_type === 'rapid_fire') {
        const questions = await loadRapidFireQuestions();
        const { error } = await supabase
          .from('battle_rooms')
          .update({
            questions,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            question_started_at: new Date().toISOString(),
            current_question: 0,
            countdown_initiated_at: null,
            paused_at: null,
          })
          .eq('id', roomId);

        if (error) throw error;
        return;
      }

      console.log('BattleRoom.tsx: Host is starting battle manually (FFA), updating countdown_initiated_at.');
      const { error } = await supabase
        .from('battle_rooms')
        .update({
          countdown_initiated_at: new Date().toISOString(),
          host_ping_requested_at: null,
          last_ping_sender_id: null,
          last_ping_sender_username: null,
        })
        .eq('id', roomId);

      if (error) {
        console.error("BattleRoom.tsx: Error initiating countdown from manual start:", error);
        throw error;
      }
      console.log('BattleRoom.tsx: Manual battle start initiated successfully.');
    },
    onSuccess: () => {
      toast({
        title: "Starting Battle!",
        description: room?.battle_type === 'rapid_fire'
          ? "Rapid Fire is live."
          : "The host has initiated the battle countdown.",
      });
    },
    onError: (error: any) => {
      console.error('BattleRoom.tsx: Error in startBattleMutation:', error);
      toast({
        title: "Error Starting Battle",
        description: `Failed to start battle: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const joinTeamMutation = useMutation({
    mutationFn: async (team: number | null) => {
      if (!room || room.status !== 'waiting') {
        throw new Error("Teams lock once the match starts.");
      }
      const { error } = await supabase
        .from('battle_participants')
        .update({ team })
        .eq('battle_room_id', roomId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
    },
    onError: (error: any) => {
      toast({
        title: "Team Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Ping host mutation
  const pingHostMutation = useMutation({
    mutationFn: async () => {
      if (!room || room.host_id === userId) {
        throw new Error("Invalid action: cannot ping host or not in a room.");
      }
      if (room.battle_type !== 'ffa') {
        throw new Error("Pinging host is only available in FFA mode.");
      }
      if (room.status !== 'waiting') {
        throw new Error("Cannot ping host once battle has started.");
      }

      const senderUsername = room.battle_participants.find(p => p.user_id === userId)?.username || 'A participant';

      console.log('BattleRoom.tsx: Attempting to ping host.');
      const { error } = await supabase
        .from('battle_rooms')
        .update({
          host_ping_requested_at: new Date().toISOString(),
          last_ping_sender_id: userId,
          last_ping_sender_username: senderUsername
        })
        .eq('id', roomId);

      if (error) {
        console.error("BattleRoom.tsx: Error pinging host:", error);
        throw error;
      }
      console.log('BattleRoom.tsx: Host ping sent successfully.');
    },
    onSuccess: () => {
      toast({
        title: "Ping Sent!",
        description: "Host has been notified to start the battle.",
      });
    },
    onError: (error: any) => {
      console.error('BattleRoom.tsx: Error in pingHostMutation:', error);
      toast({
        title: "Error Pinging Host",
        description: `Failed to send ping: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Copy room code function
  const handleCopyRoomCode = () => {
    if (room?.room_code) {
      navigator.clipboard.writeText(room.room_code).then(() => {
        toast({
          title: "Copied!",
          description: "Room code copied to clipboard.",
        });
        console.log('BattleRoom.tsx: Room code copied to clipboard.');
      }).catch((err) => {
        console.error('BattleRoom.tsx: Failed to copy room code:', err);
        toast({
          title: "Copy Failed",
          description: "Could not copy room code. Please try manually.",
          variant: "destructive",
        });
      });
    }
  };

  const handleLeaveClick = () => {
    const isHost = room?.host_id === userId;
    if (isHost) {
      console.log('BattleRoom.tsx: Host attempting to leave, showing confirmation modal.');
      setShowConfirmLeaveModal(true);
    } else {
      console.log('BattleRoom.tsx: Non-host leaving directly.');
      leaveRoomMutation.mutate();
    }
  };

  const confirmLeave = () => {
    console.log('BattleRoom.tsx: Host confirmed leaving.');
    setShowConfirmLeaveModal(false);
    leaveRoomMutation.mutate();
  };

  const cancelLeave = () => {
    console.log('BattleRoom.tsx: Host cancelled leaving.');
    setShowConfirmLeaveModal(false);
  };

  if (roomLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <p className="ml-3 text-lg text-gray-700 dark:text-gray-300">Loading room details...</p>
      </div>
    );
  }

  if (roomError || !room) {
    console.error('BattleRoom.tsx: Room data error or not found:', roomError);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 p-4 text-center">
        <XCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Error Loading Room</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {roomError?.message || "Room not found or accessible."}
        </p>
        <Button onClick={onLeave} className="mt-6 bg-red-600 hover:bg-red-700 text-white">
          Back to Lobby
        </Button>
      </div>
    );
  }

  const currentPlayers = room.battle_participants?.length || 0;
  const isRoomFull = currentPlayers === room.max_players;
  const isGameStarting = room.status === 'in_progress';
  const isHost = room.host_id === userId;
  const isCountdownInitiated = room.countdown_initiated_at !== null;
  const isRapidFire = room.battle_type === 'rapid_fire';
  const battleLabel = isRapidFire ? 'Rapid Fire' : room.battle_type === 'ffa' ? 'Free For All' : room.battle_type === '2v2' ? '2v2 Team' : '1v1 Duel';
  const playerFillPercent = Math.min(100, Math.round((currentPlayers / Math.max(room.max_players, 1)) * 100));
  const statusText = countdown !== null && room.status === 'waiting' && countdown > 0
    ? `Match launch ${countdown}/5`
    : isGameStarting
      ? 'Starting battle now...'
      : room.status === 'waiting'
        ? isHost ? 'Waiting for challengers' : 'Waiting for host'
        : 'Room active';
  const canStartManually = isHost
    && (room.battle_type === 'ffa' || room.battle_type === 'rapid_fire')
    && room.status === 'waiting'
    && currentPlayers > 1
    && !isCountdownInitiated;

  return (
    <div className="min-h-screen bg-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+226px)] pt-[calc(env(safe-area-inset-top)+104px)]">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div className="fixed inset-x-0 top-0 z-50 border-b border-border/40 bg-background/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-md">
          <div className="mx-auto w-full max-w-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
                  <Gamepad2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Live Competition</p>
                  <h1 className="truncate text-2xl font-black uppercase italic tracking-tight text-foreground">Battle Arena</h1>
                  <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{battleLabel} lobby</p>
                </div>
              </div>
              <Badge className="shrink-0 border-0 bg-primary/10 text-primary">
                {isHost ? 'Host' : 'Member'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-4">
            <section className="rounded-2xl border border-border/45 bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Room Code</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="text"
                      readOnly
                      value={room.room_code}
                      className="h-12 w-36 rounded-xl border-border/60 bg-background text-center font-mono text-xl font-black tracking-widest sm:w-44"
                    />
                    <Button onClick={handleCopyRoomCode} className="h-12 rounded-xl px-4 font-black uppercase tracking-widest">
                      <Copy className="mr-2 h-4 w-4" /> Copy
                    </Button>
                  </div>
                </div>
                <div className="min-w-[180px] rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-primary">{currentPlayers}/{room.max_players}</span>
                    <span className="text-muted-foreground">joined</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${playerFillPercent}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{statusText}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl border border-border/45 bg-card p-3 shadow-sm">
                <Users className="mb-2 h-4 w-4 text-primary" />
                <p className="text-lg font-black text-foreground">{currentPlayers}/{room.max_players}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Members</p>
              </div>
              <div className="rounded-2xl border border-border/45 bg-card p-3 shadow-sm">
                <Swords className="mb-2 h-4 w-4 text-primary" />
                <p className="truncate text-lg font-black text-foreground">{battleLabel}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mode</p>
              </div>
              <div className="rounded-2xl border border-border/45 bg-card p-3 shadow-sm">
                <Hourglass className="mb-2 h-4 w-4 text-primary" />
                <p className="text-lg font-black text-foreground">{room.total_questions} Qs</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{room.time_per_question}s each</p>
              </div>
              <div className="rounded-2xl border border-border/45 bg-card p-3 shadow-sm">
                {isRapidFire ? <Trophy className="mb-2 h-4 w-4 text-primary" /> : <BookOpenText className="mb-2 h-4 w-4 text-primary" />}
                <p className="truncate text-lg font-black text-foreground">{isRapidFire ? (room.win_target || 20) : (room.subject || 'Topic')}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{isRapidFire ? 'Win target' : 'Subject'}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-border/45 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Members</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{currentPlayers} candidate{currentPlayers === 1 ? '' : 's'} in the room</p>
                </div>
                <Badge variant="outline" className="bg-background">{statusText}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {room.battle_participants?.map((participant) => {
                  const isCurrentUser = participant.user_id === userId;
                  const participantIsHost = room.host_id === participant.user_id;
                  const initial = (participant.username || '?').trim().charAt(0).toUpperCase() || '?';
                  const avatarUrl = participantAvatars[participant.user_id];
                  return (
                    <div
                      key={participant.id}
                      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm transition hover:border-primary/30 ${
                        isCurrentUser ? 'border-primary/25 bg-primary/5' : 'border-border/45 bg-background/70'
                      }`}
                    >
                      <Avatar className={`h-10 w-10 shrink-0 rounded-2xl border ${
                        participantIsHost ? 'border-amber-500/20' : 'border-primary/15'
                      }`}>
                        <AvatarImage src={avatarUrl || undefined} alt={`${participant.username} avatar`} className="object-cover" />
                        <AvatarFallback className={`rounded-2xl text-sm font-black ${
                          participantIsHost ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'
                        }`}>
                          {initial}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-foreground">{participant.username}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {isCurrentUser && (
                            <Badge className="h-5 rounded-full border-0 bg-primary/10 px-2 text-[10px] text-primary">You</Badge>
                          )}
                          {participantIsHost && (
                            <Badge className="h-5 rounded-full border-0 bg-amber-500/10 px-2 text-[10px] text-amber-600">Host</Badge>
                          )}
                        </div>
                      </div>

                      {isHost && participant.user_id !== userId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 shrink-0 rounded-xl p-0 text-destructive hover:text-destructive"
                          onClick={() => removeParticipantMutation.mutate(participant.user_id)}
                          disabled={removeParticipantMutation.isPending}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {!isHost && participant.user_id === room.host_id && room.battle_type === 'ffa' && room.status === 'waiting' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-9 shrink-0 rounded-xl px-2 text-xs font-bold text-primary hover:text-primary"
                          onClick={() => pingHostMutation.mutate()}
                          disabled={pingHostMutation.isPending}
                        >
                          <Bell className="mr-1.5 h-3.5 w-3.5" /> Ping Host
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-md">
        <div className="mx-auto w-full max-w-lg space-y-3">
          <section className="rounded-2xl border border-border/45 bg-card p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Status</p>
            <h2 className="mt-1 text-base font-black text-foreground">{statusText}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isRapidFire
                ? 'Every candidate competes individually.'
                : isRoomFull
                  ? 'Room is full. The match will start automatically.'
                  : 'Share the room code and wait for the room to fill.'}
            </p>
          </section>

          <div className={`grid gap-2 ${canStartManually ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <Button
              onClick={handleLeaveClick}
              disabled={leaveRoomMutation.isPending}
              variant="outline"
              className="h-12 rounded-2xl border-border/60 font-bold text-foreground hover:bg-muted/50"
            >
              {isLeaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Leave Room
            </Button>
            {canStartManually && (
            <Button
              onClick={() => startBattleMutation.mutate()}
              disabled={startBattleMutation.isPending || currentPlayers < 2}
              className="h-12 rounded-2xl bg-primary text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              {startBattleMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {isRapidFire ? 'Start Rapid Fire' : 'Start Battle'}
            </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmLeaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm p-6 text-center shadow-lg bg-white dark:bg-gray-800">
            <CardTitle className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Confirm Leave
            </CardTitle>
            <CardDescription className="text-gray-700 dark:text-gray-300 mb-6">
              As the host, if you leave, a new host will be assigned. Are you sure you want to leave this battle room?
            </CardDescription>
            <div className="flex justify-center space-x-4">
              <Button
                variant="destructive"
                onClick={confirmLeave}
                disabled={leaveRoomMutation.isPending}
                className="px-6 py-2"
              >
                {leaveRoomMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  "Yes, Leave"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={cancelLeave}
                className="px-6 py-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
