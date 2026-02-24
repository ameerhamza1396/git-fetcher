import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Clock, Trophy, Swords, RefreshCw, Hash, Timer } from 'lucide-react'; // Added Hash and Timer icons
import { SubjectChapterSelector } from './SubjectChapterSelector'; // Assuming this component is also responsive

interface BattleLobbyProps {
  onJoinBattle: (roomId: string) => void;
}

// Define the BattleRoom interface, including the new countdown_initiated_at field
interface BattleRoom {
  id: string;
  room_code: string;
  battle_type: '1v1' | '2v2' | 'ffa';
  max_players: number;
  status: 'waiting' | 'in_progress' | 'completed';
  current_players: number; // This is derived from battle_participants.length
  host_id: string;
  time_per_question: number;
  total_questions: number;
  questions: any[] | null; // This might be used if questions are stored on the room directly
  subject: string;
  countdown_initiated_at?: string | null; // Added for battle start logic
}

export const BattleLobby = ({ onJoinBattle }: BattleLobbyProps) => {
  const [rooms, setRooms] = useState<BattleRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [battleType, setBattleType] = useState<'1v1' | '2v2' | 'ffa'>('1v1');
  
  // New state for subject/chapter selection
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
  const [selectedChapterName, setSelectedChapterName] = useState<string | null>(null);

  // New state for battle settings
  const [numQuestions, setNumQuestions] = useState<number>(10); // Default to 10 questions
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15); // Default to 15 seconds per question
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Effect hook to load rooms and set up real-time subscriptions
  useEffect(() => {
    loadRooms();
    
    // Set up real-time subscription for battle rooms
    const channel = supabase
      .channel('battle_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'battle_rooms'
        },
        (payload) => {
          console.log('Real-time battle rooms change:', payload);
          loadRooms(); // Refresh the rooms list on any change
        }
      )
      .subscribe();

    // Refresh every 10 seconds as a backup mechanism
    const interval = setInterval(loadRooms, 10000);
    
    // Cleanup function to remove channel and clear interval on component unmount
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Effect to handle battle start logic (countdown and status update)
  useEffect(() => {
    rooms.forEach(async (room) => {
      // Check if room is full and waiting
      if (room.status === 'waiting' && room.current_players === room.max_players) {
        // If countdown hasn't started, initiate it
        if (!room.countdown_initiated_at) {
          console.log(`Room ${room.room_code} is full. Initiating countdown.`);
          const { error } = await supabase
            .from('battle_rooms')
            .update({ countdown_initiated_at: new Date().toISOString() })
            .eq('id', room.id);
          if (error) console.error('Error initiating countdown:', error);
          // No need to set a local timeout here, the real-time subscription will trigger loadRooms
          // and the next check will handle the actual status change after the delay.
        } else {
          // If countdown has started, check if the time is up
          const countdownDuration = room.battle_type === '1v1' ? 5 : 10; // 5 seconds for 1v1, 10 for others
          const initiatedTime = new Date(room.countdown_initiated_at).getTime();
          const currentTime = new Date().getTime();
          const elapsedSeconds = (currentTime - initiatedTime) / 1000;

          if (elapsedSeconds >= countdownDuration) {
            console.log(`Countdown finished for room ${room.room_code}. Starting battle.`);
            const { error } = await supabase
              .from('battle_rooms')
              .update({ status: 'in_progress' })
              .eq('id', room.id);
            if (error) console.error('Error starting battle:', error);
          }
        }
      }
    });
  }, [rooms]); // This effect runs whenever the 'rooms' state changes

  // Function to load battle rooms from Supabase
  const loadRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select(`
          *,
          battle_participants(id, username, user_id),
          countdown_initiated_at
        `)
        .eq('status', 'waiting') // Only fetch rooms that are waiting for players
        .order('created_at', { ascending: false }); // Order by creation time, newest first

      if (error) throw error;
      
      // Convert database types to app types with proper type casting
      const typedRooms: BattleRoom[] = (data || []).map((room: any) => ({
        ...room,
        battle_type: room.battle_type as '1v1' | '2v2' | 'ffa',
        status: room.status as 'waiting' | 'in_progress' | 'completed',
        current_players: room.battle_participants?.length || 0,
        current_question: room.current_question || 0,
        time_per_question: room.time_per_question || 15,
        total_questions: room.total_questions || 10,
        questions: Array.isArray(room.questions) ? room.questions : null,
        subject: room.subject || 'Biology', // Default subject if not specified
        countdown_initiated_at: room.countdown_initiated_at || null // Map the new field
      }));
      
      setRooms(typedRooms);
    } catch (error: any) {
      console.error('Error loading rooms:', error);
      toast({
        title: "Error Loading Rooms",
        description: "Failed to load battle rooms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Set loading to false once data is fetched or error occurs
    }
  };

  // Function to create a new battle room
  const createRoom = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a battle room.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSubjectId || !selectedChapterId) {
      toast({
        title: "Topic Required",
        description: "Please select a subject and chapter before creating a room.",
        variant: "destructive",
      });
      return;
    }

    // Validate number of questions and time per question
    if (numQuestions < 5 || numQuestions > 20) {
      toast({
        title: "Invalid Questions",
        description: "Number of questions must be between 5 and 20.",
        variant: "destructive",
      });
      return;
    }
    if (timePerQuestion < 10 || timePerQuestion > 60) {
      toast({
        title: "Invalid Time",
        description: "Time per question must be between 10 and 60 seconds.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true); // Set creating state to true
      
      // Determine max players based on battle type
      const maxPlayers = battleType === '1v1' ? 2 : battleType === '2v2' ? 4 : 4;
      // Generate a random 6-character uppercase room code
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data, error } = await supabase
        .from('battle_rooms')
        .insert([{
          room_code: roomCode,
          battle_type: battleType,
          max_players: maxPlayers,
          current_players: 0,
          status: 'waiting',
          host_id: user.id,
          time_per_question: timePerQuestion, // Use selected time
          total_questions: numQuestions, // Use selected number of questions
          subject: selectedSubjectName,
          subject_id: selectedSubjectId,
          chapter_id: selectedChapterId
        }])
        .select()
        .single(); // Expect a single record back

      if (error) throw error;

      toast({
        title: "Room Created!",
        description: `Room code: ${roomCode}. Topic: ${selectedSubjectName} - ${selectedChapterName}`,
      });

      onJoinBattle(data.id); // Automatically join the created battle room
    } catch (error: any) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create battle room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false); // Set creating state to false
    }
  };

  // Function to join a room using a provided room code
  const joinRoomByCode = async () => {
    if (!roomCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a room code.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('battle_rooms')
        .select(`
          *,
          battle_participants(id, user_id)
        `)
        .eq('room_code', roomCode.toUpperCase().trim()) // Case-insensitive and trim whitespace
        .eq('status', 'waiting') // Can only join rooms that are waiting
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Room Not Found",
          description: "No active room found with this code.",
          variant: "destructive",
        });
        return;
      }

      // Check if the room is full
      if ((data.battle_participants?.length || 0) >= data.max_players) {
        toast({
          title: "Room Full",
          description: "This battle room is already full.",
          variant: "destructive",
        });
        return;
      }

      onJoinBattle(data.id); // Join the found battle room
      setRoomCode(''); // Clear the input field after joining
    } catch (error: any) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please check the code and try again.",
        variant: "destructive",
      });
    }
  };

  // Handlers for subject and chapter selection from the SubjectChapterSelector component
  const handleSubjectChange = (subjectId: string, subjectName: string) => {
    setSelectedSubjectId(subjectId);
    setSelectedSubjectName(subjectName);
    setSelectedChapterId(null); // Reset chapter when subject changes
    setSelectedChapterName(null);
  };

  const handleChapterChange = (chapterId: string, chapterName: string) => {
    setSelectedChapterId(chapterId);
    setSelectedChapterName(chapterName);
  };

  // Helper function to get battle type specific colors
  const getBattleTypeColor = (type: string) => {
    switch (type) {
      case '1v1': return 'bg-blue-500 hover:bg-blue-600';
      case '2v2': return 'bg-green-500 hover:bg-green-600';
      case 'ffa': return 'bg-purple-500 hover:bg-purple-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  // Helper function to get battle type specific icons
  const getBattleTypeIcon = (type: string) => {
    switch (type) {
      case '1v1': return <Swords className="w-4 h-4" />;
      case '2v2': return <Users className="w-4 h-4" />;
      case 'ffa': return <Trophy className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  // Helper function to get battle type specific labels
  const getBattleTypeLabel = (type: string) => {
    switch (type) {
      case '1v1': return '1v1 Duel';
      case '2v2': return '2v2 Team';
      case 'ffa': return 'Free For All';
      default: return type.toUpperCase();
    }
  };

  // Loading state UI
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 min-h-screen-minus-header-footer"> {/* Added min-h for better centering */}
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        <span className="ml-2 text-gray-700 dark:text-gray-300">Loading battle rooms...</span>
      </div>
    );
  }

  return (
    // Main container with responsive padding and max-width for better readability on large screens
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl space-y-6">
      {/* Subject/Chapter Selection */}
      <SubjectChapterSelector
        selectedSubjectId={selectedSubjectId}
        selectedChapterId={selectedChapterId}
        onSubjectChange={handleSubjectChange}
        onChapterChange={handleChapterChange}
      />

      {/* Create Room Section */}
      <Card className="border-red-200 dark:border-red-800 rounded-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center text-xl font-semibold">
            <Swords className="w-6 h-6 mr-2 text-red-600" />
            Create New Battle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="w-full sm:w-auto flex-grow"> {/* flex-grow to take available space */}
              <label htmlFor="battle-type-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Battle Type
              </label>
              <Select value={battleType} onValueChange={(value: '1v1' | '2v2' | 'ffa') => setBattleType(value)}>
                <SelectTrigger id="battle-type-select" className="w-full sm:w-40 rounded-md">
                  <SelectValue placeholder="Select battle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1v1">1v1 Duel</SelectItem>
                  <SelectItem value="2v2">2v2 Team</SelectItem>
                  <SelectItem value="ffa">Free For All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Number of Questions Input */}
            <div className="w-full sm:w-auto flex-grow">
              <label htmlFor="num-questions-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Questions
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="num-questions-input"
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(5, Math.min(20, parseInt(e.target.value) || 0)))} // Clamp between 5 and 20
                  placeholder="e.g., 10"
                  min={5}
                  max={20}
                  className="w-full pl-9 rounded-md"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min: 5, Max: 20</p>
            </div>
            {/* Time Per Question Input */}
            <div className="w-full sm:w-auto flex-grow">
              <label htmlFor="time-per-question-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Per Question (seconds)
              </label>
              <div className="relative">
                <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="time-per-question-input"
                  type="number"
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Math.max(10, Math.min(60, parseInt(e.target.value) || 0)))} // Clamp between 10 and 60
                  placeholder="e.g., 15"
                  min={10}
                  max={60}
                  className="w-full pl-9 rounded-md"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Min: 10s, Max: 60s</p>
            </div>
            <div className="w-full sm:w-auto">
              <Button 
                onClick={createRoom} 
                disabled={isCreating || !selectedSubjectId || !selectedChapterId}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out mt-4 sm:mt-6"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Battle Room
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Join by Code Section */}
      <Card className="border-red-200 dark:border-red-800 rounded-lg shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center text-xl font-semibold">
            <Users className="w-6 h-6 mr-2 text-red-600" />
            Join by Room Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3"> {/* Adjusted spacing */}
            <Input
              placeholder="Enter room code (e.g., ABC123)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="flex-1 uppercase rounded-md p-2 border border-gray-300 dark:border-gray-600 focus:ring-red-500 focus:border-red-500"
              maxLength={6}
            />
            <Button 
              onClick={joinRoomByCode} 
              disabled={!roomCode.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
            >
              Join Room
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Rooms */}
      <Card className="border-red-200 dark:border-red-800 rounded-lg shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2"> {/* flex-wrap for small screens */}
          <CardTitle className="text-gray-900 dark:text-white flex items-center text-xl font-semibold">
            <Trophy className="w-6 h-6 mr-2 text-red-600" />
            Available Battle Rooms
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadRooms}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Swords className="w-16 h-16 mx-auto mb-4 opacity-30 text-red-300" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Battles</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                No battle rooms are currently available. Create one or check back later!
              </p>
            </div>
          ) : (
            <div className="space-y-4"> {/* Increased space-y for better separation on mobile */}
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-3 sm:mb-0">
                    <Badge className={`${getBattleTypeColor(room.battle_type)} text-white border-0 text-sm py-1 px-3 rounded-full flex items-center`}>
                      {getBattleTypeIcon(room.battle_type)}
                      <span className="ml-1">{getBattleTypeLabel(room.battle_type)}</span>
                    </Badge>
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900 dark:text-white text-base">
                        Room: <span className="font-mono text-red-600">{room.room_code}</span>
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          {room.current_players}/{room.max_players} players
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {room.time_per_question}s per question
                        </span>
                        {room.subject && (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            {room.subject}
                          </span>
                        )}
                        {room.countdown_initiated_at && room.status === 'waiting' && (
                            <span className="text-orange-600 dark:text-orange-400 font-semibold">
                                Starting soon...
                            </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => onJoinBattle(room.id)}
                    disabled={room.current_players >= room.max_players}
                    variant={room.current_players >= room.max_players ? "secondary" : "default"}
                    className={room.current_players >= room.max_players 
                      ? "cursor-not-allowed w-full sm:w-auto py-2 px-4 rounded-md" 
                      : "bg-red-600 hover:bg-red-700 text-white font-bold w-full sm:w-auto py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
                    }
                  >
                    {room.current_players >= room.max_players ? 'Full' : 'Join Battle'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
