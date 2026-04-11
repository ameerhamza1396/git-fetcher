// @ts-nocheck
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ShoppingBag, CheckCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Seo from '@/components/Seo';
import { useState, useEffect, useRef } from 'react';

const PurchaseHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const lastScrollY = useRef(0);
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setHeaderVisible(currentScrollY < lastScrollY.current || currentScrollY < 10);
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['purchase-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('pending_payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'success')
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: !!user?.id,
  });

  const isExpired = (p: any) => {
    if (!p.created_at || !p.validity) return false;
    const created = new Date(p.created_at);
    const days = p.validity?.toLowerCase() === 'yearly' ? 365 : 30;
    const expiry = new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
    return new Date() > expiry;
  };

  const getExpiryDate = (p: any) => {
    if (!p.created_at || !p.validity) return null;
    const created = new Date(p.created_at);
    const days = p.validity?.toLowerCase() === 'yearly' ? 365 : 30;
    return new Date(created.getTime() + days * 24 * 60 * 60 * 1000);
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] dark:bg-gray-950">
      <Seo title="Purchase History" description="View your purchase history" />

      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ${headerVisible ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-7xl">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="w-9 h-9 p-0 hover:scale-110">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Logo" className="w-7 h-7" />
            <span className="text-lg font-black">Purchase History</span>
          </div>
          <div className="w-9" />
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-xl mt-[var(--header-height)]">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-foreground uppercase tracking-tight italic">
            Your <span className="text-blue-600">Purchases</span>
          </h1>
          <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">Payment history & receipts</p>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <img src="/lovable-uploads/bf69a7f7-550a-45a1-8808-a02fb889f8c5.png" alt="Loading" className="w-16 h-16 object-contain animate-pulse" />
          </div>
        )}

        {!isLoading && (!purchases || purchases.length === 0) && (
          <div className="text-center py-16 space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 rounded-full" />
              <div className="relative bg-gradient-to-br from-slate-500 to-slate-600 p-5 rounded-3xl shadow-xl">
                <ShoppingBag className="w-10 h-10 text-white" />
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-medium">No purchases yet</p>
            <Button onClick={() => navigate('/pricing')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl h-11 px-8 font-black uppercase text-xs tracking-widest">
              View Plans
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {purchases?.map((p: any) => {
            const expired = isExpired(p);
            const expiry = getExpiryDate(p);
            const durationType = p.validity?.toLowerCase() === 'yearly' ? 'Yearly' : 'Monthly';
            
            return (
              <div key={p.id} className={`relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${expired ? 'from-slate-500 via-slate-600 to-slate-700' : 'from-blue-600 via-indigo-600 to-violet-700'} text-white shadow-xl p-4`}>
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.3) 15px, rgba(255,255,255,0.3) 30px)`,
                  maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
                }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight">{p.plan_name || p.plan || 'Premium'} Plan</p>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black">Rs. {p.amount || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className="bg-white/20 text-white border-white/20 text-[9px] font-bold uppercase tracking-widest">
                      {durationType}
                    </Badge>
                    {expired ? (
                      <Badge className="bg-red-500/30 text-red-100 border-red-300/30 text-[9px] font-bold uppercase tracking-widest">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Expired
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-300/30 text-[9px] font-bold uppercase tracking-widest">
                        <CheckCircle className="w-3 h-3 mr-1" /> Active
                      </Badge>
                    )}
                  </div>
                  {expiry && (
                    <p className="text-[10px] text-white/50 mt-1.5">
                      {expired ? 'Expired' : 'Expires'}: {expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default PurchaseHistory;