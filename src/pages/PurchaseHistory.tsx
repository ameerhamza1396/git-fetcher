// @ts-nocheck
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Receipt, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';

const PurchaseHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchase-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen bg-background">
      <Seo title="Purchase History" description="View your purchase history" />
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-2xl border-b border-border/30 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Purchase History</h1>
        </div>
      </header>

      <div className="px-5 py-6 space-y-4">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Receipt className="w-6 h-6 animate-pulse text-muted-foreground" />
          </div>
        )}

        {!isLoading && (!purchases || purchases.length === 0) && (
          <div className="text-center py-16 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No purchases yet</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
              View Plans
            </Button>
          </div>
        )}

        {purchases?.map((p: any) => (
          <Card key={p.id} className="border border-border/40 bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.plan || 'Premium'} Plan</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary">Rs. {p.amount || '—'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PurchaseHistory;
