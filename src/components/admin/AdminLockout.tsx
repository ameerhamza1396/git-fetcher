import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';

// This component wraps content that requires admin access and PIN verification.
// It handles:
// 1. Checking if the user is logged in.
// 2. Checking if the logged-in user has the 'admin' role.
// 3. Prompting for a PIN if the user is an admin but hasn't verified their PIN recently.
// 4. Storing PIN verification status in local storage for an indefinite period.
// It renders its children only if all access requirements are met.
export default function AdminLockout({ children }) {
  const { user, isLoading: isUserLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // To check for the 'auth=true' query parameter

  const [enteredPin, setEnteredPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const [accessAttempted, setAccessAttempted] = useState(false);

  // Effect to check for local storage PIN session or URL parameter on component mount
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const authFromParam = queryParams.get('auth');

    if (authFromParam === 'true') {
      // If 'auth=true' is in the URL, consider it verified for this session
      setPinVerified(true);
      // Set a timestamp as if they entered the PIN, but it won't expire based on time here
      localStorage.setItem('adminPinVerifiedTimestamp', Date.now().toString());
      // Clean the URL to remove the sensitive 'auth=true' parameter
      navigate(location.pathname, { replace: true });
      return;
    }

    // Check local storage for a valid PIN session if not authenticated via URL
    const storedTimestamp = localStorage.getItem('adminPinVerifiedTimestamp');
    if (storedTimestamp) {
      // If a timestamp exists, it means the PIN was previously verified
      // and we now grant access indefinitely (until the item is removed)
      setPinVerified(true);
      console.log('Access granted from local storage (indefinite session).');
    }
  }, [location.search, location.pathname, navigate]);

  // Fetch user profile data (only role needed)
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('role') // Only select role
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id // Only run if user ID is available
  });

  // Fetch admin PIN from Supabase `app_settings` table
  const { data: adminSettings, isLoading: isAdminSettingsLoading } = useQuery({
    queryKey: ['admin_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_name', 'admin_pin')
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin PIN:', error);
        return null;
      }
      return data?.setting_value;
    }
  });

  // Handle PIN verification when the button is clicked or Enter is pressed
  const handlePinVerification = () => {
    setAccessAttempted(true);
    if (enteredPin === adminSettings) {
      setPinVerified(true);
      setPinError('');
      // Store timestamp in local storage for indefinite session
      localStorage.setItem('adminPinVerifiedTimestamp', Date.now().toString());
    } else {
      setPinError('Invalid PIN. Please try again.');
    }
  };

  // --- Loading State ---
  if (isUserLoading || isProfileLoading || isAdminSettingsLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        Loading access permissions...
      </div>
    );
  }

  // --- Access Denied: Not Logged In ---
  if (!user) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You must be logged in to access this page.</p>
        <Link to="/" className="text-blue-500 hover:underline">Go to Home</Link>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  // --- Access Denied: Not Admin Role ---
  if (!isAdmin) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-red-500 dark:text-red-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-lg mb-4">You do not have administrative privileges to view this page.</p>
        <Link to="/dashboard" className="text-blue-500 hover:underline">Go to Dashboard</Link>
      </div>
    );
  }

  // --- PIN Required for Admin ---
  if (isAdmin && !pinVerified) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-4 text-center">
        <Lock className="w-16 h-16 text-purple-600 dark:text-purple-400 mb-4" />
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p className="text-lg mb-4">Please enter the 4-digit PIN to access the admin panel.</p>
        <div className="flex flex-col items-center space-y-4">
          <input
            type="password"
            maxLength={4}
            value={enteredPin}
            onChange={(e) => setEnteredPin(e.target.value)}
            className="w-32 p-2 text-center border border-gray-300 dark:border-gray-600 rounded-md text-xl tracking-widest bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="****"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handlePinVerification();
              }
            }}
          />
          {pinError && <p className="text-red-500 text-sm mt-2">{pinError}</p>}
          <button
            onClick={handlePinVerification}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
          >
            Verify PIN
          </button>
          {!accessAttempted && <p className="text-xs text-gray-500 dark:text-gray-400">PIN is typically configured in Supabase 'app_settings' table.</p>}
        </div>
      </div>
    );
  }

  // --- Access Granted: Render children ---
  return <>{children}</>;
}
