import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Moon, Sun, Home, CheckCircle } from 'lucide-react'; // Added CheckCircle icon
import { ProfileDropdown } from '@/components/ProfileDropdown';

const TestCompletionPage = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate(); // Initialize useNavigate

  // Redirect to login if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view test results</h1>
          <Link to="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-white via-purple-50/30 to-pink-50/30 dark:bg-gradient-to-br dark:from-gray-900 dark:via-purple-900/10 dark:to-pink-900/10 flex flex-col">
      {/* Header - Consistent with Dashboard and MockTest */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-purple-200 dark:border-purple-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img
              src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png"
              alt="Medmacs Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Test Completed</span>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-9 h-9 p-0 hover:scale-110 transition-transform duration-200"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700">
              Free Plan
            </Badge>
            <ProfileDropdown />
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4 text-center">
        <CheckCircle className="w-24 h-24 text-green-500 mb-6 animate-bounce-in" />
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 animate-fade-in-up">
          Congratulations!
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 mb-2 animate-fade-in-up delay-100">
          You have successfully completed the Weekly Mock Test!
        </p>
        {/* New line added here */}
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 animate-fade-in-up delay-150">
          Your results will be announced within 24-48 hours.
        </p>

        <Button
          onClick={() => navigate('/dashboard')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 px-8 py-3 text-lg animate-fade-in-up delay-200"
        >
          <Home className="w-5 h-5 mr-2" /> Go to Dashboard
        </Button>
      </main>

      {/* Optional: Footer if you want it here, otherwise removed as per previous request */}
      <div className="text-center mt-12 mb-4 p-4 text-gray-500 dark:text-gray-400 text-sm">
        <p>A Project by Hmacs Studios.</p>
        <p>&copy; 2025 Medmacs. All rights reserved.</p>
      </div>
    </div>
  );
};

export default TestCompletionPage;
