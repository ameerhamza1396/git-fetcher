import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CollaborateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CollaborateModal = ({ open, onOpenChange }: CollaborateModalProps) => {
  const openCollaboratePage = () => {
    window.open('https://medmacs.app/collaborate', '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border border-white/20 rounded-[2rem] bg-white/10 dark:bg-slate-950/50 backdrop-blur-2xl shadow-2xl [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="sr-only">Why Medmacs</DialogTitle>
          <DialogDescription className="sr-only">
            Learn why students collaborate with Medmacs and visit the collaboration page.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/45 via-slate-950/80 to-cyan-500/35" />
          <div className="absolute inset-0 bg-white/[0.06]" />
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-20 w-9 h-9 rounded-full bg-white/12 border border-white/15 flex items-center justify-center active:scale-95 transition-all"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="relative z-10 px-6 pt-7 pb-6">
            <div className="flex items-end justify-between gap-3 mb-5">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200 mb-2">
                  Collaborate
                </p>
                <h2 className="text-3xl font-black leading-none tracking-tight">
                  Why Medmacs?
                </h2>
              </div>
              <img
                src="/mascots/Mascot3.png"
                alt="Medmacs mascot"
                className="w-28 h-28 object-contain drop-shadow-2xl shrink-0"
              />
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-4 mb-5 shadow-xl">
              <p className="text-sm leading-6 text-white/82">
                Medmacs is built around students who want better study tools, sharper medical learning, and a community that actually moves fast. Collaborators help shape campaigns, campus presence, content ideas, and the next student-first features inside the app.
              </p>
            </div>

            <Button
              onClick={openCollaboratePage}
              className="w-full py-3.5 rounded-2xl bg-white text-slate-950 font-black text-xs uppercase tracking-widest shadow-lg shadow-black/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              Visit Collaborate
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

