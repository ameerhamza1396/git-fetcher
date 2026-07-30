import React, { useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Loader2 } from "lucide-react";

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
    const [isSigningIn, setIsSigningIn] = useState(false);
    const signInActiveRef = useRef(false);

    const handleSignIn = async () => {
        if (signInActiveRef.current) return;
        signInActiveRef.current = true;
        setIsSigningIn(true);

        try {
            if (Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform()) {
                const result = await GoogleNativeAuth.signIn({
                    serverClientId:
                        "1072567800759-9gup2643t3svl9bbf5p9ic813n42h5fq.apps.googleusercontent.com",
                });

                if (result.idToken) {
                    const { error } = await signInWithGoogleSupabase(result.idToken);
                    if (error) throw error;
                    navigate("/dashboard", { replace: true });
                }
            } else {
                const { error } = await signInWithGoogle();
                if (error) throw error;
                navigate("/dashboard", { replace: true });
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
        } finally {
            signInActiveRef.current = false;
            setIsSigningIn(false);
        }
    };

    return (
        <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            aria-busy={isSigningIn}
            className="flex h-14 w-full items-center justify-center space-x-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-700 shadow-sm transition-all duration-300 hover:border-[#0ea5e9]/30 hover:bg-slate-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isSigningIn ? (
                <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Signing in...</span>
                </>
            ) : (
                <>
                    <img src="/googlelogo.svg" alt="" aria-hidden="true" className="h-4 w-4" />
                    <span>{buttonText}</span>
                </>
            )}
        </button>
    );
};

export default GoogleSignin;
