import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
    User,
    Settings,
    Lock,
    Crown,
    Gift,
    LogOut,
    Mail,
    Megaphone // Added Megaphone icon for News and Announcements
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const ProfileDropdown = () => {
    const { user, signOut } = useAuth();

    // Fetch user profile data to get avatar_url and full_name/username
    const { data: profile } = useQuery({
        queryKey: ['profileDropdownProfile', user?.id], // Unique key for this component's fetch
        queryFn: async () => {
            if (!user?.id) return null;
            const { data, error } = await supabase
                .from('profiles')
                .select('full_name, username, avatar_url') // Select necessary fields
                .eq('id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile for dropdown:', error);
                return null;
            }
            return data;
        },
        enabled: !!user?.id, // Only fetch if user is logged in
        staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    });

    // Robust displayName logic
    const displayName = profile?.full_name || profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

    const handleLogout = async () => {
        await signOut();
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {/* Replaced custom avatar div with Avatar component */}
                <Button
                    variant="ghost"
                    className="w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform duration-200 p-0 overflow-hidden"
                >
                    <Avatar className="w-full h-full"> {/* Avatar takes full size of the button */}
                        <AvatarImage src={profile?.avatar_url || undefined} alt={`${displayName} avatar`} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm">
                            {displayName.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                            {displayName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user?.email}
                        </p>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                    <Link
                        to="/profile"
                        className="flex items-center cursor-pointer"
                    >
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile Settings</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        to="/profile/password"
                        className="flex items-center cursor-pointer"
                    >
                        <Lock className="mr-2 h-4 w-4" />
                        <span>Change Password</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        to="/pricing" 
                        className="flex items-center cursor-pointer"
                    >
                        <Crown className="mr-2 h-4 w-4" />
                        <span>Upgrade Plan</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        to="/redeem" 
                        className="flex items-center cursor-pointer"
                    >
                        <Gift className="mr-2 h-4 w-4" />
                        <span>Redeem</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* NEW: News and Announcements option */}
                <DropdownMenuItem asChild>
                    <Link
                        to="/announcements"
                        className="flex items-center cursor-pointer"
                    >
                        <Megaphone className="mr-2 h-4 w-4" />
                        <span>News & Announcements</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        to="/contact-us"
                        className="flex items-center cursor-pointer"
                    >
                        <Mail className="mr-2 h-4 w-4" />
                        <span>Contact Us</span>
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600 cursor-pointer"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};