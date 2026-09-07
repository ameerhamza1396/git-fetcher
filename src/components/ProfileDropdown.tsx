import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCachedImage } from '@/hooks/useCachedImage';

export const ProfileDropdown = () => {
    const { user } = useAuth();
    const location = useLocation();

    const { data: profile } = useQuery({
        queryKey: ['profileDropdownProfile', user?.id],
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url')
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile for dropdown:', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id,
        staleTime: 5 * 60 * 1000,
    });

    const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
    const cachedAvatarUrl = useCachedImage(profile?.avatar_url);

    const isFlpPage = location.pathname.includes('flp') || location.pathname.startsWith('/results/flp');

    const avatarContent = (
        <Avatar className="w-full h-full">
            <AvatarImage src={cachedAvatarUrl || undefined} alt={`${displayName} avatar`} />
            <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm">
                {displayName.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
        </Avatar>
    );

    if (isFlpPage) {
        return (
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                {avatarContent}
            </div>
        );
    }

    return (
        <Link
            to="/profile"
            className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-200 overflow-hidden shrink-0"
        >
            {avatarContent}
        </Link>
    );
};
