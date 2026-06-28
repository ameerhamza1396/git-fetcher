import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CONTENT_API_URL = import.meta.env.DEV ? '/api/content' : 'https://medmacs.app/api/content';
const CONTENT_API_URL = import.meta.env.VITE_CONTENT_API_URL || DEFAULT_CONTENT_API_URL;
const CONTENT_API_TIMEOUT_MS = 4000;

const createContentUrl = () => {
  if (/^https?:\/\//i.test(CONTENT_API_URL)) {
    return new URL(CONTENT_API_URL);
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  return new URL(CONTENT_API_URL, origin);
};

const extractContentPayload = <T>(payload: any): T | null => {
  if (payload === null || payload === undefined) return null;
  if (Array.isArray(payload)) return payload as T;
  if (payload.data !== undefined) return payload.data as T;

  const contentKeys = [
    'subjects',
    'subject',
    'chapters',
    'chapter',
    'mcqs',
    'seqs',
    'seq',
    'questions',
    'items',
    'result',
  ];

  for (const key of contentKeys) {
    if (payload[key] !== undefined) return payload[key] as T;
  }

  return payload as T;
};

export const fetchCloudContent = async <T>(
  resource: string,
  params: Record<string, string | number | null | undefined> = {},
): Promise<T | null> => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      return null;
    }

    const url = createContentUrl();
    url.searchParams.set('resource', resource);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONTENT_API_TIMEOUT_MS);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return extractContentPayload<T>(payload);
  } catch {
    return null;
  }
};
