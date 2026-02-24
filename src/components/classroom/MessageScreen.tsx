import React, { useRef, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Import newly created components
import { ChatHeader } from '@/components/classroom/ChatHeader';
import { ChatMessageList } from '@/components/classroom/ChatMessageList';
import { ChatMessageInput } from '@/components/classroom/ChatMessageInput';
import { AddMemberModal } from '@/components/classroom/modals/AddMemberModal';
import { ViewMembersModal } from '@/components/classroom/modals/ViewMembersModal';
import { ChatThemeModal } from '@/components/classroom/modals/ChatThemeModal';
import { ManageRolesModal } from '@/components/classroom/modals/ManageRolesModal';
import { ManageInviteCodeModal } from '@/components/classroom/modals/ManageInviteCodeModal';


// Define Chat Themes (kept here as it's static data used across components)
const chatThemes = [
  { id: 'default', name: 'Default', imageUrl: '', otherBubbleColor: 'bg-gray-200 dark:bg-gray-700', myBubbleColor: 'bg-purple-600', myBubbleTextColor: 'text-white', otherBubbleTextColor: 'text-gray-900 dark:text-gray-100', overlayColor: 'bg-transparent' },
  { id: 'medical', name: 'Medical', imageUrl: '/images/chat_themes/medical.jpg', otherBubbleColor: 'bg-green-800 dark:bg-green-800', myBubbleColor: 'bg-gray-400 dark:bg-gray-600', myBubbleTextColor: 'text-white', otherBubbleTextColor: 'text-white', overlayColor: 'bg-black/60' },
  { id: 'sunflowers', name: 'Sunflowers', imageUrl: '/images/chat_themes/sunflowers.jpg', otherBubbleColor: 'bg-yellow-400 dark:bg-yellow-600', myBubbleColor: 'bg-green-300 dark:bg-green-500', myBubbleTextColor: 'text-gray-900', otherBubbleTextColor: 'text-gray-900', overlayColor: 'bg-black/40' },
  { id: 'girlies', name: 'Girlies', imageUrl: '/images/chat_themes/girlies.jpg', otherBubbleColor: 'bg-pink-700 dark:bg-pink-700', myBubbleColor: 'bg-white dark:bg-gray-100', myBubbleTextColor: 'text-black', otherBubbleTextColor: 'text-white', overlayColor: 'bg-black/50' },
  { id: 'art_colors', name: 'Art Colors', imageUrl: '/images/chat_themes/art_colors.jpg', otherBubbleColor: 'bg-purple-800 dark:bg-purple-800', myBubbleColor: 'bg-purple-600', myBubbleTextColor: 'text-white', otherBubbleTextColor: 'text-white', overlayColor: 'bg-black/60' },
  { id: 'king', name: 'King', imageUrl: '/images/chat_themes/king.jpg', otherBubbleColor: 'bg-yellow-700 dark:bg-yellow-700', myBubbleColor: 'bg-purple-600', myBubbleTextColor: 'text-white', otherBubbleTextColor: 'text-white', overlayColor: 'bg-black/60' },
  { id: 'black', name: 'Black', imageUrl: '/images/chat_themes/black.jpg', otherBubbleColor: 'bg-blue-800 dark:bg-blue-800', myBubbleColor: 'bg-purple-600', myBubbleTextColor: 'text-white', otherBubbleTextColor: 'text-white', overlayColor: 'bg-white/60' },
  { id: 'cats', name: 'Cats', imageUrl: '/images/chat_themes/cats.jpg', otherBubbleColor: 'bg-yellow-700 dark:bg-yellow-700', myBubbleColor: 'bg-purple-600', myBubbleTextColor: 'text-white', otherBubbleTextColor: 'text-white', overlayColor: 'bg-black/50' },
  { id: 'nature', name: 'Nature', imageUrl: '/images/chat_themes/nature.jpg', otherBubbleColor: 'bg-gradient-to-r from-blue-500 to-white dark:from-blue-700 dark:to-gray-200', myBubbleColor: 'bg-purple-600', myBubbleTextColor: 'text-white', otherBubbleTextColor: 'text-white', overlayColor: 'bg-black/40' },
];

// Type definitions (Centralized for MessageScreen)
interface Classroom {
  id: string;
  created_at: string;
  name: string;
  description: string | null;
  is_public: boolean;
  host_id: string;
  invite_code: string | null;
  host_name?: string;
  chat_theme_id?: string | null; // Keep this, as it's used to store in DB
}

interface ClassroomMember {
  id: string;
  created_at: string;
  user_id: string;
  classroom_id: string;
  role: string;
  user_name?: string;
  avatar_url?: string | null;
}

interface ClassroomMessage {
  id: string;
  created_at: string;
  classroom_id: string;
  user_id: string;
  content: string;
  user_name?: string;
  avatar_url?: string | null;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface ChatTheme { // Re-define interface for clarity, even if the array is imported
  id: string;
  name: string;
  imageUrl: string;
  otherBubbleColor: string;
  myBubbleColor: string;
  myBubbleTextColor: string;
  otherBubbleTextColor: string;
  overlayColor: string;
}

type ClassroomView = 'list' | 'chat';

interface MessageScreenProps {
  selectedClassroom: Classroom;
  user: User | null;
  messages: ClassroomMessage[];
  members: ClassroomMember[];
  newMessageContent: string;
  setNewMessageContent: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (e: React.FormEvent) => Promise<void>;
  isSendingMessage: boolean;
  setCurrentView: React.Dispatch<React.SetStateAction<ClassroomView>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  fetchMembers: (classroomId: string) => Promise<void>;
  fetchClassrooms?: () => Promise<void>;
}

export const MessageScreen: React.FC<MessageScreenProps> = ({
  selectedClassroom,
  user,
  messages,
  members,
  newMessageContent,
  setNewMessageContent,
  handleSendMessage,
  isSendingMessage,
  setCurrentView,
  messagesEndRef,
  fetchMembers,
  fetchClassrooms,
}) => {
  const { toast } = useToast();

  // Modal visibility states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMembersListModal, setShowMembersListModal] = useState(false);
  const [showChatThemeModal, setShowChatThemeModal] = useState(false);
  const [showManageInviteCodeModal, setShowManageInviteCodeModal] = useState(false);
  const [showManageRolesModal, setShowManageRolesModal] = useState(false);

  // New state to track if ANY modal is open
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);

  // Effect to update isAnyModalOpen whenever a modal's visibility changes
  useEffect(() => {
    setIsAnyModalOpen(
      showAddMemberModal ||
      showMembersListModal ||
      showChatThemeModal ||
      showManageInviteCodeModal ||
      showManageRolesModal
    );
  }, [
    showAddMemberModal,
    showMembersListModal,
    showChatThemeModal,
    showManageInviteCodeModal,
    showManageRolesModal,
  ]);

  // States for AddMemberModal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // States for ChatThemeModal
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [currentChatTheme, setCurrentChatTheme] = useState<ChatTheme | null>(chatThemes.length > 0 ? chatThemes[0] : null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, messagesEndRef]);

  // Fetch current chat theme for the classroom
  useEffect(() => {
    const fetchChatTheme = async () => {
      if (!chatThemes || chatThemes.length === 0) {
        console.warn("chatThemes array is empty. Cannot load chat theme.");
        setCurrentChatTheme(null);
        return;
      }

      if (!selectedClassroom) return;

      try {
        const { data, error } = await supabase
          .from('classroom_settings')
          .select('setting_value')
          .eq('classroom_id', selectedClassroom.id)
          .eq('setting_key', 'chat_theme_id')
          .maybeSingle();

        if (error) throw error;

        const themeId = data?.setting_value;
        const foundTheme = chatThemes.find(theme => theme.id === themeId);
        setCurrentChatTheme(foundTheme || chatThemes[0]);
      } catch (error: any) {
        console.error('Error fetching chat theme:', error.message);
        toast({
          title: "Error",
          description: `Failed to load chat theme: ${error.message}`,
          variant: "destructive",
        });
        setCurrentChatTheme(chatThemes[0]);
      }
    };
    fetchChatTheme();
  }, [selectedClassroom, toast]);

  const isHost = user?.id === selectedClassroom.host_id;

  // --- Handlers for modals and shared logic ---

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);

      if (error) throw error;

      const currentMemberIds = new Set(members.map(m => m.user_id));
      const filteredResults = data.filter(profile => !currentMemberIds.has(profile.id));

      setSearchResults(filteredResults);
    } catch (error: any) {
      console.error('Error searching users:', error.message);
      toast({
        title: "Error",
        description: `Failed to search users: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddMember = async (userId: string, userName: string) => {
    setIsAddingUser(true);
    try {
      const { error } = await supabase
        .from('classroom_members')
        .insert({
          classroom_id: selectedClassroom.id,
          user_id: userId,
          role: 'member',
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `${userName} added to the classroom.`,
      });
      setShowAddMemberModal(false);
      setSearchQuery('');
      setSearchResults([]);
      fetchMembers(selectedClassroom.id);
    } catch (error: any) {
      console.error('Error adding member:', error.message);
      toast({
        title: "Error",
        description: `Failed to add member: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !selectedClassroom) return;

    if (!window.confirm("Are you sure you want to leave this classroom?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classroom_members')
        .delete()
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Left Classroom",
        description: `You have left "${selectedClassroom.name}".`,
      });
      setCurrentView('list');
    } catch (error: any) {
      console.error('Error leaving classroom:', error.message);
      toast({
        title: "Error",
        description: `Failed to leave classroom: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleKickMember = async (memberId: string, memberName: string) => {
    if (!user || !selectedClassroom || !isHost || memberId === user.id) return;

    if (!window.confirm(`Are you sure you want to kick ${memberName} from this classroom?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classroom_members')
        .delete()
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', memberId);

      if (error) throw error;

      toast({
        title: "Member Kicked",
        description: `${memberName} has been removed from the classroom.`,
      });
      fetchMembers(selectedClassroom.id);
    } catch (error: any) {
      console.error('Error kicking member:', error.message);
      toast({
        title: "Error",
        description: `Failed to kick member: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleMakeHost = async (memberId: string, memberName: string) => {
    if (!user || !selectedClassroom || !isHost || memberId === user.id) return;

    if (!window.confirm(`Are you sure you want to make ${memberName} the new host of this classroom? You will become a regular member.`)) {
      return;
    }

    try {
      const { error: currentHostError } = await supabase
        .from('classroom_members')
        .update({ role: 'member' })
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', user.id);

      if (currentHostError) throw currentHostError;

      const { error: newHostMemberError } = await supabase
        .from('classroom_members')
        .update({ role: 'host' })
        .eq('classroom_id', selectedClassroom.id)
        .eq('user_id', memberId);

      if (newHostMemberError) throw newHostMemberError;

      const { error: classroomUpdateError } = await supabase
        .from('classrooms')
        .update({ host_id: memberId })
        .eq('id', selectedClassroom.id);

      if (classroomUpdateError) throw classroomUpdateError;

      toast({
        title: "Host Changed",
        description: `${memberName} is now the host of "${selectedClassroom.name}".`,
      });
      fetchMembers(selectedClassroom.id);
      if (fetchClassrooms) {
        fetchClassrooms();
      }
    } catch (error: any) {
      console.error('Error changing host:', error.message);
      toast({
        title: "Error",
        description: `Failed to change host: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleGenerateRevokeInviteCode = async () => {
    if (!selectedClassroom || !isHost) return;

    try {
      let newInviteCode = null;
      let toastMessage = '';

      if (selectedClassroom.invite_code) {
        const { error } = await supabase
          .from('classrooms')
          .update({ invite_code: null })
          .eq('id', selectedClassroom.id);
        if (error) throw error;
        toastMessage = 'Invite code revoked successfully.';
      } else {
        newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { error } = await supabase
          .from('classrooms')
          .update({ invite_code: newInviteCode })
          .eq('id', selectedClassroom.id);
        if (error) throw error;
        toastMessage = `New invite code generated: ${newInviteCode}.`;
      }

      toast({
        title: "Success",
        description: toastMessage,
      });
      if (fetchClassrooms) {
        fetchClassrooms();
      }
      setShowManageInviteCodeModal(false);
    } catch (error: any) {
      console.error('Error managing invite code:', error.message);
      toast({
        title: "Error",
        description: `Failed to manage invite code: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleSetChatTheme = async () => {
    if (!selectedClassroom || !isHost || !selectedThemeId) {
      toast({
        title: "Permission Denied",
        description: "Only the host can change chat themes, and a theme must be selected.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('classroom_settings')
        .upsert(
          {
            classroom_id: selectedClassroom.id,
            setting_key: 'chat_theme_id',
            setting_value: selectedThemeId,
          },
          { onConflict: 'classroom_id, setting_key' }
        );

      if (error) throw error;

      const newTheme = chatThemes.find(theme => theme.id === selectedThemeId);
      if (newTheme) {
        setCurrentChatTheme(newTheme);
        toast({
          title: "Chat Theme Updated",
          description: `Chat theme set to "${newTheme.name}".`,
        });
        if (fetchClassrooms) {
          fetchClassrooms();
        }
      } else {
        toast({
          title: "Error",
          description: "Selected theme not found.",
          variant: "destructive",
        });
      }
      setShowChatThemeModal(false);
      setSelectedThemeId(null);
    } catch (error: any) {
      console.error('Error changing chat theme:', error.message);
      toast({
        title: "Error",
        description: `Failed to change chat theme: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    // Apply background color from currentChatTheme defensively
    <div
      className="flex flex-col h-[calc(100vh-160px)]"
      style={{
        backgroundColor: currentChatTheme?.overlayColor || '#FFFFFF', // Fallback to white if theme not loaded
      }}
    >
      {/* Main content area that gets hidden/dimmed */}
      <div className={`${isAnyModalOpen ? 'opacity-0 pointer-events-none' : ''} transition-opacity duration-300 flex flex-col h-full`}>
        <ChatHeader
          selectedClassroom={selectedClassroom}
          user={user}
          membersCount={members.length}
          setCurrentView={setCurrentView}
          handleLeaveGroup={handleLeaveGroup}
          setShowMembersListModal={setShowMembersListModal}
          setShowChatThemeModal={setShowChatThemeModal}
          setShowManageRolesModal={setShowManageRolesModal}
          setShowManageInviteCodeModal={setShowManageInviteCodeModal}
        />

        {/* Conditionally render ChatMessageList only when currentChatTheme is loaded */}
        {currentChatTheme ? (
          <ChatMessageList
            messages={messages}
            user={user}
            messagesEndRef={messagesEndRef}
            currentChatTheme={currentChatTheme}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Loading messages and chat theme...
          </div>
        )}

        <ChatMessageInput
          newMessageContent={newMessageContent}
          setNewMessageContent={setNewMessageContent}
          handleSendMessage={handleSendMessage}
          isSendingMessage={isSendingMessage}
          selectedClassroom={selectedClassroom}
        />
      </div>

      {/* Modals are rendered directly within MessageScreen and will appear on top */}
      <AddMemberModal
        isOpen={showAddMemberModal}
        onOpenChange={setShowAddMemberModal}
        selectedClassroom={selectedClassroom}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearchingUsers={isSearchingUsers}
        isAddingUser={isAddingUser}
        handleSearchUsers={handleSearchUsers}
        handleAddMember={handleAddMember}
      />

      <ViewMembersModal
        isOpen={showMembersListModal}
        onOpenChange={setShowMembersListModal}
        selectedClassroom={selectedClassroom}
        members={members}
      />

      <ChatThemeModal
        isOpen={showChatThemeModal}
        onOpenChange={setShowChatThemeModal}
        isHost={isHost}
        chatThemes={chatThemes}
        selectedThemeId={selectedThemeId || currentChatTheme?.id || null}
        setSelectedThemeId={setSelectedThemeId}
        handleSetChatTheme={handleSetChatTheme}
      />

      <ManageRolesModal
        isOpen={showManageRolesModal}
        onOpenChange={setShowManageRolesModal}
        members={members}
        user={user}
        isHost={isHost}
        handleMakeHost={handleMakeHost}
        handleKickMember={handleKickMember}
      />

      <ManageInviteCodeModal
        isOpen={showManageInviteCodeModal}
        onOpenChange={setShowManageInviteCodeModal}
        selectedClassroom={selectedClassroom}
        isHost={isHost}
        handleGenerateRevokeInviteCode={handleGenerateRevokeInviteCode}
      />
    </div>
  );
};