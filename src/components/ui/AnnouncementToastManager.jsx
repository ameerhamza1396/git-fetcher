import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner'; // Assuming you have sonner for toasts
import { useNavigate } from 'react-router-dom'; // For navigation on toast click
import { BellRing } from 'lucide-react'; // Icon for the toast

// Define a constant for the localStorage key
const LAST_SEEN_ANNOUNCEMENT_KEY = 'last_seen_announcement_id';

const AnnouncementToastManager = () => {
    const navigate = useNavigate();

    // Fetch the latest published announcement
    const { data: latestAnnouncement, isLoading, isError, error } = useQuery({
        queryKey: ['latestAnnouncement'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('announcements')
                .select('id, title, content, created_at')
                .eq('is_published', true) // Only consider published announcements
                .order('created_at', { ascending: false }) // Get the latest one
                .limit(1)
                .single(); // Expect only one result

            if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
                console.error('Error fetching latest announcement:', error);
                throw new Error('Failed to fetch latest announcement.');
            }
            return data;
        },
        // Only refetch every minute to avoid excessive database calls
        refetchInterval: 60000, // 1 minute
        staleTime: 30000, // Data considered fresh for 30 seconds
    });

    useEffect(() => {
        if (!isLoading && !isError && latestAnnouncement) {
            const lastSeenAnnouncementId = localStorage.getItem(LAST_SEEN_ANNOUNCEMENT_KEY);

            // If there's a new latest announcement that hasn't been seen before
            if (latestAnnouncement.id !== lastSeenAnnouncementId) {
                toast.info(
                    <div className="flex items-center">
                        <BellRing className="h-5 w-5 mr-3 text-blue-500" />
                        <div>
                            <p className="font-semibold text-gray-900 dark:text-white">New Announcement!</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">{latestAnnouncement.title}</p>
                        </div>
                    </div>,
                    {
                        duration: 7000, // Show toast for 7 seconds
                        action: {
                            label: 'View',
                            onClick: () => {
                                navigate('/announcements');
                                // Mark as seen immediately after clicking "View"
                                localStorage.setItem(LAST_SEEN_ANNOUNCEMENT_KEY, latestAnnouncement.id);
                            },
                        },
                        onDismiss: () => {
                            // Mark as seen if the user dismisses the toast
                            localStorage.setItem(LAST_SEEN_ANNOUNCEMENT_KEY, latestAnnouncement.id);
                        },
                        onAutoClose: () => {
                            // Mark as seen if the toast auto-closes
                            localStorage.setItem(LAST_SEEN_ANNOUNCEMENT_KEY, latestAnnouncement.id);
                        },
                        // Custom styling for the toast
                        className: "bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 shadow-lg",
                        descriptionClassName: "text-gray-600 dark:text-gray-400",
                        actionButtonClassName: "bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-600",
                    }
                );
            }
        }
    }, [latestAnnouncement, isLoading, isError, navigate]); // Dependencies for useEffect

    // This component doesn't render any UI directly, it just manages the toast
    return null;
};

export default AnnouncementToastManager;
