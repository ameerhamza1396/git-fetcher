import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CONTENT_API_URL = 'https://medmacs.app/api/content';
const CONTENT_API_URL = import.meta.env.VITE_CONTENT_API_URL || DEFAULT_CONTENT_API_URL;
// Mobile networks frequently need several seconds for their first DNS/TLS handshake.
// Four seconds caused healthy cold connections to be aborted during page transitions.
const CONTENT_API_TIMEOUT_MS = 12000;
const CONTENT_API_MAX_ATTEMPTS = 2;
const inFlightContentRequests = new Map<string, Promise<unknown>>();

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
  options: { throwOnFailure?: boolean } = {},
): Promise<T | null> => {
  try {
    let sessionTimeoutId: ReturnType<typeof setTimeout> | undefined;
    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>(resolve => {
        sessionTimeoutId = setTimeout(() => resolve(null), CONTENT_API_TIMEOUT_MS);
      }),
    ]);
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);

    const token = sessionResult?.data.session?.access_token;

    if (!token) {
      if (options.throwOnFailure) throw new Error('Content session unavailable');
      return null;
    }

    const url = createContentUrl();
    url.searchParams.set('resource', resource);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    const requestKey = url.toString();
    let request = inFlightContentRequests.get(requestKey);
    if (!request) {
      request = (async () => {
        let response: Response | null = null;
        let lastError: unknown = null;

        for (let attempt = 0; attempt < CONTENT_API_MAX_ATTEMPTS; attempt += 1) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), CONTENT_API_TIMEOUT_MS);
          try {
            response = await fetch(requestKey, {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: 'no-store',
              signal: controller.signal,
            });
            if (response.ok || response.status < 500) break;
          } catch (error) {
            lastError = error;
          } finally {
            clearTimeout(timeoutId);
          }
        }

        if (!response) throw lastError ?? new Error('Content server unavailable');
        if (!response.ok) throw new Error(`Content request failed (${response.status})`);
        return extractContentPayload(await response.json());
      })().finally(() => {
        inFlightContentRequests.delete(requestKey);
      });
      inFlightContentRequests.set(requestKey, request);
    }

    return await request as T | null;
  } catch (error) {
    if (options.throwOnFailure) throw error;
    return null;
  }
};
