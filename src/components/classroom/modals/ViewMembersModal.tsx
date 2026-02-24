import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
interface Classroom {
  id: string;
  name: string;
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

interface ViewMembersModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClassroom: Classroom;
  members: ClassroomMember[];
}

export const ViewMembersModal: React.FC<ViewMembersModalProps> = ({
  isOpen,
  onOpenChange,
  selectedClassroom,
  members,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle>Members of {selectedClassroom?.name}</DialogTitle>
          <DialogDescription>
            List of all members in this classroom.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64 border rounded-md p-2">
          {members.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No members yet.</p>
          ) : (
            members.map(member => (
              <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt={member.user_name || 'User'} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
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