import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, Loader2, Bot, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AIChatbotProps {
  currentQuestion?: string;
  options?: any; // options come from jsonb so be flexible
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatOptions = () => {
    if (!options) return 'No options provided';

    if (Array.isArray(options)) {
      return options.join(', ');
    }

    if (typeof options === 'object') {
      return Object.entries(options)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }

    return String(options);
  };

  const sendMessage = async (message: string) => {
    if (!hasPremiumAccess) return;
    if (!message.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let composedPrompt = message.trim();

      if (currentQuestion) {
        composedPrompt =
          `MCQ Question: ${currentQuestion}\n` +
          `Options: ${formatOptions()}\n\n` +
          `User Query: ${message.trim()}`;
      }

      const response = await fetch(`${API_BASE_URL}/study-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: composedPrompt,
          options: options // ✅ pass raw JSONB in body
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        role: 'assistant',
        content: data.answer || 'Sorry, I could not generate a response.',
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, there was an error connecting to the AI service. Please check if the server at ${API_BASE_URL} is running and try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleQuestionHelp = () => {
    if (!hasPremiumAccess) return;
    if (currentQuestion) {
      sendMessage(`Explain this MCQ:\n${currentQuestion}\nOptions: ${formatOptions()}`);
    }
  };

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
        >
          <Bot className="w-6 h-6 text-white" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100, y: 100 }}
            className="
              fixed bottom-0 right-0 z-50
              w-full max-w-sm md:max-w-md lg:w-96 
              h-[85vh] md:h-[500px]
              bg-white dark:bg-gray-900 
              rounded-t-xl md:rounded-lg 
              shadow-2xl border border-gray-200 dark:border-gray-700
              overflow-hidden
            "
          >
            <Card className="h-full flex flex-col border-none shadow-none">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5" />
                  <CardTitle className="text-lg">Dr. Ahroid Chat</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 p-0 text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                {hasPremiumAccess ? (
                  <>
                    <ScrollArea className="flex-1 px-4 py-4">
                      {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                          <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-sm">Ask me anything about your studies!</p>
                          <p className="text-xs text-gray-500 mt-2">
                            I'm Dr. Ahroid, your MBBS tutor specialized in medical sciences.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {messages.map((message, index) => (
                            <div
                              key={index}
                              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                                  }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                <p
                                  className={`text-xs mt-1 ${message.role === 'user' ? 'text-purple-100' : 'text-gray-500'
                                    }`}
                                >
                                  {new Date(message.timestamp).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex justify-start">
                              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin" />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </ScrollArea>

                    {currentQuestion && (
                      <div className="border-t bg-gray-50 dark:bg-gray-800 p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleQuestionHelp}
                          className="w-full"
                        >
                          Help with current question
                        </Button>
                      </div>
                    )}

                    <div className="border-t p-4">
                      <form onSubmit={handleSubmit} className="flex space-x-2">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask about the question..."
                          disabled={isLoading}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          size="sm"
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Lock className="w-16 h-16 text-purple-600 mb-4 opacity-70" />
                    <CardTitle className="text-xl mb-2">Premium Feature</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mb-4">
                      Unlock full access to Dr. Ahroid AI Chatbot with a Premium plan.
                    </CardDescription>
                    <Button
                      asChild
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105"
                    >
                      <a href="/pricing">Upgrade to Premium</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
