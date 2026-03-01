// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
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
    ZoomIn,
    ZoomOut,
    RotateCw,
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
import { Slider } from '@/components/ui/slider';
import Cropper from 'react-easy-crop';

const CLOUDINARY_CLOUD_NAME = 'dsrzawwej';
const CLOUDINARY_UPLOAD_PRESET = 'profiles_pictures';

// Helper to create a cropped image blob from canvas
const createCroppedImage = async (imageSrc: string, pixelCrop: any): Promise<Blob> => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;

    await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            },
            'image/jpeg',
            0.92
        );
    });
};

const ProfileAvatar = ({ user, profileData, displayName, rawUserPlan, userPlanDisplayName, planColors, isHeader }) => {
    const queryClient = useQueryClient();
    const { theme, setTheme } = useTheme();

    const [profilePictureFile, setProfilePictureFile] = useState(null);
    const [profilePictureError, setProfilePictureError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showAvatarEditDialog, setShowAvatarEditDialog] = useState(false);

    // Cropper state
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const userAvatarUrl = profileData?.avatar_url;
    const currentPlanColorClasses = planColors[rawUserPlan] || planColors['default'];

    const onCropComplete = useCallback((_croppedArea: any, croppedPixels: any) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    const handleFileChange = (e) => {
        setProfilePictureError('');
        setProfilePictureFile(null);
        setImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);

        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
            const maxSizeMB = 2;
            const maxSizeBytes = maxSizeMB * 1024 * 1024;

            if (!allowedTypes.includes(file.type)) {
                setProfilePictureError('Invalid file type. Please upload a JPEG, PNG, or WEBP image.');
                e.target.value = '';
                return;
            }

            if (file.size > maxSizeBytes) {
                setProfilePictureError(`File size exceeds ${maxSizeMB}MB limit.`);
                e.target.value = '';
                return;
            }

            setProfilePictureFile(file);

            // Read file for cropper
            const reader = new FileReader();
            reader.onload = () => {
                setImageSrc(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadFileToCloudinary = async (fileOrBlob: File | Blob) => {
        if (!fileOrBlob) return null;

        const formData = new FormData();
        formData.append('file', fileOrBlob);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
                method: 'POST',
                body: formData,
            });

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
            queryClient.invalidateQueries({ queryKey: ['profileDropdownProfile', user.id] });
            resetDialogState();
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
            queryClient.invalidateQueries({ queryKey: ['profileDropdownProfile', user.id] });
            toast.success('Profile picture deleted successfully!');
            resetDialogState();
        },
        onError: (err) => {
            toast.error(`Failed to delete profile picture: ${err.message}`);
        },
    });

    const resetDialogState = () => {
        setShowAvatarEditDialog(false);
        setProfilePictureFile(null);
        setProfilePictureError('');
        setImageSrc(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setCroppedAreaPixels(null);
    };

    const handleSubmitProfilePicture = async (e) => {
        e.preventDefault();
        if (!imageSrc || !croppedAreaPixels) {
            setProfilePictureError('Please select and crop an image.');
            return;
        }
        if (profilePictureError) {
            toast.error('Please fix the file upload error before saving.');
            return;
        }

        try {
            const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);
            const uploadedUrl = await uploadFileToCloudinary(croppedBlob);
            if (uploadedUrl) {
                updateAvatarUrlMutation.mutate(uploadedUrl);
            }
        } catch (err) {
            console.error('Crop error:', err);
            toast.error('Failed to crop image. Please try again.');
        }
    };

    const handleDeleteAvatar = () => {
        deleteAvatarMutation.mutate(undefined);
    };

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
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-[3px] border-white/30 shadow-lg group cursor-pointer" onClick={() => setShowAvatarEditDialog(true)}>
                    <Avatar className="w-full h-full">
                        <AvatarImage src={userAvatarUrl || undefined} alt="Profile Avatar" className="w-full h-full object-cover transition-all duration-300" />
                        <AvatarFallback className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-2xl font-bold">
                            {displayName.substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Pencil className="h-5 w-5 text-white" />
                    </div>
                </div>
            )}

            {/* Profile Picture Edit Dialog — Overhauled */}
            <Dialog open={showAvatarEditDialog} onOpenChange={(open) => { if (!open) resetDialogState(); else setShowAvatarEditDialog(true); }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5 text-primary" /> Edit Profile Picture
                        </DialogTitle>
                        <DialogDescription>
                            Upload and crop your photo to a perfect square.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col items-center gap-4 py-2">
                        {/* Current avatar — large preview */}
                        {!imageSrc && (
                            <div className="relative w-48 h-48 rounded-2xl overflow-hidden border-2 border-border shadow-md bg-muted">
                                <Avatar className="w-full h-full rounded-none">
                                    <AvatarImage src={userAvatarUrl || undefined} alt="Current Avatar" className="w-full h-full object-cover" />
                                    <AvatarFallback className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white text-6xl font-bold rounded-none">
                                        {displayName.substring(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        )}

                        {/* 1:1 Cropper */}
                        {imageSrc && (
                            <div className="w-full flex flex-col gap-3">
                                <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
                                    <Cropper
                                        image={imageSrc}
                                        crop={crop}
                                        zoom={zoom}
                                        rotation={rotation}
                                        aspect={1}
                                        cropShape="round"
                                        showGrid={false}
                                        onCropChange={setCrop}
                                        onZoomChange={setZoom}
                                        onRotationChange={setRotation}
                                        onCropComplete={onCropComplete}
                                    />
                                </div>
                                {/* Zoom & Rotate controls */}
                                <div className="flex items-center gap-3 px-1">
                                    <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Slider
                                        value={[zoom]}
                                        min={1}
                                        max={3}
                                        step={0.05}
                                        onValueChange={(val) => setZoom(val[0])}
                                        className="flex-1"
                                    />
                                    <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setRotation((r) => (r + 90) % 360)}>
                                        <RotateCw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* File picker + Delete row */}
                        <div className="w-full space-y-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="dialogProfilePictureUpload" className="sr-only">Upload image</Label>
                                <Input
                                    id="dialogProfilePictureUpload"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={handleFileChange}
                                    className="flex-1 text-xs file:text-xs bg-muted/50 border-border"
                                />
                                {userAvatarUrl && !imageSrc && (
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={handleDeleteAvatar}
                                        disabled={deleteAvatarMutation.isPending}
                                        className="h-9 w-9 shrink-0"
                                        title="Delete current picture"
                                    >
                                        {deleteAvatarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    </Button>
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">JPEG, PNG or WEBP · Max 2 MB</p>

                            {profilePictureFile && !profilePictureError && (
                                <p className="text-xs text-muted-foreground">
                                    Selected: {profilePictureFile.name} ({(profilePictureFile.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                            )}
                            {profilePictureError && (
                                <p className="text-destructive text-xs flex items-center gap-1">
                                    <XCircle className="h-3.5 w-3.5" /> {profilePictureError}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button variant="outline" size="sm">Cancel</Button>
                        </DialogClose>
                        <Button
                            size="sm"
                            onClick={handleSubmitProfilePicture}
                            disabled={isUploading || updateAvatarUrlMutation.isPending || !imageSrc || !croppedAreaPixels || !!profilePictureError}
                        >
                            {isUploading || updateAvatarUrlMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <UploadCloud className="mr-2 h-4 w-4" />
                            )}
                            {isUploading ? `Uploading ${uploadProgress.toFixed(0)}%` : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ProfileAvatar;
