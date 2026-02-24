// @/components/profiles/Password.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const Password = () => {
    const { user } = useAuth();

    const handleResetPassword = async () => {
        if (!user?.email) {
            toast.error("User email not found.");
            return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: `${window.location.origin}/auth/update-password`,
        });

        if (error) {
            toast.error(`Error sending password reset email: ${error.message}`);
        } else {
            toast.success("Password reset email sent successfully!", {
                description: "Please check your inbox to update your password.",
            });
        }
    };

    return (
        <div className="flex flex-col items-start gap-2">
            <h3 className="text-lg font-semibold">Password</h3>
            <p className="text-sm text-muted-foreground">
                Manage your password and security settings.
            </p>
            <Button
                variant="outline"
                className="mt-2"
                onClick={handleResetPassword}
            >
                Reset Password
            </Button>
        </div>
    );
};

export default Password;