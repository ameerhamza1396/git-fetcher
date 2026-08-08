import { supabase } from '@/integrations/supabase/client';

export const aiApiOrigin = (import.meta.env.VITE_AI_API_ORIGIN || 'https://ai.medistics.app').replace(/\/$/, '');

export const aiApiUrl = (path: string) => `${aiApiOrigin}/api/${path.replace(/^\/+/, '')}`;

export class AiApiError extends Error {
  status: number;
  code?: string;
  payload?: Record<string, any>;

  constructor(message: string, status: number, code?: string, payload?: Record<string, any>) {
    super(message);
    this.name = 'AiApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export type AiStreamStatus = {
  phase?: string;
  text?: string;
};

const aiStatusMessages: Record<number, string> = {
  401: 'Please log in to use AI.',
  403: 'This AI feature is not available for your current plan.',
  429: 'Your AI quota for this feature has been reached.',
  503: 'AI is temporarily unavailable. Please try again shortly.',
};

export const aiApiFetch = async (path: string, init: RequestInit = {}) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(aiApiUrl(path), { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new AiApiError(
      payload.error || payload.message || aiStatusMessages[response.status] || `AI request failed with status ${response.status}`,
      response.status,
      payload.code,
      payload,
    );
  }

  return response;
};

export const aiApiJson = async <T = any>(path: string, body: unknown, init: RequestInit = {}): Promise<T> => {
  const response = await aiApiFetch(path, {
    ...init,
    method: init.method || 'POST',
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
};

export const aiApiStream = async (
  path: string,
  body: unknown,
  handlers: { onStatus?: (status: AiStreamStatus) => void; onDelta?: (text: string) => void },
  init: RequestInit = {},
) => {
  const response = await aiApiFetch(path, {
    ...init,
    method: init.method || 'POST',
    body: JSON.stringify(body),
    headers: { Accept: 'text/event-stream', ...(init.headers || {}) },
  });
  if (!response.body) throw new AiApiError('Streaming is unavailable in this browser.', response.status);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: any = {};
  const consume = (raw: string) => {
    const blocks = raw.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      const dataLine = block.split('\n').find(line => line.startsWith('data: '));
      const event = block.split('\n').find(line => line.startsWith('event: '))?.slice(7) || '';
      if (!dataLine) continue;
      const data = JSON.parse(dataLine.slice(6));
      if (event === 'status') handlers.onStatus?.({ phase: data.phase, text: data.text || '' });
      if (event === 'delta') handlers.onDelta?.(data.text || '');
      if (event === 'done') result = data;
      if (event === 'error') throw new AiApiError(data.error || 'AI request failed.', response.status, data.code, data);
    }
  };
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    consume(buffer + decoder.decode(value, { stream: true }));
  }
  if (buffer) consume(`${buffer}\n\n`);
  return result;
};
