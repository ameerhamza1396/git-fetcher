import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BattleLobby } from '@/components/battle/BattleLobby';
import { BattleRoom } from '@/components/battle/BattleRoom';
import { BattleGame } from '@/components/battle/BattleGame';
import { BattleResults } from '@/components/battle/BattleResults';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { useTheme } from 'next-themes';
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ElasticWrapper } from '@/components/ElasticWrapper'
import Seo from '@/components/Seo'; // Import the Seo component
import PlanBadge from '@/components/PlanBadge';



// Define the possible states for the battle flow
type BattleState = 'lobby' | 'room' | 'game' | 'results';

// Interface for the room data, ensuring type safety for fetched data
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
  // Hooks for authentication, theme, and toast notifications
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // State variables to manage the battle flow and data
  const [battleState, setBattleState] = useState<BattleState>('lobby');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [gameData, setGameData] = useState<RoomData | null>(null);
  const [battleResults, setBattleResults] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Fetch user profile on component mount
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      };
      fetchProfile();
    }
  }, [user]);

  /**
   * Handles the logic for a user joining a battle room.
   * Fetches user profile, checks room capacity, and inserts participant data.
   * @param roomId The ID of the room to join.
   */
  const handleJoinBattle = async (roomId: string) => {
    // Ensure user is logged in before allowing them to join
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to join a battle room.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch the user's username from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      // Determine username, falling back to email prefix or 'Anonymous'
      const username = profile?.username || user.email?.split('@')[0] || 'Anonymous';

      // Fetch room data and existing participants
      const { data: roomData, error: roomError } = await supabase
        .from('battle_rooms')
        .select('*, battle_participants(*)') // Select room and its participants
        .eq('id', roomId)
        .single();

      if (roomError) {
        throw new Error('Room not found');
      }

      // Check if the user is already a participant in this room
      const existingParticipant = roomData.battle_participants?.find(
        (p: any) => p.user_id === user.id
      );

      // If user is not already in the room, proceed to join
      if (!existingParticipant) {
        // Check if the room has reached its maximum player capacity
        if ((roomData.battle_participants?.length || 0) >= roomData.max_players) {
          toast({
            title: "Room Full",
            description: "This battle room is already full.",
            variant: "destructive",
          });
          return;
        }

        // Insert new participant into the battle_participants table
        const { error: joinError } = await supabase
          .from('battle_participants')
          .insert([{
            battle_room_id: roomId,
            user_id: user.id,
            username: username,
            score: 0,
            is_ready: false
          }]);

        if (joinError) {
          throw joinError;
        }

        // Update the current_players count and host_id in the battle_rooms table
        await supabase
          .from('battle_rooms')
          .update({
            current_players: (roomData.battle_participants?.length || 0) + 1,
            host_id: roomData.host_id || user.id // Set host if not already set
          })
          .eq('id', roomId);
      }

      // Set the current room ID and transition to the 'room' state
      setCurrentRoomId(roomId);
      setBattleState('room');

      toast({
        title: "Joined Battle Room!",
        description: `You've joined room ${roomData.room_code}`,
      });
    } catch (error: any) {
      console.error('Error joining battle:', error);
      toast({
        title: "Failed to Join",
        description: error.message || "Could not join the battle room",
        variant: "destructive",
      });
    }
  };

  /**
   * Handles the logic for a user leaving a battle room.
   * Resets room and game data and returns to the lobby.
   */
  const handleLeaveBattle = () => {
    setCurrentRoomId(null);
    setGameData(null);
    setBattleResults(null);
    setBattleState('lobby');
  };

  /**
   * Handles the transition to the game state when a battle starts.
   * @param roomData The data for the current battle room.
   */
  const handleBattleStart = (roomData: RoomData) => {
    console.log('Battle starting with data:', roomData);
    setGameData(roomData);
    setBattleState('game');
  };

  /**
   * Handles the transition to the results state when a game completes.
   * @param results The results data of the completed game.
   */
  const handleGameComplete = (results: any) => {
    setBattleResults(results);
    setBattleState('results');
  };

  /**
   * Handles returning to the lobby from the results screen.
   * Internally calls handleLeaveBattle to reset states.
   */
  const handleReturnToLobby = () => {
    handleLeaveBattle();
  };

  // Display a loading spinner while authentication status is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <span className="ml-3 text-lg text-gray-700 dark:text-gray-300">Loading...</span>
      </div>
    );
  }

  // Display an authentication required message if the user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20 p-4">
        <div className="text-center max-w-md w-full"> {/* Added w-full for better mobile width */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Authentication Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Please log in to access the Battle Arena and compete with other students.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className="w-full sm:w-auto"> {/* Added w-full for full width buttons on mobile */}
              <Button className="bg-red-600 hover:bg-red-700 text-white w-full"> {/* Added w-full */}
                Sign In
              </Button>
            </Link>
            <Link to="/signup" className="w-full sm:w-auto"> {/* Added w-full for full width buttons on mobile */}
              <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 w-full"> {/* Added w-full */}
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-yellow-900/20">
    <Seo
      title="Battle & Challenges"
      description="Engage in competitive MCQ battles with other students on Medmacs App. Test your knowledge and climb the leaderboard."
      canonical="https://medistics.app/battle"
    />
      {/* Header section with responsive padding and flexible layout */}
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left side of the header: Back and Dashboard links, and title */}
            <div className="flex items-center space-x-2 sm:space-x-4"> {/* Adjusted space-x for smaller screens */}
              {battleState !== 'lobby' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeaveBattle}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 sm:px-4" // Adjusted padding
                >
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> {/* Adjusted margin */}
                  <span className="hidden sm:inline">Back to Lobby</span> {/* Hide text on small screens */}
                  <span className="inline sm:hidden">Lobby</span> {/* Show shorter text on small screens */}
                </Button>
              )}
              <Link to="/dashboard" className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 sm:px-4" // Adjusted padding
                >
                  <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> {/* Adjusted margin */}
                  <span className="hidden sm:inline">Dashboard</span> {/* Hide text on small screens */}
                  <span className="inline sm:hidden"></span> {/* Show shorter text on small screens */}
                </Button>
              </Link>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate"> {/* Added truncate for long titles on small screens */}
                Battle Arena
              </h1>
            </div>

            {/* Right side of the header: Theme toggle and Profile dropdown */}
            <div className="flex items-center space-x-2 sm:space-x-4"> {/* Adjusted space-x for smaller screens */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-8 h-8 sm:w-9 sm:h-9 p-0 hover:scale-110 transition-transform duration-200" // Adjusted size for mobile
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <PlanBadge plan={profile?.plan} />
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </header>

      <ElasticWrapper>
    
      
      {/* Main content area, dynamically rendering components based on battleState */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Battle Lobby: Initial state where users can join or create rooms */}
        {battleState === 'lobby' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4 pt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
                Welcome to the Battle Arena!
              </h2>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Challenge other students in real-time MCQ battles. Test your knowledge and climb the leaderboard!
              </p>
            </div>
            <BattleLobby onJoinBattle={handleJoinBattle} />
          </div>
        )}

        {/* Battle Room: Displays room details and participants before the game starts */}
        {battleState === 'room' && currentRoomId && (
          <BattleRoom
            roomId={currentRoomId}
            userId={user.id}
            onLeave={handleLeaveBattle}
            onBattleStart={handleBattleStart}
            />
        )}

        {/* Battle Game: The actual game play area */}
        {battleState === 'game' && gameData && (
          <BattleGame
            roomData={gameData}
            userId={user.id}
            onGameComplete={handleGameComplete}
            />
          )}

        {/* Battle Results: Displays game results after completion */}
        {battleState === 'results' && battleResults && (
          <BattleResults
          results={battleResults}
          onReturnToLobby={handleReturnToLobby}
          />
        )}
      </main>
      </ElasticWrapper>
    </div>
  );
};

export default Battle;
