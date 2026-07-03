import { supabase } from '@/integrations/supabase/client';

export const aiApiOrigin = (import.meta.env.VITE_AI_API_ORIGIN || 'https://ai.medmacs.app').replace(/\/$/, '');

export const aiApiUrl = (path: string) => `${aiApiOrigin}/api/${path.replace(/^\/+/, '')}`;

export class AiApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'AiApiError';
    this.status = status;
    this.code = code;
  }
}

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
