import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare } from 'lucide-react';
import { User } from '@supabase/supabase-js';

// Helper function to generate a consistent color based on user ID
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

// Type definitions (re-import or pass down)
interface ClassroomMessage {
  id: string;
  created_at: string;
  classroom_id: string;
  user_id: string;
  content: string;
  user_name?: string;
  avatar_url?: string | null;
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

interface ChatMessageListProps {
  messages: ClassroomMessage[];
  user: User | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  currentChatTheme: ChatTheme;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  user,
  messagesEndRef,
  currentChatTheme,
}) => {
  return (
    <ScrollArea
      className="flex-1 min-h-[90%] p-4 rounded-lg mb-4 relative overflow-hidden"
      style={{
        backgroundImage: currentChatTheme.imageUrl ? `url(${currentChatTheme.imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {currentChatTheme.imageUrl && (
        <div className={`absolute inset-0 ${currentChatTheme.overlayColor}`}></div>
      )}
      <div className="space-y-4 relative z-10">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.user_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className="flex items-start gap-2">
                {message.user_id !== user?.id && (
                  <div className="flex-shrink-0">
                    {message.avatar_url ? (
                      <img
                        src={message.avatar_url}
                        alt={message.user_name || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/${getUserColor(message.user_id).substring(1)}/ffffff?text=${message.user_name?.charAt(0).toUpperCase() || '?'}`; e.currentTarget.onerror = null; }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: getUserColor(message.user_id) }}
                      >
                        {message.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${
                    message.user_id === user?.id
                      ? `${currentChatTheme.myBubbleColor} ${currentChatTheme.myBubbleTextColor}`
                      : `${currentChatTheme.otherBubbleColor} ${currentChatTheme.otherBubbleTextColor}`
                  }`}
                >
                  <p className="font-semibold text-xs mb-1">
                    {message.user_name || 'Unknown User'}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.user_id === user?.id ? currentChatTheme.myBubbleTextColor : currentChatTheme.otherBubbleTextColor // Use themed text color for timestamp
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
                {message.user_id === user?.id && (
                  <div className="flex-shrink-0">
                    {message.avatar_url ? (
                      <img
                        src={message.avatar_url}
                        alt={message.user_name || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => { e.currentTarget.src = `https://placehold.co/32x32/${getUserColor(message.user_id).substring(1)}/ffffff?text=${message.user_name?.charAt(0).toUpperCase() || '?'}`; e.currentTarget.onerror = null; }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: getUserColor(message.user_id) }}
                      >
                        {message.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
};