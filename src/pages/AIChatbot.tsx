// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, Send, Mic, MessageSquare, Menu, Copy, Clock, PlusCircle, Trash2, AlertTriangle, Crown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import Seo from '@/components/Seo';
import { motion, AnimatePresence } from 'framer-motion';
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

const parseBoldText = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
};

const DrSultanChat: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const location = useLocation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefilledText = location.state?.prefilledText;
    if (prefilledText) {
      setInputMessage(prefilledText);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // --- 1. DATA FETCHING ---
  const { data: profile, isLoading: profileLoading } = useQuery({
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

    const recentMessages = messages.slice(-6);
    const context = recentMessages.map((m) => {
      const prefix = m.sender === 'user' ? 'User' : 'Assistant';
      return `${prefix}: ${m.text}`;
    }).join('\n');
    const questionWithContext = context ? `${context}\n\nUser: ${trimmedInput}` : trimmedInput;

    try {
      const res = await fetch(`${API_BASE_URL}/study-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionWithContext })
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

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="fixed inset-0 w-full flex overflow-hidden bg-[#F8FAFC] dark:bg-gray-950">
      <Seo title="Dr. Ahroid | AI Tutor" />

      {/* DELETE MODAL */}
      <AlertDialog open={!!sessionToDelete} onOpenChange={() => setSessionToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black italic uppercase">Delete Session?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">This session and all its messages will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => sessionToDelete && deleteSessionMutation.mutate(sessionToDelete)} className="bg-destructive hover:bg-destructive/90 rounded-2xl font-bold">Delete Session</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SIDEBAR */}
      <aside className={`fixed lg:relative z-50 w-80 h-full bg-white dark:bg-zinc-900 border-r border-border transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 flex flex-col shadow-2xl`}>
        <div className="p-6 border-b flex justify-between items-center bg-white dark:bg-zinc-900">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Study History</span>
            <span className="text-xl font-black italic uppercase leading-none">Your <span className="text-primary">Chats</span></span>
          </div>
          <Button variant="ghost" size="icon" onClick={startNewChat} className="rounded-xl hover:bg-primary/10 hover:text-primary"><PlusCircle className="w-6 h-6" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {chatHistory?.map((chat) => (
            <div key={chat.id} className="group relative">
              <button
                onClick={() => loadSession(chat)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border-2 ${currentSessionId === chat.id
                  ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                  : 'border-transparent hover:bg-secondary/50 hover:border-border/60'
                  }`}
              >
                <div className={`font-bold text-sm truncate uppercase tracking-tight mb-1 ${currentSessionId === chat.id ? 'text-primary' : 'text-foreground'}`}>
                  {chat.session_name || "New Conversation"}
                </div>
                <div className="flex items-center gap-2 opacity-60">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-bold uppercase">{new Date(chat.created_at).toLocaleDateString()}</span>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSessionToDelete(chat.id); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 hover:text-destructive transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!chatHistory || chatHistory.length === 0) && (
            <div className="text-center py-10 px-6">
              <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center opacity-40">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-relaxed">No sessions found.<br />Start a new conversation</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-secondary/30">
          <Button variant="outline" className="w-full justify-start gap-3 rounded-2xl h-12 border-border shadow-sm hover:scale-[1.02] transition-transform hover:border-primary" onClick={startNewChat}>
            <PlusCircle className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">New Conversation</span>
          </Button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col min-h-0 relative">
        <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" onClick={() => setIsSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-lg overflow-hidden p-1">
                <img src="/mascots/Mascot12.png" alt="Dr. Ahroid" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <CardTitle className="text-lg font-black italic uppercase tracking-tight">Dr. <span className="text-primary">Ahroid</span></CardTitle>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-500 font-black uppercase tracking-[0.2em]">Always Online</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <ProfileDropdown />
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden px-4 lg:px-12 py-8 scroll-smooth custom-scrollbar">
          <div className="max-w-4xl mx-auto flex flex-col flex-1">
            {messages.length === 0 ? (
              <div className="fixed top-[4.5rem] left-0 right-0 bottom-24 flex flex-col items-center justify-center text-center px-8 bg-[#F8FAFC] dark:bg-gray-950">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
                  <div className="relative w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center shadow-2xl p-2 overflow-hidden">
                    <img src="/mascots/Mascot12.png" alt="Dr. Ahroid" className="w-full h-full object-contain" />
                  </div>
                </div>
                <h2 className="text-2xl font-black italic uppercase mb-2 tracking-tight">Your AI <span className="text-primary">Mentor</span></h2>
                <p className="text-sm text-muted-foreground font-medium max-w-sm mb-6">Ask about anatomy, pharmacology, procedures, or test cases.</p>
                {canUseChat && (
                  <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                    {['Osteomyelitis', 'Types of MI', 'Azithromycin SE', 'McBurney point'].map(q => (
                      <button
                        key={q}
                        onClick={() => setInputMessage(q)}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-border hover:border-primary hover:bg-primary/5 text-[11px] font-bold uppercase tracking-wider text-center transition-all hover:scale-[1.02] shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`relative max-w-[85%] sm:max-w-[75%] p-5 rounded-3xl shadow-lg ${msg.sender === 'user'
                      ? 'bg-primary text-white rounded-tr-none'
                      : 'bg-white dark:bg-zinc-900 text-foreground border border-border/60 rounded-tl-none'
                      }`}>
                      <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{parseBoldText(msg.text)}</p>

                      <div className={`mt-3 pt-3 flex items-center justify-between border-t ${msg.sender === 'user' ? 'border-white/10 opacity-60' : 'border-border/30 opacity-40'
                        }`}>
                        <span className="text-[10px] font-black uppercase tracking-[0.1em]">{msg.time}</span>
                        <button
                          onClick={() => copyToClipboard(msg.text, i)}
                          className={`p-1.5 rounded-lg transition-all ${msg.sender === 'user' ? 'hover:bg-white/20' : 'hover:bg-muted'
                            }`}
                        >
                          {copiedIndex === i ?
                            <span className="text-[10px] font-black uppercase tracking-widest">COPIED!</span> :
                            <Copy className="w-3 h-3" />
                          }
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {apiLoading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-start mb-8"
              >
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-3xl rounded-tl-none border border-border/60 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Processing...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <footer className="p-4 lg:p-8 bg-background border-t border-border/60">
          <div className="max-w-4xl mx-auto mb-[max(0px,env(safe-area-inset-bottom))]">
            {profileLoading ? (
              <div className="h-16 rounded-3xl bg-secondary/30 animate-pulse flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : !canUseChat ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-20 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl shadow-amber-500/5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black italic uppercase tracking-tight">Premium Plan Required</h4>
                    <p className="text-xs text-muted-foreground font-medium">Unlock full access to Dr. Ahroid & other AI features.</p>
                  </div>
                </div>
                <Link to="/pricing" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-10 px-6 font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-amber-500/20">
                    Upgrade to Premium
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSendMessage} className="flex items-center gap-4 relative">
                <div className="relative flex-1 group">
                  <Input
                    placeholder="Describe your medical query here..."
                    value={inputMessage}
                    onChange={e => setInputMessage(e.target.value)}
                    disabled={apiLoading}
                    className="h-16 pl-6 pr-14 rounded-3xl bg-secondary/30 border-2 border-transparent focus:border-primary/30 dark:bg-zinc-900 shadow-inner text-sm font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleMicClick}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${recording ? 'bg-destructive text-white animate-pulse' : 'text-muted-foreground hover:bg-secondary active:scale-95'
                      }`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
                <Button
                  type="submit"
                  disabled={apiLoading || !inputMessage.trim()}
                  size="icon"
                  className="h-16 w-16 rounded-[2rem] bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all shrink-0"
                >
                  <Send className="w-6 h-6 text-white" />
                </Button>
              </form>
            )}
            <p className="text-[10px] text-center text-muted-foreground mt-4 uppercase font-black tracking-widest opacity-40">Medmacs Study Assistant • AI Consult V2.0</p>
          </div>
        </footer>
      </main>

      {isSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DrSultanChat;