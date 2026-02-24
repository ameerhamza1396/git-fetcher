import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Swords, XCircle, Gamepad2, Hourglass, Copy, BookOpenText, Play, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

interface BattleRoomProps {
  roomId: string;
  userId: string;
  onLeave: () => void;
  onBattleStart: (roomData: RoomData) => void;
}

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
  host_ping_requested_at: string | null;
  last_ping_sender_id: string | null;
  last_ping_sender_username: string | null;
  countdown_initiated_at: string | null;
  created_at: string;
  battle_participants: { 
    id: string; 
    user_id: string; 
    username: string; 
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

  // Fetch room details and participants in real-time
  const { data: room, isLoading: roomLoading, error: roomError } = useQuery({
    queryKey: ['battleRoom', roomId],
    queryFn: async (): Promise<RoomData> => {
      console.log('BattleRoom.tsx: Fetching battle room for roomId:', roomId);
      const { data, error } = await supabase
        .from('battle_rooms')
        .select(`
          *,
          battle_participants(id, user_id, username, created_at)
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
    if (room && room.status === 'in_progress') {
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
            console.log("BattleRoom.tsx: Room status changed to 'in_progress' via real-time. Triggering battle start.");
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            // Trigger battle start with updated room data
            setTimeout(() => {
              onBattleStart(updatedRoom);
            }, 500);
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

    if (isWaitingStatus && (isRoomFull || isCountdownInitiated)) {
      const initialCountdownDuration = room.battle_type === '1v1' ? 5 : 10; // 5 seconds for 1v1, 10 for others
      let calculatedTimeRemaining = initialCountdownDuration;

      if (isCountdownInitiated && room.countdown_initiated_at) {
        const timeElapsed = (new Date().getTime() - new Date(room.countdown_initiated_at).getTime()) / 1000;
        calculatedTimeRemaining = Math.max(0, initialCountdownDuration - Math.floor(timeElapsed));
        console.log(`BattleRoom.tsx: Countdown initiated at ${room.countdown_initiated_at}. Time elapsed: ${timeElapsed}s. Calculated remaining: ${calculatedTimeRemaining}s`);
      } else if (isRoomFull && !isCountdownInitiated) {
        // This block handles the first time the room becomes full and countdown needs to be initiated
        console.log('BattleRoom.tsx: Room is full and countdown not initiated. Attempting to set countdown_initiated_at.');
        const updateCountdownInitiated = async () => {
          const { error } = await supabase
            .from('battle_rooms')
            .update({ countdown_initiated_at: new Date().toISOString() })
            .eq('id', room.id);
          if (error) {
            console.error('BattleRoom.tsx: Error setting countdown_initiated_at:', error);
            toast({
              title: "Error",
              description: "Failed to initiate battle countdown. Please check database permissions.",
              variant: "destructive",
            });
          } else {
            console.log('BattleRoom.tsx: Successfully set countdown_initiated_at for room:', room.id);
            // Invalidate query to refetch room data with new countdown_initiated_at
            queryClient.invalidateQueries({ queryKey: ['battleRoom', roomId] });
          }
        };
        updateCountdownInitiated();
        // Return here to let the next render cycle (triggered by invalidateQueries) handle the countdown start
        return;
      }

      setCountdown(calculatedTimeRemaining);
      console.log(`BattleRoom.tsx: Setting countdown to: ${calculatedTimeRemaining}`);
      
      if (calculatedTimeRemaining <= 0) {
        const updateStatus = async () => {
          console.log('BattleRoom.tsx: Countdown finished (calculatedTimeRemaining <= 0), updating room status to in_progress');
          const { error } = await supabase
            .from('battle_rooms')
            .update({ status: 'in_progress', countdown_initiated_at: null })
            .eq('id', roomId);
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
        return; // Exit useEffect after triggering status update
      }

      if (calculatedTimeRemaining > 0) {
        console.log('BattleRoom.tsx: Starting interval for countdown display.');
        countdownTimerRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev === null || prev <= 1) {
              console.log('BattleRoom.tsx: Countdown timer reached 0 or less. Triggering status update.');
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
              }
              const updateStatus = async () => {
                console.log('BattleRoom.tsx: Countdown timer finished, updating room status to in_progress');
                const { error } = await supabase
                  .from('battle_rooms')
                  .update({ status: 'in_progress', countdown_initiated_at: null })
                  .eq('id', roomId);
                if (error) {
                  console.error('BattleRoom.tsx: Error updating room status from interval:', error);
                } else {
                  console.log('BattleRoom.tsx: Room status successfully updated to in_progress from interval.');
                }
              };
              updateStatus();
              return 0; // Set countdown to 0
            }
            return prev - 1;
          });
        }, 1000);
      }
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
  }, [room, roomId, toast, queryClient]); // Added queryClient to dependencies

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

  // Start battle mutation (FFA only)
  const startBattleMutation = useMutation({
    mutationFn: async () => {
      if (!room || room.host_id !== userId) {
        throw new Error("Only the host can start the battle.");
      }
      if (room.battle_type !== 'ffa') {
        throw new Error("Only FFA battles can be started manually by the host.");
      }
      if (room.status !== 'waiting') {
        throw new Error("Battle can only be started from 'waiting' status.");
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
        description: "The host has initiated the battle countdown.",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 p-4 flex flex-col items-center justify-center">
      <Card className="w-full max-w-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-red-200 dark:border-red-800 shadow-xl">
        <CardHeader className="text-center p-6 pb-4">
          <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center space-x-3">
            <Gamepad2 className="w-8 h-8 text-red-600 dark:text-red-400" />
            <span>Battle Room</span>
          </CardTitle>
          <CardDescription className="text-md text-gray-600 dark:text-gray-300 mt-2">
            Waiting for players to join...
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-6">
          {/* Room Code Display */}
          <div className="flex flex-col items-center space-y-2 mt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Room Code:</p>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                readOnly
                value={room.room_code}
                className="w-32 md:w-40 text-center font-mono text-xl tracking-wider select-text"
              />
              <Button onClick={handleCopyRoomCode} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white">
                <Copy className="w-4 h-4 mr-2" /> Copy
              </Button>
            </div>
          </div>

          {/* Room Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start text-center mt-6">
            <div>
              <Users className="w-6 h-6 mx-auto mb-1 text-red-600 dark:text-red-400" />
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {currentPlayers} / {room.max_players}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Players Joined</p>
            </div>
            <div>
              <Swords className="w-6 h-6 mx-auto mb-1 text-red-600 dark:text-red-400" />
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{room.battle_type}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Battle Type</p>
            </div>
            <div>
              <Hourglass className="w-6 h-6 mx-auto mb-1 text-red-600 dark:text-red-400" />
              <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                {room.total_questions} Qs / {room.time_per_question}s
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Settings</p>
            </div>
            {room.subject && (
              <div>
                <BookOpenText className="w-6 h-6 mx-auto mb-1 text-red-600 dark:text-red-400" />
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{room.subject}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Subject</p>
              </div>
            )}
          </div>

          {/* Players List */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 dark:text-white">Current Players:</h3>
            <div className="flex flex-col space-y-2">
              {room.battle_participants?.map((participant) => (
                <Badge
                  key={participant.id}
                  variant="secondary"
                  className="w-full flex items-center justify-start p-3 text-md border border-gray-200 dark:border-gray-700 rounded-md shadow-sm"
                >
                  <Users className="w-4 h-4 mr-2" />
                  <span>{participant.username}</span>
                  {participant.user_id === userId && room.host_id === participant.user_id && (
                    <span className="ml-1 font-bold text-red-700 dark:text-red-300">(You, Host)</span>
                  )}
                  {participant.user_id === userId && room.host_id !== participant.user_id && (
                    <span className="ml-1 text-purple-600 dark:text-purple-400">(You)</span>
                  )}
                  {room.host_id === participant.user_id && participant.user_id !== userId && (
                    <span className="ml-1 font-bold text-blue-600 dark:text-blue-400">(Host)</span>
                  )}

                  {/* Host can remove participants */}
                  {isHost && participant.user_id !== userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto p-1 h-auto text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
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
                      className="ml-auto p-1 h-auto text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-200"
                      onClick={() => pingHostMutation.mutate()}
                      disabled={pingHostMutation.isPending}
                    >
                      <Bell className="w-4 h-4" />
                    </Button>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status Messages */}
          {countdown !== null && room.status === 'waiting' && countdown > 0 ? (
            <div className="text-center text-lg font-semibold text-green-600 dark:text-green-400 animate-pulse">
              Battle starting in {countdown} seconds!
            </div>
          ) : isGameStarting ? (
            <div className="text-center text-lg font-semibold text-green-600 dark:text-green-400 animate-pulse">
              Starting battle now...
            </div>
          ) : room.status === 'waiting' ? (
            <div className="text-center text-gray-700 dark:text-gray-300">
              Waiting for players to join...
            </div>
          ) : null}

          {/* Host Start Battle Button (FFA only) */}
          {isHost && room.battle_type === 'ffa' && room.status === 'waiting' && currentPlayers > 1 && !isCountdownInitiated && (
            <Button
              onClick={() => startBattleMutation.mutate()}
              disabled={startBattleMutation.isPending || currentPlayers < 2}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center space-x-2"
            >
              {startBattleMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Start Battle Now! (FFA)</span>
            </Button>
          )}

          {/* Leave Button */}
          <Button
            onClick={handleLeaveClick}
            disabled={leaveRoomMutation.isPending}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
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
