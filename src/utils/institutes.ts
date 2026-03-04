// Institute utilities - fetches from backend
import { supabase } from '@/integrations/supabase/client';

export interface Institute {
  id: string;
  code: string;
  name: string;
  short_name: string;
  image_url: string | null;
  enabled: boolean;
  years: string[];
}

// Cache for institutes
let cachedInstitutes: Institute[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchInstitutes(): Promise<Institute[]> {
  if (cachedInstitutes && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedInstitutes;
  }
  const { data, error } = await supabase
    .from('institutes')
    .select('*')
    .order('name');
  if (error || !data) return cachedInstitutes || [];
  cachedInstitutes = data as Institute[];
  cacheTimestamp = Date.now();
  return cachedInstitutes;
}

export async function getEnabledInstitutes(): Promise<Institute[]> {
  const all = await fetchInstitutes();
  return all.filter(i => i.enabled);
}

export async function getAllInstitutes(): Promise<Institute[]> {
  return fetchInstitutes();
}

export function getInstituteDisplayName(code: string, institutes: Institute[]): string {
  const inst = institutes.find(i => i.code === code);
  return inst?.name || code;
}

export function getInstituteByCode(code: string, institutes: Institute[]): Institute | undefined {
  return institutes.find(i => i.code === code);
}
