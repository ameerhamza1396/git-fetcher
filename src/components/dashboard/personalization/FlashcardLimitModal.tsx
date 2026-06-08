import { Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type FlashcardLimitModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: string;
  limit?: number;
  onUpgrade: () => void;
};

const getLimitMessage = (plan: string, limit: number) => {
  if (plan === 'premium') {
    return `You have reached today's ${limit} flashcard fair-use limit. It refreshes tomorrow.`;
  }
  if (plan === 'iconic') {
    return `You have used all ${limit} Iconic flashcards for today. Upgrade to Premium to keep learning with the higher fair-use limit.`;
  }
  return `You have used your ${limit} free flashcards for today. Upgrade your plan to continue generating flashcards.`;
};

export const FlashcardLimitModal = ({ open, onOpenChange, plan = 'free', limit = 2, onUpgrade }: FlashcardLimitModalProps) => {
  const normalizedPlan = String(plan || 'free').toLowerCase();
  const isPremium = normalizedPlan === 'premium';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border-border/40 p-0">
        <DialogHeader className="bg-gradient-to-br from-amber-500/15 via-primary/10 to-cyan-500/10 px-5 py-5 text-left">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            {isPremium ? <Sparkles className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
          </div>
          <DialogTitle className="text-xl font-black uppercase italic tracking-tight">
            {isPremium ? 'Daily Limit Reached' : 'Upgrade To Continue'}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {getLimitMessage(normalizedPlan, limit)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-5">
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Current Plan</p>
            <p className="mt-1 text-sm font-black uppercase text-foreground">{normalizedPlan}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Free: 2/day · Iconic: 10/day · Premium: 500/day fair-use
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Not Now
            </Button>
            <Button className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-black text-white hover:from-amber-600 hover:to-orange-600" onClick={onUpgrade}>
              {isPremium ? 'View Plans' : 'Upgrade Plan'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
