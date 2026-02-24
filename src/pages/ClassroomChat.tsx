import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Using react-router-dom based on your model
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Users, Lock, Unlock, MessageSquare, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner'; // Assuming you have a toast notification library like sonner
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown

// Main Classroom component
const Classroom = () => {
  // State for controlling the 'Create Classroom' modal visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // State for the new classroom's name input
  const [newClassName, setNewClassName] = useState('');
  // State for the new classroom's description input
  const [newClassDescription, setNewClassDescription] = useState('');
  // State for the 'is_public' toggle in the creation modal
  const [isPublic, setIsPublic] = useState(true);
  // State to store and display the generated invite link for private classrooms
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  // Hooks for theme management, authentication, navigation, and query client
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Data Fetching with React Query ---

  // Fetches the user's profile data to display their plan
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id], // Unique key for this query
    queryFn: async () => {
      if (!user?.id) return null; // If no user, no profile to fetch
      const { data, error } = await supabase
        .from('profiles')
        .select('plan') // Only fetching the 'plan' column for efficiency
        .eq('id', user.id)
        .maybeSingle(); // Expecting zero or one row

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id // Only run this query if a user ID is available
  });

  // Fetches classrooms the current user is a member of (or hosts)
  const { data: userClassrooms, isLoading: isLoadingUserClassrooms, error: userClassroomsError } = useQuery({
    queryKey: ['userClassrooms', user?.id], // Key includes user ID to re-fetch if user changes
    queryFn: async () => {
      if (!user?.id) return []; // Return empty array if no user is logged in
      const { data, error } = await supabase
        .from('classroom_members')
        .select(`
          classroom_id,
          role,
          classrooms (id, name, description, is_public, invite_code) // Fetch related classroom details
        `)
        .eq('user_id', user.id); // Filter by the current user's ID

      if (error) {
        console.error('Error fetching user classrooms:', error);
        throw error; // Propagate error for React Query to handle
      }
      // Map the data to flatten the nested classroom object and add member_role
      return data.map(member => ({
        ...member.classrooms,
        member_role: member.role
      }));
    },
    enabled: !!user?.id // Only run if user is authenticated
  });

  // Fetches all public classrooms available for joining
  const { data: publicClassrooms, isLoading: isLoadingPublicClassrooms, error: publicClassroomsError } = useQuery({
    queryKey: ['publicClassrooms'], // Key for public classrooms (doesn't depend on user ID)
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*') // Select all columns for public classrooms
        .eq('is_public', true); // Filter to only get public ones

      if (error) {
        console.error('Error fetching public classrooms:', error);
        throw error;
      }
      return data;
    }
  });

  // --- Mutations with React Query ---

  // Mutation for creating a new classroom
  const createClassroomMutation = useMutation({
    mutationFn: async ({ name, description, is_public }: { name: string; description: string; is_public: boolean }) => {
      if (!user?.id) throw new Error('User not authenticated.');

      // Generate a simple invite code for private groups.
      // In a production app, this should be more robust (e.g., using UUIDs, or server-side generation).
      const invite_code = is_public ? null : Math.random().toString(36).substring(2, 8).toUpperCase();

      // Insert the new classroom into the 'classrooms' table
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .insert({
          name,
          description,
          is_public,
          host_id: user.id, // Set the current user as the host
          invite_code
        })
        .select() // Select the newly created row
        .single(); // Expecting a single result

      if (classroomError) throw classroomError;

      // Also add the creator as a member with the 'host' role in 'classroom_members'
      const { error: memberError } = await supabase
        .from('classroom_members')
        .insert({
          user_id: user.id,
          classroom_id: classroomData.id,
          role: 'host'
        });

      if (memberError) throw memberError;

      return classroomData; // Return the created classroom data
    },
    onSuccess: (data) => {
      // Invalidate queries to refetch the user's classrooms and public classrooms list
      queryClient.invalidateQueries({ queryKey: ['userClassrooms'] });
      queryClient.invalidateQueries({ queryKey: ['publicClassrooms'] });
      toast.success('Classroom created successfully!');
      // Close the creation modal and clear inputs
      setIsCreateModalOpen(false);
      setNewClassName('');
      setNewClassDescription('');
      setIsPublic(true);
      // If private, display the invite link
      if (!data.is_public && data.invite_code) {
        setGeneratedInviteLink(`${window.location.origin}/classroom/join/${data.invite_code}`);
      } else {
        // Navigate to the newly created classroom's chat page if it's public or invite link isn't needed
        navigate(`/classroom/${data.id}`);
      }
    },
    onError: (error) => {
      console.error('Error creating classroom:', error);
      toast.error(`Failed to create classroom: ${error.message}`);
    },
  });

  // Mutation for joining a public classroom
  const joinClassroomMutation = useMutation({
    mutationFn: async (classroom_id: string) => {
      if (!user?.id) throw new Error('User not authenticated.');

      // Insert a new membership entry for the current user and the specified classroom
      const { error } = await supabase
        .from('classroom_members')
        .insert({
          user_id: user.id,
          classroom_id: classroom_id,
          role: 'member' // Default role for joining
        });

      if (error) throw error;
      return true; // Indicate success
    },
    onSuccess: (data, classroom_id) => {
      queryClient.invalidateQueries({ queryKey: ['userClassrooms'] }); // Refetch user's joined classrooms
      toast.success('Joined classroom successfully!');
      navigate(`/classroom/${classroom_id}`); // Navigate to the joined classroom's chat page
    },
    onError: (error) => {
      console.error('Error joining classroom:', error);
      toast.error(`Failed to join classroom: ${error.message}`);
    },
  });

  // Handler for the 'Create Classroom' button click in the modal
  const handleCreateClassroom = () => {
    if (!newClassName.trim()) {
      toast.error('Classroom name cannot be empty.');
      return;
    }
    createClassroomMutation.mutate({ name: newClassName, description: newClassDescription, is_public: isPublic });
  };

  // --- UI Logic for Plan Badge (copied from your AI page) ---
  const planColors = {
    'free': {
      light: 'bg-purple-100 text-purple-800 border-purple-300',
      dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
    },
    'premium': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
    },
    'iconic': {
      light: 'bg-green-100 text-green-800 border-green-300',
      dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
    },
    'default': { // Fallback for unknown plans
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';
  const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900 font-inter"> {/* Added font-inter class */}
      {/* Header Section */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          {/* Back button */}
          <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Logo and Page Title */}
          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain rounded-md" /> {/* Rounded corners for image */}
            <span className="text-xl font-bold text-gray-900 dark:text-white">Classroom</span>
          </div>

          {/* Theme Toggle, Plan Badge, and User Initials */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200 rounded-full" // Rounded button
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Badge
              variant="secondary"
              className={`hidden sm:flex ${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
            >
              {userPlanDisplayName}
            </Badge>
                {/* NEW: Replaced hardcoded avatar with ProfileDropdown */}
                <ProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            📚 Your Classrooms
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Create and join study groups to collaborate with peers.
          </p>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5" // Styled button
          >
            <Plus className="w-4 h-4 mr-2" /> Create New Classroom
          </Button>
        </div>

        {/* User's Classrooms Section */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">Your Groups</h2>
        {isLoadingUserClassrooms ? (
          <p className="text-gray-600 dark:text-gray-400">Loading your classrooms...</p>
        ) : userClassroomsError ? (
          <p className="text-red-500">Error loading your classrooms: {userClassroomsError.message}</p>
        ) : userClassrooms && userClassrooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {userClassrooms.map((classroom) => (
              <Card
                key={classroom.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 animate-fade-in" // Styled card
              >
                <CardHeader className="p-4 pb-2"> {/* Adjusted padding */}
                  <CardTitle className="text-gray-900 dark:text-white text-lg flex items-center gap-2">
                    {classroom.is_public ? <Unlock className="w-5 h-5 text-green-500" /> : <Lock className="w-5 h-5 text-red-500" />}
                    {classroom.name}
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 text-sm"> {/* Adjusted font size */}
                    {classroom.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex justify-between items-center"> {/* Adjusted padding */}
                  <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5"> {/* Smaller, rounded badge */}
                    {classroom.member_role === 'host' ? 'Host' : 'Member'}
                  </Badge>
                  <Link to={`/classroom/${classroom.id}`}>
                    <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm px-3 py-1.5"> {/* Styled button */}
                      Go to Chat <MessageSquare className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 p-4 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            You haven't joined or created any classrooms yet. Create one above or discover public groups!
          </p>
        )}

        {/* Public Classrooms to Join Section */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-8">Discover Public Groups</h2>
        {isLoadingPublicClassrooms ? (
          <p className="text-gray-600 dark:text-gray-400">Loading public classrooms...</p>
        ) : publicClassroomsError ? (
          <p className="text-red-500">Error loading public classrooms: {publicClassroomsError.message}</p>
        ) : publicClassrooms && publicClassrooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {publicClassrooms
              // Filter out classrooms the user has already joined
              .filter(pubClassroom => !userClassrooms?.some(uc => uc.id === pubClassroom.id))
              .map((classroom) => (
                <Card
                  key={classroom.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 animate-fade-in" // Styled card
                >
                  <CardHeader className="p-4 pb-2"> {/* Adjusted padding */}
                    <CardTitle className="text-gray-900 dark:text-white text-lg flex items-center gap-2">
                      <Unlock className="w-5 h-5 text-green-500" />
                      {classroom.name}
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 text-sm"> {/* Adjusted font size */}
                      {classroom.description || 'No description provided.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0"> {/* Adjusted padding */}
                    <Button
                      onClick={() => joinClassroomMutation.mutate(classroom.id)}
                      disabled={joinClassroomMutation.isPending}
                      className="w-full bg-green-600 hover:bg-green-700 text-white rounded-md text-sm px-3 py-1.5" // Styled button
                    >
                      {joinClassroomMutation.isPending ? 'Joining...' : 'Join Group'}
                      <Users className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 p-4 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            No public classrooms available to join. Be the first to create one!
          </p>
        )}

        {/* Create Classroom Modal */}
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[425px] dark:bg-gray-800 dark:text-white p-6 rounded-lg shadow-xl border border-gray-700"> {/* Styled dialog content */}
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white text-2xl font-bold">Create New Classroom</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
                Set up your new study group with a name, description, and privacy setting.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right text-gray-900 dark:text-white">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="col-span-3 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500" // Styled input
                  placeholder="e.g., Anatomy Study Group"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right text-gray-900 dark:text-white">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newClassDescription}
                  onChange={(e) => setNewClassDescription(e.target.value)}
                  className="col-span-3 dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md focus:ring-purple-500 focus:border-purple-500" // Styled textarea
                  placeholder="Describe your classroom's purpose..."
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="public" className="text-right text-gray-900 dark:text-white">
                  Public Group
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                    <Switch
                        id="public"
                        checked={isPublic}
                        onCheckedChange={setIsPublic}
                        className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-400"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        {isPublic ? 'Visible to everyone' : 'Private (invite only)'}
                    </span>
                </div>
              </div>
            </div>
            <DialogFooter className="flex justify-end gap-2"> {/* Adjusted footer alignment */}
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateClassroom}
                disabled={createClassroomMutation.isPending || !newClassName.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-all duration-200" // Styled button
              >
                {createClassroomMutation.isPending ? 'Creating...' : 'Create Classroom'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invite Link Display Modal (shown after private classroom is created) */}
        <Dialog open={!!generatedInviteLink} onOpenChange={() => setGeneratedInviteLink(null)}>
          <DialogContent className="sm:max-w-[425px] dark:bg-gray-800 dark:text-white p-6 rounded-lg shadow-xl border border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-white text-2xl font-bold">Private Classroom Created!</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-400 text-sm">
                Share this link to invite others to your private classroom.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-link" className="text-gray-900 dark:text-white">
                  Invite Link
                </Label>
                <Input
                  id="invite-link"
                  value={generatedInviteLink || ''}
                  readOnly
                  className="dark:bg-gray-700 dark:text-white dark:border-gray-600 rounded-md"
                />
                <Button
                  onClick={() => {
                    document.execCommand('copy'); // Use document.execCommand for clipboard in iframe environments
                    if (generatedInviteLink) { // Only attempt copy if link exists
                        const el = document.createElement('textarea');
                        el.value = generatedInviteLink;
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand('copy');
                        document.body.removeChild(el);
                        toast.info('Invite link copied to clipboard!');
                    }
                  }}
                  variant="outline"
                  className="mt-2 rounded-md border border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/30"
                >
                  Copy Link
                </Button>
              </div>
            </div>
            <DialogFooter className="flex justify-end">
              <Button onClick={() => setGeneratedInviteLink(null)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default Classroom;
