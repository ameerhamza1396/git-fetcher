// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, Send, Mic, MessageSquare, Menu, Copy, PlusCircle, Trash2, AlertTriangle, Crown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

interface SavedChat {
  id: string;
  created_at: string;
  messages: any;
  session_name?: string;
}

const API_BASE_URL = 'https://medmacs-ai-bot.vercel.app';

const DrSultanChat: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- 1. DATA FETCHING ---
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id
  });

  const { data: chatHistory } = useQuery({
    queryKey: ['chatHistory', user?.id],
    queryFn: async (): Promise<SavedChat[]> => {
      const { data, error } = await supabase
        .from('ai_chat_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const canUseChat = profile?.plan?.toLowerCase() === 'premium';

  // --- 2. MUTATIONS ---
  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
      if (deletedId === currentSessionId) startNewChat();
      setSessionToDelete(null);
    },
  });

  // --- 3. CORE LOGIC ---
  const syncChatToDb = async (updatedMessages: ChatMessage[], sessionId: string | null) => {
    if (!user?.id || updatedMessages.length === 0) return;

    const recordToSave = updatedMessages.slice(-50);
    const firstUserMsg = updatedMessages.find(m => m.sender === 'user')?.text || "New Chat";
    // Updated: Session name limit increased to 200 characters
    const sessionName = firstUserMsg.substring(0, 200);

    try {
      if (sessionId) {
        await supabase
          .from('ai_chat_sessions')
          .update({ messages: recordToSave, updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      } else {
        const { data, error } = await supabase
          .from('ai_chat_sessions')
          .insert([{
            user_id: user.id,
            messages: recordToSave,
            session_name: sessionName
          }])
          .select().single();

        if (error) throw error;
        if (data) setCurrentSessionId(data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
    } catch (err) {
      console.error("Sync Error:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputMessage.trim();
    if (!trimmedInput || apiLoading || !canUseChat) return;

    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { sender: 'user', text: trimmedInput, time: ts };

    const messagesWithUser = [...messages, userMsg];
    setMessages(messagesWithUser);
    setInputMessage('');
    setApiLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/study-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmedInput })
      });

      if (!res.ok) throw new Error("Server error");
      const payload = await res.json();

      const aiResponseText = typeof payload.answer === 'object'
        ? JSON.stringify(payload.answer, null, 2)
        : (payload.answer || 'I am sorry, I could not process that.');

      const aiMsg: ChatMessage = {
        sender: 'ai',
        text: aiResponseText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...messagesWithUser, aiMsg];
      setMessages(finalMessages);
      await syncChatToDb(finalMessages, currentSessionId);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "⚠️ Connection error. Please try again.",
        time: ts
      }]);
    } finally {
      setApiLoading(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setIsSidebarOpen(false);
  };

  const loadSession = (chat: SavedChat) => {
    setMessages(Array.isArray(chat.messages) ? chat.messages : []);
    setCurrentSessionId(chat.id);
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, apiLoading]);

  const handleMicClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported");
    const rec = new SpeechRecognition();
    rec.onstart = () => setRecording(true);
    rec.onresult = (evt: any) => setInputMessage(evt.results[0][0].transcript);
    rec.onend = () => setRecording(false);
    rec.start();
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background">
      <Seo title="Dr. Ahroid | AI Tutor" />

      {/* DELETE MODAL */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Session?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sessionToDelete && deleteSessionMutation.mutate(sessionToDelete)} className="bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SIDEBAR */}
      <aside className={`fixed lg:relative z-50 w-72 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b flex justify-between items-center bg-white dark:bg-gray-900">
          <span className="font-bold text-purple-600 text-sm">STUDY HISTORY</span>
          <Button variant="ghost" size="icon" onClick={startNewChat}><PlusCircle className="w-5 h-5" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatHistory?.map((chat) => (
            <div key={chat.id} className="group relative">
              <button onClick={() => loadSession(chat)} className={`w-full text-left p-3 rounded-xl text-sm border ${currentSessionId === chat.id ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200' : 'border-transparent hover:bg-gray-100'}`}>
                <div className="font-semibold truncate">{chat.session_name || "New Chat"}</div>
                <div className="text-[10px] opacity-60">{new Date(chat.created_at).toLocaleDateString()}</div>
              </button>
              <button onClick={(e) => { e.stopPropagation(); setSessionToDelete(chat.id); }} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2"><Trash2 className="w-4 h-4 text-gray-400" /></button>
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            Mode
          </Button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        {/* HEADER: Updated Profile Dropdown to Right */}
        <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex flex-col">
              <CardTitle className="text-base font-bold">Dr. Ahroid</CardTitle>
              <span className="text-[10px] text-green-500 font-bold uppercase">AI Medical Tutor</span>
            </div>
          </div>
          <div className="flex items-center">
            <ProfileDropdown />
          </div>
        </header>

        {/* MESSAGES: Properly scrollable container */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scroll-smooth">
          <div className="min-h-full flex flex-col justify-end">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <MessageSquare className="w-12 h-12 text-purple-600 mb-4 opacity-20" />
                <h2 className="text-xl font-bold">Start Your Consult</h2>
                <p className="text-sm text-muted-foreground">Ask about anatomy, pharmacology, or clinical cases.</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className={`max-w-[85%] p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-gray-800 rounded-tl-none border'}`}>
                    <p className="text-[15px] whitespace-pre-wrap">{msg.text}</p>
                    <div className="mt-2 flex justify-between items-center text-[10px] opacity-50">
                      <span>{msg.time}</span>
                      <button onClick={() => navigator.clipboard.writeText(msg.text)}><Copy className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))
            )}
            {apiLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl animate-pulse text-xs font-bold text-purple-600">THINKING...</div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </div>

        {/* FOOTER: Fixed at bottom with safe area support */}
        <footer className="p-4 lg:p-6 border-t bg-background pb-[max(1rem,calc(env(safe-area-inset-bottom)+60px))]">
          {!canUseChat ? (
            <div className="max-w-4xl mx-auto p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
                <Crown className="w-5 h-5 text-amber-500" /> Premium Required
              </div>
              <Link to="/pricing"><Button size="sm">Upgrade</Button></Link>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  placeholder="Ask anything..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  disabled={apiLoading}
                  className="pr-12 h-14 rounded-2xl bg-gray-50 dark:bg-gray-900"
                />
                <button type="button" onClick={handleMicClick} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 ${recording ? 'text-red-500 animate-pulse' : 'text-gray-400'}`}>
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              <Button type="submit" disabled={apiLoading || !inputMessage.trim()} size="icon" className="h-14 w-14 rounded-2xl bg-purple-600">
                <Send className="w-6 h-6 text-white" />
              </Button>
            </form>
          )}
        </footer>
      </main>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}
    </div>
  );
};

export default DrSultanChat;