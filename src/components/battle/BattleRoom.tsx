import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const prevParticipantsCount = useRef<number | null>(null);
  const botFillInFlightRef = useRef(false);
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
    if (!room || room.status !== 'waiting' || room.host_id !== userId || room.is_private) return;
    if (botFillInFlightRef.current) return;

    const fillBots = async () => {
      const config = await getGameControllerConfig();
      if (!config.botsEnabled) return;

      const rule = config.roomFill[room.battle_type];
      if (!rule) return;

      const participants = room.battle_participants || [];
      const botCount = participants.filter(participant => participant.is_bot).length;
      const targetPlayers = Math.min(room.max_players, rule.targetPlayers);
      const missingPlayers = Math.max(0, targetPlayers - participants.length);
      const botsToAdd = Math.min(missingPlayers, Math.max(0, rule.maxBots - botCount));
      if (botsToAdd <= 0) return;

      botFillInFlightRef.current = true;
      const usedNames = new Set(participants.map(participant => participant.username));

      const baseJoinDelay = room.battle_type === 'ffa'
        ? Math.min(config.botJoinDelayMs, 850)
        : config.botJoinDelayMs;
      const joinJitter = room.battle_type === 'ffa' ? 450 : 1400;

      Array.from({ length: botsToAdd }).forEach((_, index) => {
        window.setTimeout(async () => {
          try {
            const botName = getBotName(config.botNames, usedNames);
            usedNames.add(botName);
            const team = room.battle_type === '2v2'
              ? ((participants.length + index) % 2) + 1
              : room.battle_type === 'rapid_fire'
                ? ((participants.length + index) % 3) + 1
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
        }, baseJoinDelay * (index + 1) + Math.random() * joinJitter);
      });
    };

    fillBots();
  }, [room, roomId, userId, queryClient]);

  useEffect(() => {
    if (!room || room.status !== 'waiting' || room.host_id !== userId || room.is_private || room.countdown_initiated_at) return;
    if (room.battle_type === '1v1' || room.battle_type === '2v2') return;

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

  // Join/Leave notifications
  useEffect(() => {
    if (!room) return;

    const currentPlayers = room.battle_participants?.length || 0;
    const isHost = room.host_id === userId;

    if (prevParticipantsCount.current !== null && prevParticipantsCount.current !== currentPlayers) {
      if (currentPlayers > prevParticipantsCount.current) {
        toast({
          title: "Player Joined!",
          description: "A new player has joined the room.",
        });
        console.log('BattleRoom.tsx: Player joined notification.');
      } else if (currentPlayers < prevParticipantsCount.current) {
        toast({
          title: "Player Left",
          description: "A player has left the room.",
        });
        console.log('BattleRoom.tsx: Player left notification.');
      }
    }
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
    if (!room?.chapter_id) return [];

    const requestedQuestions = Math.max(1, room.total_questions || 20);
    const { data: mcqs, error } = await supabase
      .from('mcqs')
      .select('id, question, options, correct_answer, explanation')
      .eq('chapter_id', room.chapter_id)
      .limit(requestedQuestions * 2);

    if (error) throw error;
    if (!mcqs || mcqs.length === 0) {
      throw new Error("No MCQs found for this Rapid Fire topic.");
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
  const currentUserParticipant = room.battle_participants?.find(p => p.user_id === userId);
  const visibleTeams = Array.from(
    new Set([1, 2, 3, ...(room.battle_participants || []).map(p => p.team).filter((team): team is number => typeof team === 'number')])
  ).sort((a, b) => a - b);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background px-4 py-6 flex flex-col items-center justify-center">
      <div className="pointer-events-none absolute left-5 top-10 h-16 w-16 rounded-full border border-primary/15 bg-primary/5" />
      <div className="pointer-events-none absolute right-8 top-24 h-9 w-9 rounded-full border border-emerald-500/20 bg-emerald-500/10" />
      <div className="pointer-events-none absolute bottom-20 left-10 h-12 w-12 rounded-full border border-orange-500/20 bg-orange-500/10" />
      <div className="pointer-events-none absolute -right-8 bottom-36 h-28 w-28 rounded-full border border-primary/10 bg-primary/5" />

      <Card className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border-border/50 bg-card/95 shadow-2xl shadow-primary/10">
        <div className="pointer-events-none absolute right-6 top-6 h-24 w-24 rounded-full border border-primary/10 bg-primary/5" />
        <div className="pointer-events-none absolute left-8 bottom-8 h-14 w-14 rounded-full border border-emerald-500/15 bg-emerald-500/10" />
        <CardHeader className="relative text-center p-6 pb-4">
          <CardTitle className="text-2xl font-black tracking-tight text-foreground flex items-center justify-center space-x-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary">
              <Gamepad2 className="w-6 h-6" />
            </span>
            <span>Battle Room</span>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-2">
            {isRapidFire ? 'Choose teams, invite friends, then let the host start Rapid Fire.' : 'Waiting for players to join...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative p-5 sm:p-6 pt-2 space-y-6">
          {/* Room Code Display */}
          <div className="flex flex-col items-center space-y-2 mt-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Room Code</p>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                readOnly
                value={room.room_code}
                className="w-32 md:w-40 text-center font-mono text-xl tracking-wider select-text bg-background"
              />
              <Button onClick={handleCopyRoomCode} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
            </div>
          </div>

          {/* Room Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-stretch text-center mt-6">
            <div className="rounded-2xl border border-border/45 bg-background/70 p-3 shadow-sm">
              <Users className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-lg font-semibold text-foreground">
                {currentPlayers} / {room.max_players}
              </p>
              <p className="text-sm text-muted-foreground">Players Joined</p>
            </div>
            <div className="rounded-2xl border border-border/45 bg-background/70 p-3 shadow-sm">
              <Swords className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-lg font-semibold text-foreground">{isRapidFire ? 'Rapid Fire' : room.battle_type}</p>
              <p className="text-sm text-muted-foreground">Battle Type</p>
            </div>
            <div className="rounded-2xl border border-border/45 bg-background/70 p-3 shadow-sm">
              <Hourglass className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-lg font-semibold text-foreground">
                {room.total_questions} Qs / {room.time_per_question}s
              </p>
              <p className="text-sm text-muted-foreground">Settings</p>
            </div>
            {room.subject && (
              <div className="rounded-2xl border border-border/45 bg-background/70 p-3 shadow-sm">
                <BookOpenText className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold text-foreground">{room.subject}</p>
                <p className="text-sm text-muted-foreground">Subject</p>
              </div>
            )}
            {isRapidFire && (
              <div className="rounded-2xl border border-border/45 bg-background/70 p-3 shadow-sm">
                <Trophy className="w-6 h-6 mx-auto mb-1 text-primary" />
                <p className="text-lg font-semibold text-foreground">{room.win_target || 20}</p>
                <p className="text-sm text-muted-foreground">Correct to Win</p>
              </div>
            )}
          </div>

          {isRapidFire && room.status === 'waiting' && (
            <div className="space-y-3 rounded-2xl border border-border/40 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">Choose Team</h3>
                  <p className="text-xs text-muted-foreground">Self-join a team or stay solo before the host starts.</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-0">Rapid Fire</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant={currentUserParticipant?.team == null ? "default" : "outline"}
                  size="sm"
                  onClick={() => joinTeamMutation.mutate(null)}
                  disabled={joinTeamMutation.isPending}
                >
                  Solo
                </Button>
                {visibleTeams.map(team => (
                  <Button
                    key={team}
                    variant={currentUserParticipant?.team === team ? "default" : "outline"}
                    size="sm"
                    onClick={() => joinTeamMutation.mutate(team)}
                    disabled={joinTeamMutation.isPending}
                  >
                    Team {team}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => joinTeamMutation.mutate(Math.max(...visibleTeams) + 1)}
                  disabled={joinTeamMutation.isPending || visibleTeams.length >= 10}
                >
                  + Team
                </Button>
              </div>
            </div>
          )}

          {/* Players List */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Current Players:</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {room.battle_participants?.map((participant) => (
                <div
                  key={participant.id}
                  className="min-h-[74px] rounded-2xl border border-border/45 bg-background/75 p-3 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{participant.username}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {isRapidFire && (
                          <Badge variant="secondary" className="h-5 rounded-full px-2 text-[10px]">
                            {participant.team ? `Team ${participant.team}` : 'Solo'}
                          </Badge>
                        )}
                        {participant.user_id === userId && (
                          <Badge className="h-5 rounded-full border-0 bg-primary/10 px-2 text-[10px] text-primary">You</Badge>
                        )}
                        {room.host_id === participant.user_id && (
                          <Badge className="h-5 rounded-full border-0 bg-amber-500/10 px-2 text-[10px] text-amber-600">Host</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Host can remove participants */}
                  {isHost && participant.user_id !== userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full rounded-xl p-1 text-destructive hover:text-destructive"
                      onClick={() => removeParticipantMutation.mutate(participant.user_id)}
                      disabled={removeParticipantMutation.isPending}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                  {/* Ping host button */}
                  {!isHost && participant.user_id === room.host_id && room.battle_type === 'ffa' && room.status === 'waiting' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full rounded-xl p-1 text-primary hover:text-primary"
                      onClick={() => pingHostMutation.mutate()}
                      disabled={pingHostMutation.isPending}
                    >
                      <Bell className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status Messages */}
          {countdown !== null && room.status === 'waiting' && countdown > 0 ? (
            <div className="text-center text-lg font-semibold text-primary animate-pulse">
              Match launch {countdown}/5
            </div>
          ) : isGameStarting ? (
            <div className="text-center text-lg font-semibold text-primary animate-pulse">
              Starting battle now...
            </div>
          ) : room.status === 'waiting' ? (
            <div className="text-center text-muted-foreground">
              Waiting for players to join...
            </div>
          ) : null}

          {/* Host Start Battle Button (FFA only) */}
          {isHost && (room.battle_type === 'ffa' || room.battle_type === 'rapid_fire') && room.status === 'waiting' && currentPlayers > 1 && !isCountdownInitiated && (
            <Button
              onClick={() => startBattleMutation.mutate()}
              disabled={startBattleMutation.isPending || currentPlayers < 2}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center justify-center space-x-2"
            >
              {startBattleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isRapidFire ? 'Start Rapid Fire Now!' : 'Start Battle Now! (FFA)'}</span>
            </Button>
          )}

          {/* Leave Button */}
          <Button
            onClick={handleLeaveClick}
            disabled={leaveRoomMutation.isPending}
            variant="outline"
            className="w-full border-border/60 text-foreground hover:bg-muted/50"
          >
            {isLeaving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Leave Room
          </Button>
        </CardContent>
      </Card>

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
