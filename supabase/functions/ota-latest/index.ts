import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type OtaRequest = {
  platform?: string;
  nativeVersionCode?: number;
  currentBundleVersion?: string;
  channel?: string;
  installId?: string;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizeText = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().toLowerCase();
  return trimmed || fallback;
};

const normalizeVersionCode = (value: unknown) => {
  const versionCode = Number(value);
  return Number.isFinite(versionCode) ? Math.trunc(versionCode) : 0;
};

const rolloutBucket = async (seed: string) => {
  const data = new TextEncoder().encode(seed);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest).slice(0, 4);
  const value = bytes.reduce((acc, byte) => (acc << 8) + byte, 0);
  return Math.abs(value) % 100;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let payload: OtaRequest;
  try {
    payload = await req.json();
  } catch (_error) {
    return json({ error: 'invalid_json' }, 400);
  }

  const platform = normalizeText(payload.platform, 'android');
  const channel = normalizeText(payload.channel, 'production');
  const nativeVersionCode = normalizeVersionCode(payload.nativeVersionCode);
  const currentBundleVersion = typeof payload.currentBundleVersion === 'string'
    ? payload.currentBundleVersion
    : 'builtin';
  const installId = typeof payload.installId === 'string' && payload.installId.trim()
    ? payload.installId.trim()
    : req.headers.get('x-forwarded-for') ?? 'anonymous';

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: releases, error } = await supabase
    .from('ota_releases')
    .select('version, bundle_path, checksum, mandatory, rollout_percent, notes, min_native_version_code, created_at')
    .eq('enabled', true)
    .eq('platform', platform)
    .eq('channel', channel)
    .lte('min_native_version_code', nativeVersionCode)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('OTA release lookup failed:', error);
    return json({ error: 'release_lookup_failed' }, 500);
  }

  for (const release of releases ?? []) {
    if (release.version === currentBundleVersion) {
      return json({ available: false, reason: 'up_to_date' });
    }

    const rolloutPercent = Number(release.rollout_percent ?? 0);
    const allowed = rolloutPercent >= 100 || await rolloutBucket(`${release.version}:${installId}`) < rolloutPercent;
    if (!allowed) continue;

    const { data: signedUrl, error: signedUrlError } = await supabase.storage
      .from('ota-bundles')
      .createSignedUrl(release.bundle_path, 60 * 30);

    if (signedUrlError || !signedUrl?.signedUrl) {
      console.error('OTA signed URL failed:', signedUrlError);
      return json({ error: 'bundle_url_failed' }, 500);
    }

    return json({
      available: true,
      version: release.version,
      url: signedUrl.signedUrl,
      checksum: release.checksum,
      mandatory: release.mandatory,
      notes: release.notes,
    });
  }

  return json({ available: false, reason: 'no_eligible_release' });
});
