import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, UserX } from 'lucide-react';
import { User } from '@supabase/supabase-js';

// Helper function (re-import or pass down)
const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Type definitions
interface ClassroomMember {
  id: string;
  user_id: string;
  role: string;
  user_name?: string;
  avatar_url?: string | null;
}

interface ManageRolesModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  members: ClassroomMember[];
  user: User | null;
  isHost: boolean;
  handleMakeHost: (memberId: string, memberName: string) => Promise<void>;
  handleKickMember: (memberId: string, memberName: string) => Promise<void>;
}

export const ManageRolesModal: React.FC<ManageRolesModalProps> = ({
  isOpen,
  onOpenChange,
  members,
  user,
  isHost,
  handleMakeHost,
  handleKickMember,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle>Manage Member Roles</DialogTitle>
          <DialogDescription>
            (Host Only) Change roles or kick members.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 border rounded-md p-2">
          {!isHost ? (
            <p className="col-span-full text-center text-red-500">Only the host can manage roles.</p>
          ) : members.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No members to manage.</p>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                <div className="flex items-center space-x-2">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.user_name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: getUserColor(member.user_id) }}
                    >
                      {member.user_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{member.user_name || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Role: {member.role}</p>
                  </div>
                </div>
                {member.user_id !== user?.id && ( // Cannot manage self
                  <div className="flex space-x-2">
                    {member.role !== 'host' && ( // Only show "Make Host" if not already host
                      <Button size="sm" variant="outline" onClick={() => handleMakeHost(member.user_id, member.user_name || 'this member')}>
                        <Crown className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" onClick={() => handleKickMember(member.user_id, member.user_name || 'this member')}>
                      <UserX className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};