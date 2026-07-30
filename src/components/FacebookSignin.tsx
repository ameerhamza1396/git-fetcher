import React from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FacebookSigninProps {
  buttonText?: string;
}

const FacebookSignin: React.FC<FacebookSigninProps> = ({
  buttonText = "Sign in with Facebook",
}) => {
  const { toast } = useToast();
  const { signInWithFacebook } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async () => {
    try {
      const { error } = await signInWithFacebook();
      if (error) throw error;
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        title: "Sign-in Error",
        description: err.message || "Could not complete Facebook sign-in",
        variant: "destructive",
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      className="flex h-14 w-full items-center justify-center space-x-2 rounded-2xl border border-slate-200 bg-white text-xs font-bold uppercase tracking-widest text-slate-700 shadow-sm transition-all duration-300 hover:border-[#1877f2]/30 hover:bg-slate-50"
    >
      <img src="/facebook.svg" alt="Facebook" className="h-5 w-5" />
      <span>{buttonText}</span>
    </button>
  );
};

export default FacebookSignin;
