import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Users, MoreVertical, LogOut, Crown, UserX, RotateCcw, Palette } from 'lucide-react';
import { User } from '@supabase/supabase-js';

// Type definitions (re-import or pass down from MessageScreen)
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

interface ChatHeaderProps {
  selectedClassroom: Classroom;
  user: User | null;
  membersCount: number;
  setCurrentView: React.Dispatch<React.SetStateAction<'list' | 'chat'>>;
  handleLeaveGroup: () => Promise<void>;
  setShowMembersListModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowChatThemeModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowManageRolesModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowManageInviteCodeModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedClassroom,
  user,
  membersCount,
  setCurrentView,
  handleLeaveGroup,
  setShowMembersListModal,
  setShowChatThemeModal,
  setShowManageRolesModal,
  setShowManageInviteCodeModal,
}) => {
  const isHost = user?.id === selectedClassroom.host_id;

  return (
    <div className="flex justify-between items-center px-4 py-2 border-b border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 absolute top-0 left-0 right-0 z-[999] flex-shrink-0">
      <Button
        variant="outline"
        onClick={() => setCurrentView('list')}
        className="flex items-center space-x-2 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Classrooms</span>
      </Button>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedClassroom?.name}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center">
          <Users className="w-3 h-3 mr-1" /> {membersCount} Members
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
          <DropdownMenuItem onClick={() => setShowMembersListModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <Users className="mr-2 h-4 w-4" /> View Members
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowChatThemeModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
            <Palette className="mr-2 h-4 w-4" /> Chat Theme
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLeaveGroup} className="cursor-pointer text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut className="mr-2 h-4 w-4" /> Leave Group
          </DropdownMenuItem>
          {isHost && (
            <>
              <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-700" />
              <DropdownMenuItem onClick={() => setShowManageRolesModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                <Crown className="mr-2 h-4 w-4" /> Manage Roles
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowManageInviteCodeModal(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700">
                <RotateCcw className="mr-2 h-4 w-4" /> Manage Invite Code
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};