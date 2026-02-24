// @ts-nocheck
// rewritten file, with plan restrictions removed

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    Moon,
    Sun,
    ImageIcon,
    Loader2,
    UploadCloud,
    Pencil,
    Trash2,
    XCircle,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/useAuth';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const CLOUDINARY_CLOUD_NAME = 'dsrzawwej';
const CLOUDINARY_UPLOAD_PRESET = 'profiles_pictures';

const ProfileAvatar = ({ user, profileData, displayName, rawUserPlan, userPlanDisplayName, planColors, isHeader }) => {
    const queryClient = useQueryClient();
    const { theme, setTheme } = useTheme();

    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePictureError, setProfilePictureError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showAvatarEditDialog, setShowAvatarEditDialog] = useState(false);
    const [isAutoDeletingAvatar, setIsAutoDeletingAvatar] = useState(false);

    const userAvatarUrl = profileData?.avatar_url;

    // *** MODIFICATION: Removed plan restriction. Now always true. ***
    const canEditProfilePicture = true;

    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

    const handleFileChange = (e) => {
        setProfilePictureError('');
        setProfilePictureFile(null);

        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const maxSizeMB = 2;
            const maxSizeBytes = maxSizeMB * 1024 * 1024;

            if (!allowedTypes.includes(file.type)) {
                setProfilePictureError(`Invalid file type. Please upload a JPEG, PNG, or WEBP image.`);
                e.target.value = '';
                return;
            }

            if (file.size > maxSizeBytes) {
                setProfilePictureError(`File size exceeds ${maxSizeMB}MB limit.`);
                e.target.value = '';
                return;
            }

            setProfilePictureFile(file);
        }
    };

    const uploadFileToCloudinary = async (file) => {
        if (!file) return null;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                method: 'POST',
                body: formData,
            });

            // Retained the simulated progress bar
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 50));
                setUploadProgress(i);
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Failed to upload image to Cloudinary.');
            }

            const data = await response.json();
            setIsUploading(false);
            setUploadProgress(100);
            toast.success('Profile picture uploaded successfully!');
            return data.secure_url;
        } catch (uploadError) {
            console.error('Cloudinary Upload Error:', uploadError);
            setIsUploading(false);
            setUploadProgress(0);
            setProfilePictureError(`Upload failed: ${uploadError.message}`);
            toast.error(`Failed to upload profile picture: ${uploadError.message}`);
            return null;
        }
    };

    const updateAvatarUrlMutation = useMutation({
        mutationFn: async (newAvatarUrl) => {
            if (!user?.id) throw new Error('User not authenticated.');

            const { data, error } = await supabase
                .from('profiles')
                .update({ avatar_url: newAvatarUrl })
                .eq('id', user.id);

            if (error) throw error;
            return data as any;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
            setProfilePictureFile(null);
            setProfilePictureError('');
            setShowAvatarEditDialog(false);
        },
        onError: (err) => {
            toast.error(`Failed to update profile: ${err.message}`);
        },
    });

    const deleteAvatarMutation = useMutation({
        mutationFn: async () => {
            if (!user?.id) throw new Error('User not authenticated.');

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user.id);

            if (error) throw error;
        },
        onSuccess: (_data: any, _variables: any, context: any) => {
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
            if (!context?.isAutoDelete) {
                toast.success('Profile picture deleted successfully!');
            }
            setShowAvatarEditDialog(false);
        },
        onError: (err: any, _variables: any, context: any) => {
            if (!context?.isAutoDelete) {
                toast.error(`Failed to delete profile picture: ${err.message}`);
            } else {
                console.error("Auto-delete avatar failed:", err);
            }
        },
    });

    // *** MODIFICATION: Removed plan check from useEffect that performs auto-delete ***
    useEffect(() => {
        if (user && profileData && !deleteAvatarMutation.isPending && !isAutoDeletingAvatar) {
            const currentPlan = profileData.plan?.toLowerCase();
            // Original condition: ['free', 'iconic'].includes(currentPlan) && profileData.avatar_url
            // The purpose of this seems to be auto-deleting the avatar if the user is on a plan that *doesn't* support it.
            // Since we're removing all restrictions, this entire block should be removed or disabled to prevent accidental deletions.
            // However, based on the prompt to *only* remove restrictions on uploading/deleting, I will comment this out 
            // as it contradicts the goal of allowing avatars for all plans.

            /*
            if (['free', 'iconic'].includes(currentPlan) && profileData.avatar_url) {
                setIsAutoDeletingAvatar(true);
                deleteAvatarMutation.mutate(undefined, {
                    onSuccess: () => {
                        queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
                        setIsAutoDeletingAvatar(false);
                    },
                    onError: (error) => {
                        console.error("Auto-delete avatar failed:", error);
                        toast.error("Failed to remove unsupported profile picture.", {
                            description: error.message,
                        });
                        setIsAutoDeletingAvatar(false);
                    },
                    context: { isAutoDelete: true }
                });
            }
            */
        }
    }, [user, profileData, deleteAvatarMutation.mutate, queryClient, isAutoDeletingAvatar]);


    const handleSubmitProfilePicture = async (e) => {
        e.preventDefault();
        if (!profilePictureFile) {
            setProfilePictureError('Please select an image to upload.');
            return;
        }
        if (profilePictureError) {
            toast.error('Please fix the file upload error before saving.');
            return;
        }

        // *** MODIFICATION: Removed plan restriction check ***
        /* if (!canEditProfilePicture) {
            toast.error("Your current plan does not allow profile picture updates.");
            return;
        }
        */

        const uploadedUrl = await uploadFileToCloudinary(profilePictureFile);
        if (uploadedUrl) {
            updateAvatarUrlMutation.mutate(uploadedUrl);
        }
    };

    const handleDeleteAvatar = () => {
        // *** MODIFICATION: Removed plan restriction check ***
        /* if (!canEditProfilePicture) {
            toast.error("Your current plan does not allow profile picture deletion.");
            return;
        }
        */
        deleteAvatarMutation.mutate(undefined);
    };

    if (isAutoDeletingAvatar && !isHeader) {
        return (
            <div className="flex flex-col items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    Cleaning up unsupported avatar...
                </p>
            </div>
        );
    }

    return (
        <>
            {isHeader ? (
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
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={userAvatarUrl || undefined} alt={`${displayName.substring(0, 2).toUpperCase() || 'U'} avatar`} />
                        <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-sm">
                            {displayName.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                </div>
            ) : (
                <div
                    // *** MODIFICATION: Removed 'group-hover:grayscale' conditional class from the main avatar div's class name. 
                    // Since canEditProfilePicture is always true, the ternary '... : '' ' part is not needed, but for simplicity of diff, 
                    // I'll keep it (or rather, remove the `!canEditProfilePicture` check that triggers the greyscale).
                    className={`relative w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-blue-400 dark:border-blue-600 shadow-md mb-4 group`}
                >
                    <Avatar className="w-full h-full">
                        <AvatarImage
                            src={userAvatarUrl || undefined}
                            alt="Profile Avatar"
                            // *** MODIFICATION: Removed 'group-hover:grayscale' conditional class from AvatarImage. ***
                            className={`w-full h-full object-cover transition-all duration-300`}
                        />
                        <AvatarFallback
                            // *** MODIFICATION: Removed 'group-hover:grayscale' conditional class from AvatarFallback. ***
                            className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-5xl font-bold transition-all duration-300`}
                        >
                            {displayName.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

                    {/* *** MODIFICATION: Removed the plan restriction tooltip block completely. *** */}
                    {/* {!canEditProfilePicture && (
                        <div className={`
                            absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2
                            bg-gray-800 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg
                            whitespace-nowrap z-10
                            transition-opacity duration-300
                            opacity-0 invisible group-hover:opacity-100 group-hover:visible
                            pointer-events-none
                        `}>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-gray-800 dark:border-b-gray-700"></div>
                            Updating profile picture feature is not available on your current plan. Upgrade your plan to continue.
                        </div>
                    )}
                    */}

                    {/* *** MODIFICATION: The edit button is now always visible on hover (since canEditProfilePicture is always true). *** */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-1 right-1 bg-white/80 dark:bg-gray-700/80 rounded-full p-2 shadow-md hover:bg-white dark:hover:bg-gray-600 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        onClick={() => setShowAvatarEditDialog(true)}
                        aria-label="Edit profile picture"
                    >
                        <Pencil className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                    </Button>
                </div>
            )}

            {/* Profile Picture Edit Dialog */}
            <Dialog open={showAvatarEditDialog} onOpenChange={setShowAvatarEditDialog}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center">
                            <ImageIcon className="h-5 w-5 mr-2 text-blue-600" /> Edit Profile Picture
                        </DialogTitle>
                        <DialogDescription>
                            Upload a new profile picture or remove your current one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4 py-4">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-blue-300 dark:border-blue-700 shadow-sm">
                            <Avatar className="w-full h-full">
                                <AvatarImage
                                    src={userAvatarUrl || undefined}
                                    alt="Current Avatar"
                                    className="w-full h-full object-cover"
                                />
                                <AvatarFallback className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-3xl font-bold">
                                    {displayName.substring(0, 1).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        {userAvatarUrl && (
                            <Button
                                variant="destructive"
                                onClick={handleDeleteAvatar}
                                // *** MODIFICATION: Removed plan restriction check from disabled prop. ***
                                disabled={deleteAvatarMutation.isPending}
                                className="w-full max-w-xs"
                            >
                                {deleteAvatarMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="mr-2 h-4 w-4" />
                                )}
                                Delete Current Picture
                            </Button>
                        )}
                        <div className="w-full max-w-xs border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                            <Label htmlFor="dialogProfilePictureUpload" className="mb-2 block">Upload New Image (JPEG, PNG, WEBP, max 2MB)</Label>
                            <Input
                                id="dialogProfilePictureUpload"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileChange}
                                className="bg-gray-50 dark:bg-gray-700 file:text-blue-600 dark:file:text-blue-400"
                            // *** MODIFICATION: Removed plan restriction check from disabled prop. ***
                            // disabled={!canEditProfilePicture} 
                            />
                            {profilePictureFile && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Selected: {profilePictureFile.name} ({(profilePictureFile.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                            )}
                            {profilePictureError && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <XCircle className="h-4 w-4 mr-1" /> {profilePictureError}
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            onClick={handleSubmitProfilePicture}
                            // *** MODIFICATION: Removed plan restriction check from disabled prop. ***
                            disabled={isUploading || updateAvatarUrlMutation.isPending || !profilePictureFile || !!profilePictureError}
                        >
                            {isUploading || updateAvatarUrlMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            {isUploading ? `Uploading (${uploadProgress.toFixed(0)}%)` : 'Save New Picture'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ProfileAvatar;