import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

// Type definitions
interface Classroom {
  id: string;
  host_id: string;
}

interface ChatTheme {
  id: string;
  name: string;
  imageUrl: string;
  otherBubbleColor: string;
  myBubbleColor: string;
  myBubbleTextColor: string;
  otherBubbleTextColor: string;
  overlayColor: string;
}

interface ChatThemeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isHost: boolean;
  chatThemes: ChatTheme[];
  selectedThemeId: string | null;
  setSelectedThemeId: React.Dispatch<React.SetStateAction<string | null>>;
  handleSetChatTheme: () => Promise<void>;
}

export const ChatThemeModal: React.FC<ChatThemeModalProps> = ({
  isOpen,
  onOpenChange,
  isHost,
  chatThemes,
  selectedThemeId,
  setSelectedThemeId,
  handleSetChatTheme,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900 border-purple-200 dark:border-purple-800">
        <DialogHeader>
          <DialogTitle>Select Chat Theme</DialogTitle>
          <DialogDescription>
            (Host Only) Choose a background image and chat bubble colors for this classroom.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 max-h-96 overflow-y-auto">
          {!isHost ? (
            <p className="col-span-full text-center text-red-500">Only the host can change chat themes.</p>
          ) : (
            chatThemes.map(theme => (
              <Card
                key={theme.id}
                className={`relative cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-200
                  ${selectedThemeId === theme.id ? 'border-4 border-purple-500 dark:border-purple-400' : 'border border-gray-200 dark:border-gray-700'}
                  hover:shadow-lg`}
                onClick={() => setSelectedThemeId(theme.id)}
              >
                <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
                  {theme.imageUrl ? (
                    <img
                      src={theme.imageUrl}
                      alt={theme.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-500 dark:text-gray-400 text-sm">No Image</div>
                  )}
                  {theme.imageUrl && <div className={`absolute inset-0 ${theme.overlayColor}`}></div>}
                </div>
                <CardContent className="p-2 text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{theme.name}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSetChatTheme} disabled={!selectedThemeId || !isHost}>
            Set Theme
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};