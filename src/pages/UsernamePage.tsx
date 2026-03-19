import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Ensure useNavigate is imported
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Moon, Sun, User as UserIcon, CheckCircle, Edit } from 'lucide-react'; // Added CheckCircle and Edit icon
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ProfileDropdown } from '@/components/ProfileDropdown'; // NEW: Import ProfileDropdown
import PlanBadge from '@/components/PlanBadge';


const UsernamePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // Initialize useNavigate

  const [newUsername, setNewUsername] = useState('');
  const [usernameMessage, setUsernameMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debouncedUsername, setDebouncedUsername] = useState('');
  // New state: Tracks if username was just successfully set/updated in this session
  const [usernameUpdatedSuccessfully, setUsernameUpdatedSuccessfully] = useState(false);
  // New state: Controls if the username input is editable
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedUsername(newUsername);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [newUsername]);

  const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*, username') // Select 'username' explicitly if not covered by '*'
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw new Error('Failed to fetch profile.');
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Effect to initialize newUsername and check if already set
  useEffect(() => {
    if (profile) {
      if (profile.username) {
        setNewUsername(profile.username);
        // If a username already exists, consider it 'updated' for this component's session
        // This ensures the "Go to Dashboard" button appears if they already have a username.
        setUsernameUpdatedSuccessfully(true);
        setUsernameMessage({ type: 'success', text: 'Your username is already set.' }); // Inform user
        setIsEditingUsername(false); // Initially not editing if username is set
      } else {
        setNewUsername(''); // Clear username if none exists
        setUsernameUpdatedSuccessfully(false); // No username yet
        setUsernameMessage({ type: '', text: '' }); // Clear message
        setIsEditingUsername(true); // Allow editing if no username is set
      }
    }
  }, [profile]); // Depend on profile to run when it loads/changes

  const {
    data: isUsernameTaken,
    isLoading: isCheckingUsername,
    error: usernameCheckError
  } = useQuery({
    queryKey: ['checkUsernameAvailability', debouncedUsername],
    queryFn: async () => {
      // Only check if it's a new username and not empty
      if (!debouncedUsername.trim() || debouncedUsername.trim() === profile?.username) return false;
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', debouncedUsername)
        .limit(1);
      if (error) throw new Error('Failed to check username availability.');
      return data.length > 0;
    },
    enabled:
      !!debouncedUsername.trim() &&
      debouncedUsername.trim().length >= 3 &&
      /^[a-zA-Z0-9_]*$/.test(debouncedUsername.trim()) &&
      debouncedUsername.trim() !== profile?.username &&
      isEditingUsername, // Only check availability if in editing mode
  });

  useEffect(() => {
    // Only show availability messages if in editing mode
    if (!isEditingUsername) return;

    if (!newUsername.trim()) { // Use newUsername here, not debounced, for immediate feedback
      setUsernameMessage({ type: 'error', text: 'Username cannot be empty.' });
    } else if (newUsername.trim().length < 3) {
      setUsernameMessage({ type: 'error', text: 'Username must be at least 3 characters long.' });
    } else if (!/^[a-zA-Z0-9_]*$/.test(newUsername.trim())) {
      setUsernameMessage({ type: 'error', text: 'Username can only contain letters, numbers, and underscores.' });
    } else if (newUsername.trim() === profile?.username) {
      setUsernameMessage({ type: 'success', text: 'This is your current username.' }); // More descriptive message
    } else if (usernameCheckError) {
      setUsernameMessage({ type: 'error', text: usernameCheckError.message || 'Error checking username.' });
    } else if (isCheckingUsername) {
      setUsernameMessage({ type: '', text: 'Checking availability...' });
    }
    else if (isUsernameTaken === true) {
      setUsernameMessage({ type: 'error', text: 'This username is already taken.' });
    } else if (isUsernameTaken === false) {
      setUsernameMessage({ type: 'success', text: 'Username is available!' });
    } else {
      setUsernameMessage({ type: '', text: '' }); // Clear message for valid, available username
    }
  }, [isUsernameTaken, usernameCheckError, debouncedUsername, newUsername, profile?.username, isCheckingUsername, isEditingUsername]);

  const updateUsernameMutation = useMutation<any, Error, string>({
    mutationFn: async (username: string) => {
      if (!user?.id) throw new Error('User not authenticated.');
      const { data, error } = await supabase
        .from('profiles')
        .update({ username, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw new Error(error.message || 'Failed to update username.');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success('Username updated successfully!');
      setUsernameMessage({ type: 'success', text: 'Username updated successfully!' }); // Set success message
      setUsernameUpdatedSuccessfully(true); // Set the flag to true
      setIsEditingUsername(false); // Disable editing after successful update
    },
    onError: (error: Error) => {
      setUsernameMessage({ type: 'error', text: error.message || 'An unexpected error occurred.' });
      toast.error(error.message || 'Failed to update username.');
      setIsSubmitting(false); // Reset submitting state on error
    },
    onSettled: () => {
      setIsSubmitting(false); // Ensure submitting state is reset
    }
  });

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setNewUsername(value);
    setUsernameUpdatedSuccessfully(false); // Reset this flag if user starts typing again
  };

  const isButtonDisabled = () => {
    if (!isEditingUsername) return false; // If not in editing mode, the button's purpose changes (Go to Dashboard)

    const isInvalid = !newUsername.trim() ||
      newUsername.trim().length < 3 ||
      !/^[a-zA-Z0-9_]*$/.test(newUsername.trim()) ||
      newUsername.trim() === profile?.username; // Cannot update to the same username

    return (
      isProfileLoading ||
      isSubmitting ||
      isCheckingUsername ||
      isUsernameTaken || // If username is taken, button is disabled
      isInvalid
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // If not in editing mode, or if username is already successfully updated, the button should navigate
    if (!isEditingUsername || usernameUpdatedSuccessfully) {
      navigate('/all-set'); // Go to dashboard if already set or not in editing mode
      return;
    }

    // Otherwise, proceed with update
    setIsSubmitting(true);
    updateUsernameMutation.mutate(newUsername.trim());
  };

  // Helper to determine if we should show the "Go to Dashboard" button (or the confirmed username message)
  const shouldShowConfirmationAndGoToDashboard = () => {
    return !isProfileLoading && (profile?.username && !isEditingUsername);
  };

  const handleGoToDashboard = () => {
    navigate('/all-set'); // Direct navigation to dashboard
  };

  return (
    <div className="min-h-screen w-full bg-white dark:bg-gray-900">
    <header className="absolute top-0 left-0 right-0 z-50 bg-white/30 dark:bg-gray-900/30 
    backdrop-blur-md border-b border-purple-200/50 dark:border-purple-800/50 
    pt-[env(safe-area-inset-top)]">  
            <div className="container mx-auto px-4 lg:px-8 py-4 flex justify-between items-center max-w-7xl">
          <Link to="/all-set" className="flex items-center space-x-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="flex items-center space-x-3">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Medmacs Logo" className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">Update Username</span>
          </div>

          <div className="flex items-center space-x-3">
              <ProfileDropdown />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8 max-w-7xl mt-[calc(45px+env(safe-area-inset-top))] overscroll-y-contain">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            <UserIcon className="inline-block h-8 w-8 mr-2 text-purple-600 dark:text-purple-400" />
            Manage Your Username
          </h1>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Update your public username that will be displayed across the platform.
          </p>
        </div>

        <div className="flex justify-center">
          <Card className="w-full max-w-md bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800 animate-fade-in">
            <CardHeader className="text-center">
              <UserIcon className="h-12 w-12 mx-auto mb-4 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-gray-900 dark:text-white text-2xl mb-2">Change Username</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Enter your new desired username below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">
                    Current Username: {profile?.username || 'N/A'}
                  </Label>
                  {shouldShowConfirmationAndGoToDashboard() ? (
                    <div className="mt-2 flex items-center justify-between p-3 border rounded-md bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700">
                      <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                        <span className="text-green-800 dark:text-green-300 font-medium">
                          Your username is set to <strong className="font-bold">@{profile.username}</strong>.
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditingUsername(true);
                          setUsernameMessage({ type: '', text: '' }); // Clear message when entering edit mode
                        }}
                        className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                      >
                        <Edit className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </div>
                  ) : (
                    <Input
                      id="username"
                      type="text"
                      value={newUsername}
                      onChange={handleUsernameChange}
                      placeholder="Enter new username"
                      className="mt-2 w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      disabled={isProfileLoading || isSubmitting || !isEditingUsername} // Disable if not in editing mode
                    />
                  )}
                  {usernameMessage.text && isEditingUsername && ( // Only show message if editing
                    <p className={`text-sm mt-1 ${usernameMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {usernameMessage.text}
                    </p>
                  )}
                </div>
                {shouldShowConfirmationAndGoToDashboard() ? (
                  <Button
                    type="button"
                    onClick={handleGoToDashboard}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isButtonDisabled()}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Username'}
                  </Button>
                )}
              </form>
              {isProfileLoading && (
                <p className="text-gray-500 dark:text-gray-400 text-center mt-4">Loading profile...</p>
              )}
              {profileError && (
                <p className="text-red-500 text-center mt-4">{profileError.message}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg text-sm text-blue-800 dark:text-blue-200 max-w-4xl mx-auto mt-8">
          <div className="flex items-start space-x-2">
            <UserIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium mb-2">Important Information:</p>
              <ul className="space-y-1 text-xs">
                <li>• Your username must be unique.</li>
                <li>• It can only contain letters, numbers, and underscores.</li>
                <li>• It must be at least 3 characters long.</li>
                <li>• Changes to your username will be reflected immediately.</li>
                <li>• You can change your username at any time.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsernamePage;