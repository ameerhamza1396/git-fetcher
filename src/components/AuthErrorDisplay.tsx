// src/components/AuthErrorDisplay.tsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription } from '@/components/ui/card';

const AuthErrorDisplay = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const errorCode = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (errorCode && errorDescription) {
      // Decode the URL-encoded string and format the message
      const decodedError = decodeURIComponent(errorDescription.replace(/\+/g, ' '));

      // Show a toast notification
      toast({
        title: "Authentication Error",
        description: decodedError,
        variant: "destructive",
      });
      
      // Optionally, you can clear the URL parameters after displaying the toast
      // This prevents the error message from reappearing on refresh
      // const newSearchParams = new URLSearchParams(searchParams);
      // newSearchParams.delete('error');
      // newSearchParams.delete('error_code');
      // newSearchParams.delete('error_description');
      // window.history.replaceState(null, '', `?${newSearchParams.toString()}`);
    }
  }, [searchParams, toast]);

  // This component doesn't need to render anything itself, as the toast handles the display.
  // However, you could return JSX here if you wanted a persistent on-page message.
  return null;
};

export default AuthErrorDisplay;