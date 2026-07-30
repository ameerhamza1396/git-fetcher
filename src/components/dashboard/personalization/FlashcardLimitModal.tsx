import { Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type AiLimitPeriod = 'daily' | 'weekly' | 'monthly';
export type AiLimitKind = 'free' | 'plan';

type FlashcardLimitModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: string;
  limit?: number;
  period?: AiLimitPeriod;
  limitKind?: AiLimitKind;
  featureLabel?: string;
  onUpgrade: () => void;
};

export const getAiLimitDetails = (error: any, fallbackPlan = 'free', fallbackLimit = 2) => {
  const payload = error?.payload || {};
  const text = `${error?.code || ''} ${error?.message || ''} ${payload.limit_type || ''} ${payload.period || ''}`.toLowerCase();
  const period: AiLimitPeriod = text.includes('monthly') ? 'monthly' : text.includes('weekly') ? 'weekly' : 'daily';
  const plan = String(payload.plan || payload.current_plan || fallbackPlan || 'free').toLowerCase();
  const limit = Number(payload.limit || payload.allowed || payload.max || fallbackLimit);
  const limitKind: AiLimitKind = plan === 'free' || text.includes('free') ? 'free' : 'plan';

  return { plan, limit, period, limitKind };
};

export const isAiLimitError = (error: any) => {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  return error?.status === 429 || text.includes('quota') || text.includes('rate limit') || text.includes('limit reached') || text.includes('limit exceeded');
};

const getLimitMessage = (plan: string, limit: number, period: AiLimitPeriod, limitKind: AiLimitKind, featureLabel: string) => {
  const allowance = limitKind === 'free' ? 'free limit' : `allowed limit on your ${plan} plan`;
  const limitText = Number.isFinite(limit) && limit > 0 ? ` of ${limit}` : '';
  return `Your ${period} AI ${allowance}${limitText} has been reached for ${featureLabel}. Upgrade your plan to continue now, or continue using the free experience where available.`;
};

export const FlashcardLimitModal = ({
  open,
  onOpenChange,
  plan = 'free',
  limit = 2,
  period = 'daily',
  limitKind,
  featureLabel = 'this AI feature',
  onUpgrade,
}: FlashcardLimitModalProps) => {
  const normalizedPlan = String(plan || 'free').toLowerCase();
  const normalizedKind = limitKind || (normalizedPlan === 'free' ? 'free' : 'plan');
  const title = `${period.charAt(0).toUpperCase()}${period.slice(1)} AI Limit Reached`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-3xl border-border/40 p-0">
        <DialogHeader className="bg-gradient-to-br from-amber-500/15 via-primary/10 to-cyan-500/10 px-5 py-5 text-left">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            {normalizedKind === 'plan' ? <Sparkles className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
          </div>
          <DialogTitle className="text-xl font-black uppercase italic tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {getLimitMessage(normalizedPlan, limit, period, normalizedKind, featureLabel)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-5">
          <div className="rounded-2xl bg-muted/60 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Current Plan</p>
            <p className="mt-1 text-sm font-black uppercase text-foreground">{normalizedPlan}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {normalizedKind === 'free'
                ? `Free ${period} limit reached.`
                : `${normalizedPlan} plan ${period} allowance reached.`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 font-black text-white hover:from-amber-600 hover:to-orange-600" onClick={onUpgrade}>
              Upgrade
            </Button>
            <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => onOpenChange(false)}>
              Continue Using Free
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
