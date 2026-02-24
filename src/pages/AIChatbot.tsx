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
  messages: any; // Supabase stores JSON as any
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
      if (deletedId === currentSessionId) {
        startNewChat();
      }
      setSessionToDelete(null);
    },
  });

  // --- 3. CORE LOGIC ---
  const syncChatToDb = async (updatedMessages: ChatMessage[], sessionId: string | null) => {
    if (!user?.id || updatedMessages.length === 0) return;

    const recordToSave = updatedMessages.slice(-50); // Increased history slightly
    const firstUserMsg = updatedMessages.find(m => m.sender === 'user')?.text || "New Chat";
    const sessionName = firstUserMsg.substring(0, 40);

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

    // Update UI immediately
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

      if (!res.ok) throw new Error("Server responded with an error");

      const payload = await res.json();

      // Fix: Check if payload.answer is an object or string
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

      // Sync to DB using the ID available in current closure
      await syncChatToDb(finalMessages, currentSessionId);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        sender: 'ai',
        text: "⚠️ Connection error. Please check your internet or try again later.",
        time: ts
      };
      setMessages(prev => [...prev, errorMsg]);
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
    // Ensure messages are cast correctly from JSON
    const loadedMessages = Array.isArray(chat.messages) ? chat.messages : [];
    setMessages(loadedMessages);
    setCurrentSessionId(chat.id);
    setIsSidebarOpen(false);
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, apiLoading]);

  const handleMicClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    const rec = new SpeechRecognition();
    rec.onstart = () => setRecording(true);
    rec.onresult = (evt: any) => setInputMessage(evt.results[0][0].transcript);
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    rec.start();
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center font-medium">Loading Medical Portal...</div>;

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-300">
      <Seo title="Dr. Ahroid | AI Tutor" />

      {/* DELETE MODAL */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent className="dark:bg-gray-900 border-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" /> Delete Session?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently erase this chat history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && deleteSessionMutation.mutate(sessionToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SIDEBAR */}
      <aside className={`fixed lg:relative z-50 w-72 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
          <span className="font-bold text-purple-600 tracking-tight">STUDY HISTORY</span>
          <Button variant="ghost" size="icon" onClick={startNewChat} className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
            <PlusCircle className="w-5 h-5 text-purple-600" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {chatHistory?.length === 0 && (
            <p className="text-center text-xs text-muted-foreground mt-10">No previous sessions</p>
          )}
          {chatHistory?.map((chat) => (
            <div key={chat.id} className="group relative">
              <button
                onClick={() => loadSession(chat)}
                className={`w-full text-left p-3 pr-10 rounded-xl text-sm transition-all border ${currentSessionId === chat.id
                  ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-transparent'}`}
              >
                <div className="font-semibold truncate">{chat.session_name || "New Chat"}</div>
                <div className="text-[10px] opacity-60 mt-1">{new Date(chat.created_at).toLocaleDateString()}</div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSessionToDelete(chat.id); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 lg:opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button variant="outline" className="w-full justify-start gap-2 rounded-xl" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </aside>

      {/* MAIN CHAT */}
      <main className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-950">
        <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex flex-col">
              <CardTitle className="text-base font-bold dark:text-white">Dr. Ahroid</CardTitle>
              <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider">AI Medical Tutor</span>
            </div>
          </div>
          <ProfileDropdown />
        </header>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto animate-in fade-in duration-700">
              <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/30 rounded-3xl flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-xl font-bold dark:text-white">Start Your Medical Consult</h2>
              <p className="text-sm text-muted-foreground mt-2">Ask about anatomy, pharmacology, clinical cases, or any MBBS subject.</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
                <div className={`max-w-[90%] lg:max-w-[75%] p-4 rounded-2xl shadow-sm ${msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-tr-none'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none border border-gray-200 dark:border-gray-700'
                  }`}>
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                    {msg.text}
                  </p>
                  <div className="mt-3 flex items-center justify-between opacity-50 text-[10px] border-t border-black/10 dark:border-white/10 pt-2">
                    <span>{msg.time}</span>
                    <button
                      className="hover:text-white dark:hover:text-purple-400 p-1"
                      onClick={() => { navigator.clipboard.writeText(msg.text); setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 2000); }}
                    >
                      {copiedIndex === i ? 'Copied!' : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          {apiLoading && (
            <div className="flex justify-start animate-in fade-in">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">Thinking</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* FOOTER INPUT */}
        <div className="p-4 lg:p-6 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          {!canUseChat ? (
            <div className="max-w-4xl mx-auto p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm font-semibold">
                <Crown className="w-5 h-5 text-amber-500" /> Upgrade to Premium for Unlimited AI Chat.
              </div>
              <Link to="/pricing"><Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">Upgrade</Button></Link>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-3">
              <div className="relative flex-1 group">
                <Input
                  placeholder="Ask anything about your medical studies..."
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  disabled={apiLoading}
                  className="pr-12 h-14 rounded-2xl border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 transition-all text-base"
                />
                <button
                  type="button"
                  onClick={handleMicClick}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-purple-600'}`}
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>
              <Button type="submit" disabled={apiLoading || !inputMessage.trim()} size="icon" className="h-14 w-14 rounded-2xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 dark:shadow-none transition-transform active:scale-95">
                <Send className="w-6 h-6 text-white" />
              </Button>
            </form>
          )}
          <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-tighter">Medical AI can make mistakes. Verify critical clinical info.</p>
        </div>
      </main>

      {/* OVERLAY */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};

export default DrSultanChat;