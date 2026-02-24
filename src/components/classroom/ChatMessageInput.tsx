import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, Plus } from 'lucide-react';
import { useVideoCall } from '@/video-sdk/VideoCallProvider';

// Import your useAuth hook
import { useAuth } from '@/hooks/useAuth'; // Adjust this path based on where you put useAuth.ts

interface ChatMessageInputProps {
  newMessageContent: string;
  setNewMessageContent: React.Dispatch<React.SetStateAction<string>>;
  handleSendMessage: (e: React.FormEvent) => Promise<void>;
  isSendingMessage: boolean;
  selectedClassroom: { id: string; name: string; host_id: string };
}

export const ChatMessageInput: React.FC<ChatMessageInputProps> = ({
  newMessageContent,
  setNewMessageContent,
  handleSendMessage,
  isSendingMessage,
  selectedClassroom,
}) => {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const { isMeetingJoined, joinMeeting } = useVideoCall();
  const { user, loading: authLoading } = useAuth(); // <--- Use the useAuth hook

  const handleStartLecture = () => {
    console.log("Selected Classroom: ", selectedClassroom);

    // Ensure the user is logged in, not loading auth, and we have a selected classroom ID
    if (!isMeetingJoined && !authLoading && user && selectedClassroom && selectedClassroom.id)
 {
      // Use the actual user ID from Supabase
      const currentUserId = user.id; // Supabase user object has an 'id' property
      const roomId = selectedClassroom.id;

      joinMeeting(roomId, currentUserId);
      console.log(`Attempting to start lecture in classroom: ${selectedClassroom.name} with user ID: ${currentUserId}`);
      setIsSubmenuOpen(false); // Close submenu after starting lecture
    } else {
      console.log("Cannot start lecture: Condition not met.", {
        isMeetingJoined,
        authLoading,
        userExists: !!user,
        selectedClassroomExists: !!selectedClassroom,
      });
    }
  };

  // Disable the plus button and start lecture button if auth is still loading
  const isLectureButtonDisabled = isMeetingJoined || isSendingMessage || authLoading || !user;

  return (
    <form
      onSubmit={handleSendMessage}
      className="flex space-x-2 p-4 border-t border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 rounded-lg absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[85%] z-[999] relative"
    >
      {/* Plus Icon Button */}
      <Button
        type="button"
        onClick={() => setIsSubmenuOpen(!isSubmenuOpen)}
        variant="ghost"
        size="icon"
        className="text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900"
        disabled={isLectureButtonDisabled} // Use the consolidated disabled state
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Submenu for Lecture */}
      {isSubmenuOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg shadow-lg z-50">
          <Button
            type="button"
            onClick={handleStartLecture}
            className="w-full text-left justify-start px-4 py-2 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg text-purple-700 dark:text-purple-300"
            variant="ghost"
            disabled={isLectureButtonDisabled} // Use the consolidated disabled state
          >
            Start Lecture
          </Button>
        </div>
      )}

      <Input
        value={newMessageContent}
        onChange={(e) => setNewMessageContent(e.target.value)}
        placeholder="Type your message..."
        className="flex-1"
        disabled={isSendingMessage}
      />
      <Button type="submit" disabled={isSendingMessage || !newMessageContent.trim()} className="bg-purple-600 hover:bg-purple-700">
        {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
};