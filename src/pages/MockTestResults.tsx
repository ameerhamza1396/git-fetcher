// @ts-nocheck
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Award, Clock, FileText, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown

// IMPORTANT: Updated Profile type (assuming 'plan' might be nullable)
type Profile = {
  avatar_url: string | null;
  created_at: string;
  full_name: string | null;
  id: string;
  medical_school: string | null;
  updated_at: string;
  username: string | null; // username can be null if not set
  year_of_study: number | null; // year_of_study can be null if not set
  plan?: string | null; // Plan can be nullable
};

// IMPORTANT: Updated UserTestResult type to reflect 'user_id' from database
type UserTestResult = {
  id: string;
  userId: string; // Changed from 'username' to 'userId' to match DB column 'user_id'
  score: number;
  total_questions: number;
  completed_at: string;
};

const MockTestResults = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth(); // Assuming useAuth provides the Supabase user object

  // --- Debugging: Check the user object ---
  console.log("MockTestResults Component Rendered.");
  console.log("Current user object from useAuth:", user);
  if (user) {
    console.log("User ID:", user.id);
    console.log("User Email:", user.email);
  } else {
    console.log("User object is null or undefined. Authentication might be pending or failed.");
  }
  // --- End Debugging ---

  // Get user profile data
  const { data: profile, isLoading: isLoadingProfile, error: profileError } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        console.log("Profile query skipped: user.id is not available.");
        return null;
      }
      console.log("Attempting to fetch profile for user ID:", user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      console.log("Profile data fetched:", data);
      return data;
    },
    enabled: !!user?.id, // Only run this query if user.id is available
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Data stays in cache for 10 minutes
  });

  // Get user test results
  const { data: testResults, isLoading, error } = useQuery<UserTestResult[]>({
    queryKey: ['userTestResults', user?.id],
    queryFn: async (): Promise<UserTestResult[]> => {
      if (!user?.id) {
        console.log("User test results query skipped: user.id is not available.");
        return [];
      }
      // IMPORTANT: Updated log to reflect 'user_id' as the column used for filtering
      console.log("Attempting to fetch test results for user ID (used as 'user_id' in DB):", user.id);

      // @ts-ignore: 'user_test_results' is not in the generated Supabase types.
      // IMPORTANT: Removed .limit(1) to fetch all results
      const { data, error } = await (supabase
        .from('user_test_results' as any) // Make sure 'user_test_results' is the actual table name
        .select('*')
        .eq('user_id', user.id) // Using 'user_id' as per your Supabase RLS policy
        .order('completed_at', { ascending: false })); // Order by most recent test first

      if (error) {
        console.error('Error fetching test results:', error);
        return [];
      }

      console.log('Raw data from "user_test_results":', data);

      // Filter and map to ensure data types match UserTestResult
      const validatedData: UserTestResult[] = (data ?? [])
        .filter((item: any) => {
          // IMPORTANT: Check for 'user_id' property in the raw item
          const isValid =
            typeof item.id === 'string' &&
            typeof item.user_id === 'string' && // Checking for 'user_id' from DB
            typeof item.score === 'number' &&
            typeof item.total_questions === 'number' &&
            typeof item.completed_at === 'string';
          if (!isValid) {
            console.warn("Invalid test result item skipped due to type mismatch or missing property:", item);
          }
          return isValid;
        })
        .map((item: any) => ({
          id: item.id,
          userId: item.user_id, // IMPORTANT: Map 'user_id' from DB to 'userId' in your type
          score: item.score,
          total_questions: item.total_questions,
          completed_at: item.completed_at
        }));

      console.log('Processed and validated test results:', validatedData);
      return validatedData;
    },
    enabled: !!user?.id, // Only run this query if user.id is available
    staleTime: 5 * 60 * 1000, // Data considered fresh for 5 minutes
    cacheTime: 10 * 60 * 1000, // Data stays in cache for 10 minutes
  });

  // Define plan color schemes
  const planColors = {
    'free': {
      light: 'bg-purple-100 text-purple-800 border-purple-300',
      dark: 'dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-700'
    },
    'premium': {
      light: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      dark: 'dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-700'
    },
    'pro': {
      light: 'bg-green-100 text-green-800 border-green-300',
      dark: 'dark:bg-green-900/30 dark:text-green-200 dark:border-green-700'
    },
    'default': {
      light: 'bg-gray-100 text-gray-800 border-gray-300',
      dark: 'dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
    }
  };

  // Determine the user's plan and its display name
  const rawUserPlan = profile?.plan?.toLowerCase() || 'free';
  const userPlanDisplayName = rawUserPlan.charAt(0).toUpperCase() + rawUserPlan.slice(1) + ' Plan';

  // Get the color classes for the current plan
  const currentPlanColorClasses = planColors[rawUserPlan as keyof typeof planColors] || planColors['default'];

  // Function to get remark based on score
  const getRemark = (score: number, totalQuestions: number) => {
    if (totalQuestions === 0) return "N/A";
    const percentage = (score / totalQuestions) * 100;
    if (percentage >= 90) return "Excellent!";
    if (percentage >= 75) return "Great Job!";
    if (percentage >= 50) return "Good Effort!";
    return "Keep Practicing!";
  };

  // Function to format date to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Number of empty cards to add for UI balance
  const emptyCardCount = 3 - ((testResults?.length || 0) % 3);
  const emptyCards = emptyCardCount > 0 && emptyCardCount !== 3 // Only add if not a full row already
    ? Array.from({ length: emptyCardCount }).map((_, index) => (
        <Card key={`empty-${index}`}
            className="bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center p-6 sm:p-8 text-gray-400 dark:text-gray-500">
          <p>No more tests yet</p>
        </Card>
      ))
    : [];

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50 pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/dashboard" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center space-x-3">
            {/* Ensure this path to your logo is correct and accessible */}
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Mock Test Results</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Badge
              variant="secondary"
              className={`hidden sm:flex ${currentPlanColorClasses.light} ${currentPlanColorClasses.dark}`}
            >
              {userPlanDisplayName}
            </Badge>
                {/* NEW: Replaced hardcoded avatar with ProfileDropdown */}
                <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            📊 Your Mock Test Results
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Review your performance and use these insights to focus on areas needing improvement.
          </p>
          {isLoading ? (
             <p className="text-gray-500 dark:text-gray-400 mt-2">Loading test count...</p>
          ) : error ? (
            <p className="text-red-500 mt-2">Error loading test count.</p>
          ) : (
            <p className="text-xl font-semibold text-purple-600 dark:text-purple-400 mt-2">
              You've attempted: <span className="font-bold">{testResults?.length || 0}</span> mock tests!
            </p>
          )}
        </div>

        {isLoadingProfile ? (
          <div className="text-center text-gray-600 dark:text-gray-400">Loading profile...</div>
        ) : profileError ? (
          <div className="text-center text-red-500">Error loading profile.</div>
        ) : profile && (
          <div className="text-center mb-6 text-gray-800 dark:text-gray-200">
            <p className="text-xl font-semibold">Welcome, {profile.full_name || profile.username || 'User'}!</p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-gray-600 dark:text-gray-400">Loading your test results...</div>
        ) : error ? (
          <div className="text-center text-red-500">Error fetching test results: {error.message}. Please try again.</div>
        ) : !testResults || testResults.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-gray-400">
            No mock test results found. Take a test to see your results here!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4 animate-fade-in">
            {testResults.map((result) => (
              <Card key={result.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                           hover:shadow-xl transition-shadow duration-300
                           p-6 sm:p-8
                           shadow-lg ring-2 ring-purple-500/50 dark:ring-purple-400/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-gray-900 dark:text-white text-3xl flex items-center mb-2">
                    <Award className="h-8 w-8 mr-3 text-yellow-500" />
                    Score: {result.score} / {result.total_questions}
                    <span className="ml-auto text-lg text-gray-500 dark:text-gray-400 font-bold">
                      ({((result.score / result.total_questions) * 100).toFixed(1)}%)
                    </span>
                  </CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400 text-base mt-1">
                    <Clock className="inline-block h-5 w-5 mr-2" />
                    Completed on: <span className="font-semibold">{formatDate(result.completed_at)}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-xl md:text-2xl font-bold text-purple-700 dark:text-purple-300">
                    Remark: {getRemark(result.score, result.total_questions)}
                  </p>
                </CardContent>
              </Card>
            ))}
            {emptyCards} {/* Render empty cards here */}
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-sm text-blue-800 dark:text-blue-200 max-w-4xl mx-auto mt-8">
          <div className="flex items-start space-x-2">
            <FileText className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-2">Understanding your results:</p>
              <ul className="space-y-1 text-xs">
                <li>• This page now shows *all* your mock test results, ordered from most recent.</li>
                <li>• Your score and total questions give you a clear picture of your performance for each attempt.</li>
                <li>• The remark offers a quick summary of each test outcome.</li>
                <li>• Use these insights to track your progress and focus on areas needing improvement.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockTestResults;
