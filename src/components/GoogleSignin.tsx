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
        <button
            type="button"
            onClick={handleSignIn}
            className="w-full flex items-center justify-center space-x-2 h-14 rounded-2xl border-2 border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all duration-300 font-bold text-xs uppercase tracking-widest"
        >
            <img src="/googlelogo.svg" alt="Google" className="w-4 h-4" />
            <span>{buttonText}</span>
        </button>
    );
};

export default GoogleSignin;
