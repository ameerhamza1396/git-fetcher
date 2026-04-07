import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Lock, Mail, ExternalLink, ShieldAlert, Send, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RestrictionDetails {
  user_restricted: boolean;
  reason: string | null;
  duration: string | null;
  reviewed: boolean;
  decision: boolean;
  appeal?: string | null;
}

interface BlockedUserOverlayProps {
  details: RestrictionDetails;
  onSignOut: () => void;
  userId?: string;
}

const BlockedUserOverlay: React.FC<BlockedUserOverlayProps> = ({ details, onSignOut, userId }) => {
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isInfinite = !details.duration;
  const unlockDate = details.duration ? new Date(details.duration) : null;
  const isExpired = unlockDate ? unlockDate < new Date() : false;
  const hasAlreadyAppealed = !!details.appeal;

  // If the restriction has expired, we should technically not show this overlay,
  // but the server-side should handle that. For UI safety:
  if (details.user_restricted === false || (details.duration && isExpired)) {
    return null;
  }

  const handleAppealSubmit = async () => {
    if (!appealText.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for your appeal.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Find user ID if not provided as prop
      let effectiveUserId = userId;
      if (!effectiveUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        effectiveUserId = user?.id;
      }

      if (!effectiveUserId) throw new Error("User ID not found");

      // Update the restriction_details object while preserving existing keys
      const updatedDetails = {
        ...details,
        appeal: appealText.trim()
      };

      const { error } = await supabase
        .from('profiles')
        .update({ restriction_details: updatedDetails })
        .eq('id', effectiveUserId);

      if (error) throw error;

      toast({
        title: "Appeal submitted!",
        description: "Our moderation team will review your case shortly.",
      });
      
      // We rely on the parent (UserRestrictionHandler) to re-fetch the data 
      // or we can reload the page to simplified logic
      window.location.reload(); 

    } catch (error: any) {
      console.error("Appeal error:", error);
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: "spring" }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-2xl border-destructive/50 bg-card/95 overflow-hidden relative">
          {/* Top Decorative bar */}
          <div className="h-2 w-full bg-destructive" />
          
          <CardHeader className="space-y-4 pt-10 text-center">
            <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
              <ShieldAlert className="w-12 h-12 text-destructive animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-extrabold tracking-tight text-destructive">
                Account Restricted
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Your access to Medmacs features has been temporarily suspended.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-8 pb-10">
            {/* Mascot Image (Sad/Serious) */}
            <div className="flex justify-center -my-4 h-48 pointer-events-none select-none">
              <img 
                src="/mascots/Mascot9.png" 
                alt="Restricted Mascot" 
                className="h-full object-contain filter grayscale-[0.5] opacity-80"
              />
            </div>

            {/* Restriction Info */}
            <div className="bg-muted/50 rounded-xl p-6 border border-border/50 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reason for restriction</span>
                <p className="text-lg font-medium italic">
                  "{details.reason || "Violating community guidelines or platform terms."}"
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration</span>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" />
                    {isInfinite ? "Permanent" : "Temporary"}
                  </p>
                </div>
                
                {!isInfinite && unlockDate && (
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Unlock Date</span>
                    <p className="text-sm font-semibold">
                      {format(unlockDate, "PPPP 'at' p")}
                    </p>
                  </div>
                )}
              </div>
              
              {details.reviewed && (
                <div className="pt-2">
                  <div className={`text-xs font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${details.decision ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${details.decision ? 'bg-green-500' : 'bg-orange-500'}`} />
                    Final Review Completed
                  </div>
                </div>
              )}
            </div>

            {/* Appeal Section */}
            <AnimatePresence mode="wait">
              {hasAlreadyAppealed ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl p-6 space-y-3"
                >
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold tracking-tight uppercase text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Appeal Submitted
                  </div>
                  <div className="flex items-start gap-2.5 text-blue-800 dark:text-blue-300">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">
                      Your appeal request has been received and is currently being processed by our moderation team.
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground pt-1 border-t border-blue-200/50 dark:border-blue-800/50">
                    Response time typically varies from 24 to 48 hours depending on queue volume. You will be notified once a decision is made.
                  </p>
                </motion.div>
              ) : showAppealForm ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-destructive font-bold uppercase text-xs">
                      <AlertCircle className="w-4 h-4" />
                      State your case for appeal
                    </div>
                    <Textarea 
                      placeholder="Explain why you believe this restriction should be lifted..."
                      className="min-h-[120px] bg-background border-border/50 focus:ring-destructive/30 resize-none pt-3"
                      value={appealText}
                      onChange={(e) => setAppealText(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowAppealForm(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          className="bg-destructive hover:bg-destructive/90 text-white gap-2"
                          disabled={isSubmitting || !appealText.trim()}
                        >
                          <Send className="w-4 h-4" />
                          Submit Appeal
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This appeal will be sent to our moderation team for a final review. 
                            <strong> Once submitted, the appeal cannot be edited or modified.</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Review Again</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleAppealSubmit}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Yes, Submit Appeal
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button 
                    className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-white"
                    onClick={() => setShowAppealForm(true)}
                  >
                    <Mail className="w-4 h-4" />
                    Appeal this decision
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full gap-2"
                    onClick={onSignOut}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              )}
            </AnimatePresence>
            
            <p className="text-[10px] text-center text-muted-foreground opacity-70 px-4">
              Medmacs maintains a safe learning environment. All appeals are final and handled manually by our team.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BlockedUserOverlay;
