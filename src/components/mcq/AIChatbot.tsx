import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, X, Loader2, Bot, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatbotProps {
  currentQuestion?: string;
  options?: any;
  userPlan?: string;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ currentQuestion, userPlan, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasPremiumAccess = userPlan === 'premium';
  const API_BASE_URL = 'https://medmacs-ai-bot.vercel.app';

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const formatOptions = () => {
    if (!options) return 'No options provided';
    if (Array.isArray(options)) return options.join(', ');
    if (typeof options === 'object') return Object.entries(options).map(([key, value]) => `${key}: ${value}`).join(', ');
    return String(options);
  };

  const sendMessage = async (message: string) => {
    if (!hasPremiumAccess || !message.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', content: message.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    try {
      let composedPrompt = message.trim();
      if (currentQuestion) composedPrompt = `MCQ Question: ${currentQuestion}\nOptions: ${formatOptions()}\n\nUser Query: ${message.trim()}`;
      const response = await fetch(`${API_BASE_URL}/study-chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: composedPrompt, options }),
      });
      if (!response.ok) { const errorText = await response.text(); throw new Error(`Server responded with ${response.status}: ${errorText}`); }
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer || 'Sorry, I could not generate a response.', timestamp: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, there was an error connecting to the AI service. Please try again.`, timestamp: new Date().toISOString() }]);
    } finally { setIsLoading(false); }
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendMessage(input); };
  const handleQuestionHelp = () => { if (hasPremiumAccess && currentQuestion) sendMessage(`Explain this MCQ:\n${currentQuestion}\nOptions: ${formatOptions()}`); };

  return (
    <>
      {/* FAB */}
      <motion.div className="fixed bottom-6 right-4 z-50" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button onClick={() => setIsOpen(true)} className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-xl">
          <Bot className="w-6 h-6 text-primary-foreground" />
        </Button>
      </motion.div>

      {/* Chat panel - full screen on mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 sm:inset-auto sm:bottom-4 sm:right-4 sm:w-96 sm:h-[500px] sm:rounded-2xl overflow-hidden shadow-2xl border border-border bg-background flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5" />
                <span className="text-base font-bold">Dr. Ahroid</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="w-8 h-8 p-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {hasPremiumAccess ? (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Bot className="w-8 h-8 text-primary opacity-60" />
                      </div>
                      <p className="text-sm font-medium text-foreground">Ask me anything!</p>
                      <p className="text-xs text-muted-foreground mt-1">I'm Dr. Ahroid, your MBBS tutor.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((message, index) => (
                        <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted text-foreground rounded-bl-md'
                          }`}>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                            <p className={`text-[10px] mt-1 ${message.role === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Help button */}
                {currentQuestion && (
                  <div className="px-3 py-2 border-t border-border flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={handleQuestionHelp} className="w-full text-xs rounded-xl h-9">
                      Help with current question
                    </Button>
                  </div>
                )}

                {/* Input */}
                <div className="px-3 py-3 border-t border-border flex-shrink-0 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-3">
                  <form onSubmit={handleSubmit} className="flex space-x-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your question..."
                      disabled={isLoading}
                      className="flex-1 rounded-xl h-10 text-sm bg-muted border-border"
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()} size="sm" className="bg-primary hover:bg-primary/90 rounded-xl h-10 w-10 p-0">
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-primary opacity-60" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Premium Feature</h3>
                <p className="text-sm text-muted-foreground mb-6">Unlock Dr. Ahroid AI Chatbot with a Premium plan.</p>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6">
                  <a href="/pricing">Upgrade to Premium</a>
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
