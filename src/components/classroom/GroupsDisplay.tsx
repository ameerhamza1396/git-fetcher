import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
// import { Checkbox } from '@/components/ui/checkbox'; // Not used, can remove - Removed as per original comment
import { Plus, MessageSquare, Users, Copy, ClipboardCheck, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Import the new ManageInviteCodeModal
import { ManageInviteCodeModal } from './modals/ManageInviteCodeModal'; // Adjust path if needed

// Type definitions
interface Classroom {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  is_public: boolean;
  host_id: string;
  invite_code: string | null;
  host_name?: string;
}

type ClassroomView = 'list' | 'chat';

// Skeleton Card Component
const SkeletonCard: React.FC = () => (
  <Card className="bg-gradient-to-br from-gray-100/70 zvia-gray-50/50 to-gray-50/30 dark:from-gray-900/30 dark:via-gray-800/20 dark:to-gray-900/10 border-gray-200 dark:border-gray-800 backdrop-blur-sm animate-pulse">
    <CardHeader>
      <CardTitle className="h-6 bg-gray-300 rounded dark:bg-gray-700 w-3/4 mb-2"></CardTitle>
      <CardDescription className="h-4 bg-gray-200 rounded dark:bg-gray-600 w-full mb-1"></CardDescription>
      <CardDescription className="h-4 bg-gray-200 rounded dark:bg-gray-600 w-5/6"></CardDescription>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="h-3 bg-gray-200 rounded dark:bg-gray-600 w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded dark:bg-gray-600 w-1/3"></div>
      <div className="flex justify-between items-center mt-2">
        <div className="h-8 w-24 bg-gray-300 rounded dark:bg-gray-700"></div>
        <div className="h-8 w-28 bg-gray-300 rounded dark:bg-gray-700"></div>
      </div>
    </CardContent>
  </Card>
);

interface GroupsDisplayProps {
  myClassrooms: Classroom[];
  discoverClassrooms: Classroom[];
  user: User | null;
  fetchClassrooms: () => Promise<void>;
  setSelectedClassroom: React.Dispatch<React.SetStateAction<Classroom | null>>;
  setCurrentView: React.Dispatch<React.SetStateAction<ClassroomView>>;

  // Modal states and handlers for creating classrooms
  showCreateClassroomModal: boolean;
  setShowCreateClassroomModal: React.Dispatch<React.SetStateAction<boolean>>;
  newClassroomName: string;
  setNewClassroomName: React.Dispatch<React.SetStateAction<string>>;
  newClassroomDescription: string;
  setNewClassroomDescription: React.Dispatch<React.SetStateAction<string>>;
  newClassroomIsPublic: boolean;
  setNewClassroomIsPublic: React.Dispatch<React.SetStateAction<boolean>>;
  isCreatingClassroom: boolean;
  setIsCreatingClassroom: React.Dispatch<React.SetStateAction<boolean>>;
  isJoiningClassroom: boolean; // Keep for public join status
  setIsJoiningClassroom: React.Dispatch<React.SetStateAction<boolean>>; // Keep for public join status

  // **CHANGED:** Prop for the generated invite link (full URL)
  generatedInviteLink: string | null;
  setGeneratedInviteLink: React.Dispatch<React.SetStateAction<string | null>>;

  handleCreateClassroom: () => Promise<void>;
  handleJoinClassroom: (classroomId: string) => Promise<void>; // Only for public joins now
  handleCopyInviteLink: (link: string) => void; // Now copies full link
  toast: ReturnType<typeof useToast>['toast'];

  // New prop for app domain to generate links within the modal
  appDomain: string;
}

export const GroupsDisplay: React.FC<GroupsDisplayProps> = ({
  myClassrooms,
  discoverClassrooms,
  user,
  fetchClassrooms,
  setSelectedClassroom,
  setCurrentView,
  showCreateClassroomModal,
  setShowCreateClassroomModal,
  newClassroomName,
  setNewClassroomName,
  newClassroomDescription,
  setNewClassroomDescription,
  newClassroomIsPublic,
  setNewClassroomIsPublic,
  isCreatingClassroom,
  setIsCreatingClassroom,
  isJoiningClassroom,
  setIsJoiningClassroom,
  generatedInviteLink, // Updated prop name
  setGeneratedInviteLink, // Updated prop name
  handleCreateClassroom,
  handleJoinClassroom, // Only for public joins now
  handleCopyInviteLink, // Now copies full link
  toast,
  appDomain, // New prop
}) => {
  // State for the ManageInviteCodeModal
  const [showManageInviteCodeModal, setShowManageInviteCodeModal] = useState(false);
  const [classroomToManageInviteCode, setClassroomToManageInviteCode] = useState<Classroom | null>(null);

  // New loading states for classrooms
  const [isLoadingMyClassrooms, setIsLoadingMyClassrooms] = useState(true);
  const [isLoadingDiscoverClassrooms, setIsLoadingDiscoverClassrooms] = useState(true);

  // Effect to manage loading states
  useEffect(() => {
    const loadClassrooms = async () => {
      setIsLoadingMyClassrooms(true);
      setIsLoadingDiscoverClassrooms(true);
      try {
        await fetchClassrooms(); // Assuming this fetches both myClassrooms and discoverClassrooms
      } catch (error) {
        console.error("Failed to fetch classrooms:", error);
        toast({
          title: "Error",
          description: "Failed to load classrooms. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMyClassrooms(false);
        setIsLoadingDiscoverClassrooms(false);
      }
    };
    loadClassrooms();
  }, [fetchClassrooms, toast]);


  // Unified handler for generating/revoking invite link (passed to ManageInviteCodeModal)
  const handleGenerateRevokeInviteLink = async () => {
    if (!user || !classroomToManageInviteCode) return;

    // This logic should ideally be lifted to Classroom.tsx or an API utility
    // and passed down, but for demonstration, we'll put a placeholder.
    // In a real app, this would be an API call to your backend/Supabase
    // to update the classroom's invite_code.

    // Placeholder: Simulate API call
    console.log(`Simulating API call to ${classroomToManageInviteCode.invite_code ? 'revoke' : 'generate'} invite code for classroom: ${classroomToManageInviteCode.id}`);

    try {
      let newInviteCode = null;
      if (!classroomToManageInviteCode.invite_code) {
        // Generate a new code if one doesn't exist
        newInviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      }

      // --- Supabase Update (THIS PART SHOULD BE HANDLED IN CLASSROOM.TSX) ---
      // For demonstration purposes, this is a placeholder.
      // You would usually have this logic in Classroom.tsx and pass it down.
      // For GroupsDisplay, we'll just update local state for demonstration
      // For proper implementation, you need to lift this state up or use context.
      const { error } = await (window as any).supabase.from('classrooms')
        .update({ invite_code: newInviteCode })
        .eq('id', classroomToManageInviteCode.id);

      if (error) throw error;
      // --- END SUPABASE UPDATE PLACEHOLDER ---

      toast({
        title: "Success",
        description: newInviteCode ? "New invite link generated!" : "Invite link revoked!",
      });

      // Update local state to reflect the change immediately
      // IMPORTANT: In a real app, `fetchClassrooms()` would ideally refresh this.
      setClassroomToManageInviteCode(prev => prev ? { ...prev, invite_code: newInviteCode } : null);
      fetchClassrooms(); // Re-fetch to ensure all lists are up-to-date

    } catch (error: any) {
      console.error('Error managing invite link:', error.message);
      toast({
        title: "Error",
        description: `Failed to manage invite link: ${error.message}`,
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-8 pt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
      {/* Your Classrooms Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Classrooms</h2>
          <div className="flex space-x-2">
            <Button onClick={() => setShowCreateClassroomModal(true)} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Plus className="w-4 h-4 mr-2" /> Create
            </Button>
            {/* Removed 'Join Private' button as it's handled by URL now */}
          </div>
        </div>

        {isLoadingMyClassrooms ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => ( // Display 3 skeleton cards while loading
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : myClassrooms.length === 0 ? (
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm text-center py-8">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200 mb-2">No Classrooms Yet</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Create your first classroom or share an invite link to join one!
            </CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myClassrooms.map((classroom) => (
              <Card
                key={classroom.id}
                className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm hover:shadow-lg transition-shadow duration-200" // Removed cursor-pointer from Card as button inside will handle interaction
              >
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center justify-between">
                    {classroom.name}
                    <MessageSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {classroom.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Host: {classroom.host_name || 'Loading...'}</p>
                  <p>Type: {classroom.is_public ? 'Public' : 'Private'}</p>
                  <div className="flex items-center justify-between mt-2">
                    {/* View Chat Button */}
                    <Button
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1"
                      onClick={() => {
                        setSelectedClassroom(classroom);
                        setCurrentView('chat');
                      }}
                    >
                      View Chat
                    </Button>

                    {/* Manage Invite Link Button (Host Only, Private Classrooms) */}
                    {user?.id === classroom.host_id && !classroom.is_public && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-600 dark:text-purple-400 ml-2"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card onClick
                          setClassroomToManageInviteCode(classroom);
                          setShowManageInviteCodeModal(true);
                        }}
                      >
                        <Copy className="h-3 w-3 mr-1" /> Manage Link
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Discover Public Classrooms Section */}
      <div className="space-y-4 pt-8 border-t border-purple-200 dark:border-purple-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Discover Public Classrooms</h2>
        {isLoadingDiscoverClassrooms ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => ( // Display 3 skeleton cards while loading
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : discoverClassrooms.length === 0 ? (
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm text-center py-8">
            <CardTitle className="text-xl text-gray-800 dark:text-gray-200 mb-2">No Public Classrooms to Discover</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              All public classrooms are already in your list, or none exist.
            </CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {discoverClassrooms.map((classroom) => (
              <Card
                key={classroom.id}
                className="bg-gradient-to-br from-blue-100/70 via-blue-50/50 to-indigo-50/30 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-indigo-900/10 border-blue-200 dark:border-blue-800 backdrop-blur-sm hover:shadow-lg transition-shadow duration-200"
              >
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center justify-between">
                    {classroom.name}
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
                    {classroom.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
                  <p>Host: {classroom.host_name || 'Loading...'}</p>
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1"
                    onClick={() => handleJoinClassroom(classroom.id)}
                    disabled={isJoiningClassroom}
                  >
                    {isJoiningClassroom ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    Join
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Classroom Modal */}
      <Dialog open={showCreateClassroomModal} onOpenChange={(open) => {
        setShowCreateClassroomModal(open);
        // Clear generated link when modal closes if it was just shown for creation
        if (!open) setGeneratedInviteLink(null);
      }}>
        <DialogContent className="sm:max-w-[425px] bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Create New Classroom</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Set up your new study group or discussion forum.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Classroom Name
              </Label>
              <Input
                id="name"
                value={newClassroomName}
                onChange={(e) => setNewClassroomName(e.target.value)}
                className="w-full bg-white/50 dark:bg-gray-800/50 border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500"
                disabled={isCreatingClassroom}
                placeholder="e.g., Biology Study Group"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={newClassroomDescription}
                onChange={(e) => setNewClassroomDescription(e.target.value)}
                className="w-full bg-white/50 dark:bg-gray-800/50 border-purple-300 dark:border-purple-700 focus:ring-purple-500 focus:border-purple-500 resize-y min-h-[80px]"
                placeholder="A brief overview of your classroom's purpose."
                disabled={isCreatingClassroom}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <Label htmlFor="is_public" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Public Classroom
              </Label>
              <Switch
                id="is_public"
                checked={newClassroomIsPublic}
                onCheckedChange={(checked) => setNewClassroomIsPublic(!!checked)}
                disabled={isCreatingClassroom}
                className="data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-gray-200 dark:data-[state=checked]:bg-purple-700 dark:data-[state=unchecked]:bg-gray-700"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">
              {newClassroomIsPublic ? 'Anyone can join without an invite code.' : 'An invite code will be generated for private access.'}
            </p>
          </div>
          {/* Display generated invite link (full URL) */}
          {generatedInviteLink && !newClassroomIsPublic && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-900/10 border border-green-200 dark:border-green-700 p-3 rounded-md text-sm text-green-800 dark:text-green-300 flex items-center justify-between mt-4">
              <span className="break-all">Invite Link: <span className="font-bold font-mono">{generatedInviteLink}</span></span>
              <Button variant="ghost" size="sm" onClick={() => handleCopyInviteLink(generatedInviteLink)} className="ml-2 h-7 w-7 p-0 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-800/50">
                <ClipboardCheck className="h-4 w-4" />
              </Button>
            </div>
          )}
          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCreateClassroomModal(false); setGeneratedInviteLink(null); }} disabled={isCreatingClassroom} className="border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-300">
              Cancel
            </Button>
            <Button onClick={handleCreateClassroom} disabled={isCreatingClassroom || !newClassroomName.trim()} className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white">
              {isCreatingClassroom ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Classroom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Removed the old Join Classroom Modal (for private invite codes) as it's now handled by URL */}
      {/* The `Join Private` button has also been removed from the header */}

      {/* Manage Invite Code Modal */}
      {classroomToManageInviteCode && (
        <ManageInviteCodeModal
          isOpen={showManageInviteCodeModal}
          onOpenChange={(open) => {
            setShowManageInviteCodeModal(open);
            if (!open) setClassroomToManageInviteCode(null); // Clear selected classroom when modal closes
          }}
          selectedClassroom={classroomToManageInviteCode}
          isHost={user?.id === classroomToManageInviteCode.host_id}
          handleGenerateRevokeInviteLink={handleGenerateRevokeInviteLink} // This needs to be correctly implemented or passed down
          appDomain={appDomain} // Pass the appDomain
          handleCopyInviteLink={handleCopyInviteLink} // Pass the handler from Classroom.tsx
        />
      )}
    </div>
  );
};