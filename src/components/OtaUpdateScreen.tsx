import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, DownloadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  dismissOtaUpdateScreen,
  subscribeToOtaUpdates,
  type OtaUpdateState,
} from '@/services/otaUpdateService';

const activePhases = new Set(['downloading', 'preparing', 'ready', 'error']);

const OtaUpdateScreen = () => {
  const [state, setState] = useState<OtaUpdateState>({ phase: 'idle', progress: 0 });

  useEffect(() => subscribeToOtaUpdates(setState), []);

  if (!activePhases.has(state.phase)) return null;

  const isReady = state.phase === 'ready';
  const isError = state.phase === 'error';
  const isPreparing = state.phase === 'preparing';
  const progress = Math.max(0, Math.min(100, state.progress));

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.26),_transparent_36%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_34%)]" />
      <div className="relative w-full max-w-sm text-center space-y-7">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white/10 border border-white/15 shadow-2xl">
          {isReady ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-300" />
          ) : isError ? (
            <AlertCircle className="h-12 w-12 text-amber-300" />
          ) : isPreparing ? (
            <Loader2 className="h-12 w-12 animate-spin text-cyan-200" />
          ) : (
            <DownloadCloud className="h-12 w-12 text-cyan-200" />
          )}
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-normal">
            {isReady ? 'Update ready' : isError ? 'Update paused' : 'Getting new features ready'}
          </h1>
          <p className="text-sm leading-6 text-slate-200">
            {state.message || 'This will only take a moment.'}
          </p>
          {state.notes && (
            <p className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100">
              {state.notes}
            </p>
          )}
        </div>

        {!isReady && !isError && (
          <div className="space-y-3">
            <div className="h-3 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-cyan-300 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
              {progress}% complete
            </p>
          </div>
        )}

        {(isReady || isError) && (
          <Button
            onClick={dismissOtaUpdateScreen}
            className="h-12 w-full rounded-lg bg-white text-slate-950 hover:bg-slate-100 font-black"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
};

export default OtaUpdateScreen;
