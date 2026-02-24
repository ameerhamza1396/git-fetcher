import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search } from 'lucide-react';

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

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
}

interface AddMemberModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClassroom: Classroom;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchResults: UserProfile[];
  isSearchingUsers: boolean;
  isAddingUser: boolean;
  handleSearchUsers: () => Promise<void>;
  handleAddMember: (userId: string, userName: string) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onOpenChange,
  selectedClassroom,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearchingUsers,
  isAddingUser,
  handleSearchUsers,
  handleAddMember,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle>Add Member to {selectedClassroom?.name}</DialogTitle>
          <DialogDescription>
            Search for users by name or email and add them to this classroom.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers()}
              disabled={isSearchingUsers || isAddingUser}
            />
            <Button onClick={handleSearchUsers} disabled={isSearchingUsers || isAddingUser}>
              {isSearchingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <ScrollArea className="h-48 border rounded-md p-2">
            {searchResults.length === 0 && searchQuery.length > 0 && !isSearchingUsers ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No users found.</p>
            ) : (
              searchResults.map(profile => (
                <div key={profile.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md">
                  <div className="flex items-center space-x-2">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name || 'User'} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: getUserColor(profile.id) }}
                      >
                        {profile.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{profile.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddMember(profile.id, profile.full_name)}
                    disabled={isAddingUser}
                  >
                    {isAddingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};