import { useState } from 'react';
import { ArrowRight, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function DashboardReviewCard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<'prompt' | 'feedback'>('prompt');
  const [rating, setRating] = useState(0);

  const handleStarClick = (value: number) => {
    setRating(value);
    setStep('feedback');
  };

  return (
    <Card className="border-0 shadow-2xl bg-gradient-to-br from-[#0f172a] to-[#020617] rounded-[2rem] overflow-hidden mb-6 relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#2dd4bf]/10 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
      <CardContent className="p-6 relative z-10">
        {step === 'prompt' ? (
          <div className="text-center py-2">
            <h3 className="text-lg font-black text-white mb-2 italic">Enjoying Medmacs?</h3>
            <p className="text-white/50 text-xs mb-4">Tap to rate your experience!</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleStarClick(value)}
                  aria-label={`Rate ${value} out of 5`}
                  className="w-10 h-10 rounded-xl bg-white/5 hover:bg-[#2dd4bf]/20 transition-all active:scale-90 flex items-center justify-center border border-white/5 hover:border-[#2dd4bf]/30"
                >
                  <Star className={`w-5 h-5 ${value <= rating ? 'fill-[#2dd4bf] text-[#2dd4bf]' : 'text-white/20'}`} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-lg font-black text-white mb-2 italic">You're the Best! 🚀</h3>
            <p className="text-white/50 text-xs mb-4 leading-relaxed">Could you spare a moment to review us on Play Store?</p>
            <div className="flex flex-col gap-2">
              <a
                href="https://play.google.com/store/apps/details?id=com.hmacs.medmacs"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-[#2dd4bf] to-[#0ea5e9] text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-[#0ea5e9]/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Rate on Play Store <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={onComplete}
                className="w-full py-2 text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
              >
                I've already reviewed!
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
