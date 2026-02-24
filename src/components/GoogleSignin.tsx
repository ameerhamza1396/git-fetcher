import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Capacitor, registerPlugin } from "@capacitor/core";

// MUST match @CapacitorPlugin(name = "GoogleNativeAuth")
const GoogleNativeAuth = registerPlugin<any>("GoogleNativeAuth");

interface GoogleSigninProps {
    buttonText?: string;
}

const GoogleSignin: React.FC<GoogleSigninProps> = ({
    buttonText = "Sign up with Google",
}) => {
    const { toast } = useToast();
    const { signInWithGoogle, signInWithGoogleSupabase } = useAuth();
    const navigate = useNavigate();

    const handleSignIn = async () => {
        try {
            if (Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform()) {
                const result = await GoogleNativeAuth.signIn({
                    serverClientId:
                        "1072567800759-9gup2643t3svl9bbf5p9ic813n42h5fq.apps.googleusercontent.com",
                });

                if (result.idToken) {
                    const { error } = await signInWithGoogleSupabase(result.idToken);
                    if (error) throw error;
                    navigate("/dashboard");
                }
            } else {
                await signInWithGoogle();
                navigate("/dashboard");
            }
        } catch (err: any) {
            if (!err.message?.includes("12501")) {
                toast({
                    title: "Sign-in Error",
                    description: err.message || "Could not complete Google sign-in",
                    variant: "destructive",
                });
            }
            console.error(err);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            className="w-full bg-gray-100 dark:bg-gray-800"
            onClick={handleSignIn}
        >
            <div className="flex items-center space-x-2">
                <img src="/googlelogo.svg" alt="Google" className="w-4 h-4" />
                <span>{buttonText}</span>
            </div>
        </Button>
    );
};

export default GoogleSignin;
