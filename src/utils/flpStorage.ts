const FLP_STORAGE_API = 'https://contents.medmacs.app/api/flp-storage';

interface AttemptData {
  attempt_id: string;
  mcqs: any[];
  question_attempts: any[];
  score: number;
  total_questions: number;
  completed_at: string;
  [key: string]: any;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export async function writeAttemptData(data: AttemptData): Promise<string> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FLP_STORAGE_API}?action=write`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to write attempt data' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  const { r2_key } = await res.json();
  return r2_key;
}

export async function readAttemptData(r2Key: string): Promise<AttemptData | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FLP_STORAGE_API}?action=read&key=${encodeURIComponent(r2Key)}`, {
    method: 'GET',
    headers,
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to read attempt data' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function deleteAttemptData(r2Key: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${FLP_STORAGE_API}?action=delete&key=${encodeURIComponent(r2Key)}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({ error: 'Failed to delete attempt data' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
}
