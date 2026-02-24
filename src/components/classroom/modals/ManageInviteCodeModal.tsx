import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react'; // Added Copy icon

// Type definitions
interface Classroom {
  id: string;
  is_public: boolean;
  invite_code: string | null;
}

interface ManageInviteCodeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClassroom: Classroom;
  isHost: boolean;
  // Renamed prop: now generates/revokes a link
  handleGenerateRevokeInviteLink: () => Promise<void>;
  // New prop: the base domain for constructing the link
  appDomain: string;
  // Renamed prop: now copies the full invite link
  handleCopyInviteLink: (link: string) => void;
}

export const ManageInviteCodeModal: React.FC<ManageInviteCodeModalProps> = ({
  isOpen,
  onOpenChange,
  selectedClassroom,
  isHost,
  handleGenerateRevokeInviteLink, // Updated prop name
  appDomain, // New prop
  handleCopyInviteLink, // Updated prop name
}) => {
  // Construct the full invite link if an invite code exists
  const fullInviteLink = selectedClassroom?.invite_code
    ? `${appDomain}/classrooms?code=${selectedClassroom.invite_code}`
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle>Manage Invite Link</DialogTitle>
          <DialogDescription>
            (Host Only) Generate or revoke the invite link for this private classroom.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isHost ? (
            <p className="col-span-full text-center text-red-500">Only the host can manage invite links.</p>
          ) : selectedClassroom?.is_public ? (
            <p className="text-center text-gray-600 dark:text-gray-400">Public classrooms do not use invite links.</p>
          ) : (
            <>
              {fullInviteLink ? (
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                  {/* Display the full invite link */}
                  <span className="font-mono text-sm sm:text-base text-gray-900 dark:text-gray-100 break-all pr-2">
                    {fullInviteLink}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => handleCopyInviteLink(fullInviteLink)}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                </div>
              ) : (
                <p className="text-center text-gray-600 dark:text-gray-400">No invite link currently active.</p>
              )}
              <Button
                onClick={handleGenerateRevokeInviteLink} // Use the updated prop
                className={fullInviteLink ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {fullInviteLink ? 'Revoke Invite Link' : 'Generate New Invite Link'}
              </Button>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageInviteCodeModal;