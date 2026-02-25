// @ts-nocheck
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookmarkX, Moon, Sun, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';

import { useToast } from '@/hooks/use-toast';
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown
import Seo from '@/components/Seo'; // Import the Seo component
import PlanBadge from '@/components/PlanBadge';


// Assuming MCQ interface is available from mcqData or defined here
interface MCQ {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  chapter: string;
  subject: string; // Ensure this matches your database schema
}

const SavedMCQsPage = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State to manage expanded MCQ
  const [expandedMcqId, setExpandedMcqId] = useState<string | null>(null);

  // Get user profile data for plan badge and avatar
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, avatar_url') // Select avatar_url here
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch saved MCQs
  const { data: savedMcqs, isLoading, isError, error } = useQuery<MCQ[], Error>({
    queryKey: ['savedMcqs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // First, fetch the mcq_ids from the 'saved_mcqs' table for the current user
      const { data: savedMcqIdsData, error: savedMcqIdsError } = await supabase
        .from('saved_mcqs')
        .select('mcq_id')
        .eq('user_id', user.id);

      if (savedMcqIdsError) {
        throw savedMcqIdsError;
      }

      const mcqIds = savedMcqIdsData.map(item => item.mcq_id);

      if (mcqIds.length === 0) {
        return []; // No saved MCQs
      }

      // Then, fetch the full MCQ details from the 'mcqs' table using the collected mcq_ids
      const { data: mcqDetails, error: mcqDetailsError } = await supabase
        .from('mcqs')
        .select('*')
        .in('id', mcqIds); // Use .in() to fetch multiple MCQs by their IDs

      if (mcqDetailsError) {
        throw mcqDetailsError;
      }

      return mcqDetails as MCQ[];
    },
    enabled: !!user?.id, // Only run this query if the user is logged in
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Data kept in cache for 10 minutes
  });

  // Mutation for unsaving an MCQ
  const unsaveMCQMutation = useMutation({
    mutationFn: async (mcqId: string) => {
      if (!user?.id) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from('saved_mcqs')
        .delete()
        .eq('user_id', user.id)
        .eq('mcq_id', mcqId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedMcqs', user?.id] }); // Invalidate and refetch saved MCQs
      // Collapse the unsaved MCQ if it was expanded
      setExpandedMcqId(null); 
      toast({
        title: "MCQ Unsaved",
        description: "This question has been removed from your saved list.",
        variant: "default", // Or a specific success variant
      });
    },
    onError: (err) => {
      console.error("Error unsaving MCQ:", err);
      toast({
        title: "Error",
        description: `Failed to unsave MCQ: ${err.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  const handleToggleExpand = (mcqId: string) => {
    setExpandedMcqId(prevId => (prevId === mcqId ? null : mcqId));
  };

  const handleUnsaveMcq = (mcqId: string) => {
    // Using toast for confirmation instead of window.confirm
    toast({
      title: "Unsave Question?",
      description: "Are you sure you want to remove this question from your saved list?",
      action: (
        <Button 
          variant="destructive" 
          onClick={() => unsaveMCQMutation.mutate(mcqId)}
          disabled={unsaveMCQMutation.isLoading}
        >
          {unsaveMCQMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Yes, Unsave
        </Button>
      ),
      duration: 5000, // Keep toast visible for 5 seconds for user to act
    });
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      <Seo
        title="Saved MCQs"
        description="Access and review your saved MCQs on Medmacs App. Organize your favorite or challenging questions for focused revision."
        canonical="https://medistics.app/saved-mcqs"
      />
      {/* Header */}
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
            <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-3">
            {/* Replace with your actual logo path */}
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Saved MCQs</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <PlanBadge plan={profile?.plan} />
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl mt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          📚 Your Saved MCQs
        </h1>

        {isLoading && (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400" />
            <p className="ml-2 text-gray-600 dark:text-gray-400">Loading your saved questions...</p>
          </div>
        )}

        {isError && (
          <div className="text-center text-red-500 dark:text-red-400">
            <p>Error loading saved MCQs: {error?.message || 'Unknown error'}</p>
            <p>Please try again later.</p>
          </div>
        )}

        {!user && !isLoading && (
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-auto max-w-md">
            <CardContent className="text-center py-6 sm:py-8">
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                Please log in to view your saved MCQs.
              </p>
              <Link to="/login">
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-sm sm:text-base">
                  Log In
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {user && !isLoading && savedMcqs && savedMcqs.length === 0 && (
          <Card className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm mx-auto max-w-md">
            <CardContent className="text-center py-6 sm:py-8">
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                You haven't saved any MCQs yet. Start solving quizzes to save questions!
              </p>
            </CardContent>
          </Card>
        )}

        {user && savedMcqs && savedMcqs.length > 0 && (
          <div className="space-y-6">
            {savedMcqs.map((mcq) => (
              <Card 
                key={mcq.id} 
                className="bg-gradient-to-br from-purple-100/70 via-purple-50/50 to-pink-50/30 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-pink-900/10 border-purple-200 dark:border-purple-800 backdrop-blur-sm"
              >
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6 flex flex-row justify-between items-start">
                  <div className="flex-grow">
                    <CardTitle className="text-base sm:text-lg leading-relaxed text-gray-900 dark:text-white mb-2">
                      {mcq.question}
                    </CardTitle>
                    {/* Display subject name, with a fallback for null/empty values */}
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-700">
                      {mcq.subject || 'Unknown Subject'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleUnsaveMcq(mcq.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Unsave Question"
                      disabled={unsaveMCQMutation.isLoading}
                    >
                      {unsaveMCQMutation.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookmarkX className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleExpand(mcq.id)}
                      className="text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400"
                      title={expandedMcqId === mcq.id ? "Collapse" : "Expand"}
                    >
                      {expandedMcqId === mcq.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                  </div>
                </CardHeader>
                <AnimatePresence>
                  {expandedMcqId === mcq.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="space-y-2 sm:space-y-3 mb-4">
                          {mcq.options.map((option, index) => (
                            <div 
                              key={index} 
                              className={`w-full p-3 sm:p-4 text-left border-2 rounded-lg text-sm sm:text-base 
                                ${option === mcq.correct_answer 
                                  ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-400' 
                                  : 'bg-gray-50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                              {option === mcq.correct_answer && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 ml-2 inline-block float-right" />}
                            </div>
                          ))}
                        </div>
                        {mcq.explanation && (
                          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2 text-sm sm:text-base">Explanation:</h4>
                            <p className="text-blue-800 dark:text-blue-300 text-sm sm:text-base">{mcq.explanation}</p>
                          </div>
                        )}
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center pt-6 pb-4">
        <p className="text-[10px] text-muted-foreground font-medium">A Project by Hmacs Studios.</p>
        <p className="text-[10px] text-muted-foreground mt-1">© 2026 Hmacs Studios. All rights reserved</p>
      </div>
      
    </div>
  );
};

export default SavedMCQsPage;
