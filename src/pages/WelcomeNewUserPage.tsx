// src/pages/WelcomeNewUserPage.jsx
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import Seo from '@/components/Seo'; // Import the Seo component

// No useQuery or supabase import needed on this page

const WelcomeNewUserPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Determine the display name (simple fallback using email prefix)
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  // Handle click for the "Choose My Username" button
  const handleChooseUsername = () => {
    navigate('/settings/username'); // Navigate to the username update page
  };

  // Optional: If user somehow lands here without being authenticated,
  // or if `user` isn't immediately available (though useAuth should handle this)
  // this can prevent rendering issues.
  if (!user) {
    // Ideally, a higher-level route protector would handle unauthenticated users
    // but this acts as a safeguard. You could redirect to login here too,
    // but the request was to simplify by removing all redirects.
    return (
      <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
        <p className="text-gray-700 dark:text-gray-300">Please log in to continue.</p>
        <Button onClick={() => navigate('/login')}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-purple-950 px-4 text-center">
      <Seo
        title="Welcome to Medmacs App"
        description="Welcome to Medmacs App! Get started with your personalized MDCAT preparation journey."
        canonical="https://medmacs.app/welcome-new-user"
      />
      <UserIcon className="w-20 h-20 text-purple-600 dark:text-purple-400 mb-6 animate-bounce-slow" />
      <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
        Welcome, <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent animate-pulse">{displayName}</span>!
      </h1>
      <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl">
        Get ready to supercharge your MBBS studies with Medmacs.
      </p>
      <p className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-10 max-w-xl">
        First, please choose your unique username for public visibility.
      </p>
      <Button
        onClick={handleChooseUsername}
        className="px-8 py-4 text-lg bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105"
      >
        Choose My Username
      </Button>
    </div>
  );
};

export default WelcomeNewUserPage;