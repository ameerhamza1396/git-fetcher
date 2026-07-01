import { useEffect, useState } from 'react';
import { clearOtaDiagnostics, getOtaDiagnostics } from '@/services/otaUpdateService';
import { Button } from '@/components/ui/button';

const OtaDiagnosticsPanel = () => {
  const [visible, setVisible] = useState(false);
  const [diagnostics, setDiagnostics] = useState<unknown[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('otaDebug') !== '1') return;

    setVisible(true);
    setDiagnostics(getOtaDiagnostics());
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[10001] max-h-[70vh] overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-bold">OTA Diagnostics</p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDiagnostics(getOtaDiagnostics())}
            className="h-8 rounded-md"
          >
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              clearOtaDiagnostics();
              setDiagnostics([]);
            }}
            className="h-8 rounded-md"
          >
            Clear
          </Button>
          <Button size="sm" onClick={() => setVisible(false)} className="h-8 rounded-md">
            Close
          </Button>
        </div>
      </div>
      <pre className="whitespace-pre-wrap break-words">
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  );
};

export default OtaDiagnosticsPanel;
