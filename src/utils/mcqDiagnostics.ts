type DiagnosticDetails = Record<string, string | number | boolean | null | undefined>;
const diagnosticsEnabled = import.meta.env.DEV
  || import.meta.env.VITE_MCQ_DIAGNOSTICS === 'true';

const getConnectionDetails = () => {
  if (typeof navigator === 'undefined') return {};
  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
      downlink?: number;
      rtt?: number;
    };
  }).connection;

  return {
    online: navigator.onLine,
    connection: connection?.effectiveType,
    saveData: connection?.saveData,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
  };
};

export const createMCQTraceId = () =>
  `mcq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const logMCQDiagnostic = (
  event: string,
  details: DiagnosticDetails = {},
  level: 'info' | 'warn' | 'error' = 'info',
) => {
  if (!diagnosticsEnabled) return;

  const payload = {
    event,
    at: new Date().toISOString(),
    ...getConnectionDetails(),
    ...details,
  };
  const message = `[MEDMACS_MCQ] ${JSON.stringify(payload)}`;

  if (level === 'error') {
    console.error(message);
  } else if (level === 'warn') {
    console.warn(message);
  } else {
    console.info(message);
  }
};
