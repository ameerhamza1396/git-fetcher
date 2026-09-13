import { supabase } from '@/integrations/supabase/client';

export const PAYMENTS_API_URL = (import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.medmacs.app').replace(/\/$/, '');

type ApiOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  signal?: AbortSignal;
};

export const paymentApi = async <T>(path: string, options: ApiOptions = {}): Promise<T> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Please sign in to continue.');
  const response = await fetch(`${PAYMENTS_API_URL}${path}`, {
    method: options.method || 'GET',
    signal: options.signal,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => null) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(data?.error || 'Payment service is unavailable.');
  return data as T;
};

export type PaymentOrder = {
  orderId: string;
  amount: string;
  baseAmount: string;
  fee: string;
  planName: string;
  validity: string;
  paymentContext: string;
};

export type PayFastSession = {
  gatewayUrl: string;
  fields: Record<string, string>;
};