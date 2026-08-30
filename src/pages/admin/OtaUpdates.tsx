import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CloudUpload, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

type AccessState = 'loading' | 'allowed' | 'denied';
type StepState = 'waiting' | 'active' | 'done' | 'error';

type UploadStep = {
  label: string;
  state: StepState;
};

type OtaRelease = {
  version: string;
  channel: string;
  platform: string;
  minNativeVersionCode: number;
  objectKey: string;
  checksum: string | null;
  enabled: boolean;
  mandatory: boolean;
  rolloutPercent: number;
  notes: string | null;
  fileSizeBytes?: number | null;
  createdAt: string;
  updatedAt: string;
};

type AdminResponse = {
  releases?: OtaRelease[];
  release?: OtaRelease;
  ok?: boolean;
  error?: string;
};

const MEDMACS_API_BASE_URL = (import.meta.env.VITE_MEDMACS_API_BASE_URL || 'https://admin.medmacs.app').replace(/\/+$/, '');

const initialSteps: UploadStep[] = [
  { label: 'Validate web bundle zip', state: 'waiting' },
  { label: 'Calculate SHA-256 checksum', state: 'waiting' },
  { label: 'Prepare Cloudflare upload', state: 'waiting' },
  { label: 'Upload bundle to Cloudflare', state: 'waiting' },
  { label: 'Publish release metadata', state: 'waiting' },
  { label: 'Refresh release history', state: 'waiting' },
];

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');

const setStep = (steps: UploadStep[], index: number, state: StepState) =>
  steps.map((step, stepIndex) => stepIndex === index ? { ...step, state } : step);

const getAuthorizationHeader = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in again before using medmacs-supers.');
  return `Bearer ${token}`;
};

const callOtaAdmin = async (path: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  headers.set('Authorization', await getAuthorizationHeader());
  const response = await fetch(`${MEDMACS_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({})) as AdminResponse;
  if (!response.ok || data.error) throw new Error(data.error || `Request failed with status ${response.status}`);
  return data;
};

const uploadWithProgress = (url: string, file: File, authorization: string, onProgress: (progress: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', 'application/zip');
    request.setRequestHeader('Authorization', authorization);
    request.upload.onprogress = event => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Cloudflare upload failed with status ${request.status}`));
    };
    request.onerror = () => reject(new Error('Cloudflare upload failed'));
    request.send(file);
  });

const OtaUpdates = () => {
  const [access, setAccess] = useState<AccessState>('loading');
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [platform, setPlatform] = useState('android');
  const [channel, setChannel] = useState('production');
  const [minNativeVersionCode, setMinNativeVersionCode] = useState('14');
  const [rolloutPercent, setRolloutPercent] = useState('0');
  const [mandatory, setMandatory] = useState(false);
  const [notes, setNotes] = useState('');
  const [steps, setSteps] = useState<UploadStep[]>(initialSteps);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [releases, setReleases] = useState<OtaRelease[]>([]);

  const safeVersion = useMemo(
    () => version.trim().replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, ''),
    [version],
  );

  const loadReleases = useCallback(async () => {
    const data = await callOtaAdmin('/api/ota/admin/releases');
    setReleases(data.releases ?? []);
  }, []);

  useEffect(() => {
    const initialize = async () => {
      const adminResult = await supabase.rpc('is_mcq_lock_admin');
      if (adminResult.error || adminResult.data !== true) {
        setAccess('denied');
        return;
      }
      await loadReleases();
      setAccess('allowed');
    };

    void initialize().catch(() => setAccess('denied'));
  }, [loadReleases]);

  const markError = (index: number, message: string) => {
    setSteps(current => setStep(current, index, 'error'));
    setStatusMessage(message);
  };

  const publishRelease = async () => {
    if (!file) {
      setStatusMessage('Choose a web bundle zip first.');
      return;
    }
    if (!safeVersion) {
      setStatusMessage('Enter a release version.');
      return;
    }

    setBusy(true);
    setUploadProgress(0);
    setStatusMessage('');
    setSteps(initialSteps);

    try {
      setSteps(current => setStep(current, 0, 'active'));
      if (!file.name.toLowerCase().endsWith('.zip') || file.type && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
        throw new Error('Only zipped Capacitor web bundles are allowed.');
      }
      if (file.size > 75 * 1024 * 1024) {
        throw new Error('The upload is larger than the 75 MB safety limit.');
      }
      setSteps(current => setStep(current, 0, 'done'));

      setSteps(current => setStep(current, 1, 'active'));
      const checksum = toHex(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
      setSteps(current => setStep(current, 1, 'done'));

      setSteps(current => setStep(current, 2, 'active'));
      const authorization = await getAuthorizationHeader();
      const uploadUrl = new URL(`${MEDMACS_API_BASE_URL}/api/ota/admin/upload`);
      uploadUrl.searchParams.set('version', safeVersion);
      uploadUrl.searchParams.set('platform', platform);
      uploadUrl.searchParams.set('channel', channel);
      uploadUrl.searchParams.set('checksum', checksum);
      uploadUrl.searchParams.set('fileSizeBytes', String(file.size));
      uploadUrl.searchParams.set('minNativeVersionCode', String(Number(minNativeVersionCode)));
      uploadUrl.searchParams.set('rolloutPercent', String(Number(rolloutPercent)));
      uploadUrl.searchParams.set('mandatory', String(mandatory));
      if (notes.trim()) uploadUrl.searchParams.set('notes', notes.trim());
      setSteps(current => setStep(current, 2, 'done'));

      setSteps(current => setStep(current, 3, 'active'));
      await uploadWithProgress(uploadUrl.toString(), file, authorization, setUploadProgress);
      setSteps(current => setStep(current, 3, 'done'));

      setSteps(current => setStep(current, 4, 'active'));
      setSteps(current => setStep(current, 4, 'done'));

      setSteps(current => setStep(current, 5, 'active'));
      await loadReleases();
      setSteps(current => setStep(current, 5, 'done'));
      setStatusMessage(`Release ${safeVersion} published to Cloudflare.`);
    } catch (error) {
      const activeIndex = steps.findIndex(step => step.state === 'active');
      markError(activeIndex >= 0 ? activeIndex : 0, error instanceof Error ? error.message : 'Publish failed.');
    } finally {
      setBusy(false);
    }
  };

  const disableRelease = async (release: OtaRelease) => {
    setStatusMessage('');
    await callOtaAdmin('/api/ota/admin/disable', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: release.version,
        platform: release.platform,
        channel: release.channel,
      }),
    });
    await loadReleases();
    setStatusMessage(`Release ${release.version} disabled.`);
  };

  if (access === 'loading') {
    return <div className="min-h-screen bg-background p-8 text-center text-muted-foreground">Checking administrator access...</div>;
  }

  if (access === 'denied') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div className="max-w-md rounded-lg border bg-card p-8">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-xl font-black">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This page is restricted to the medmacs-supers administrator account.
          </p>
          <Button asChild className="mt-6"><Link to="/dashboard">Return to dashboard</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-primary">medmacs-supers</p>
            <h1 className="text-2xl font-black">Server updates</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline"><Link to="/medmacs-supers/chapter-locks">Chapter locks</Link></Button>
            <Button asChild variant="outline"><Link to="/dashboard">Dashboard</Link></Button>
          </div>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              Upload only zipped web assets from the approved Capacitor build. Native code, Android permissions,
              SDK changes, billing changes, privacy-sensitive behavior, and major capability changes must go through Google Play.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5 rounded-lg border bg-card p-5 shadow-sm">
            <label className="block text-sm font-bold">
              Build zip
              <Input
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                onChange={event => setFile(event.target.files?.[0] ?? null)}
                disabled={busy}
                className="mt-2"
              />
              {file && <span className="mt-1 block text-xs text-muted-foreground">{file.name} · {formatBytes(file.size)}</span>}
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">
                Version
                <Input value={version} onChange={event => setVersion(event.target.value)} placeholder="ota-20260731-001" disabled={busy} className="mt-2" />
              </label>
              <label className="block text-sm font-bold">
                Minimum native version code
                <Input type="number" min="1" value={minNativeVersionCode} onChange={event => setMinNativeVersionCode(event.target.value)} disabled={busy} className="mt-2" />
              </label>
              <label className="block text-sm font-bold">
                Platform
                <select value={platform} onChange={event => setPlatform(event.target.value)} disabled={busy} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="android">Android</option>
                  <option value="ios">iOS</option>
                </select>
              </label>
              <label className="block text-sm font-bold">
                Channel
                <select value={channel} onChange={event => setChannel(event.target.value)} disabled={busy} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3">
                  <option value="production">Production</option>
                  <option value="beta">Beta</option>
                  <option value="internal">Internal</option>
                </select>
              </label>
              <label className="block text-sm font-bold">
                Rollout percentage
                <Input type="number" min="0" max="100" value={rolloutPercent} onChange={event => setRolloutPercent(event.target.value)} disabled={busy} className="mt-2" />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm font-bold">
                Mandatory update
                <Switch checked={mandatory} onCheckedChange={setMandatory} disabled={busy} />
              </label>
            </div>

            <label className="block text-sm font-bold">
              Release notes
              <Textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={1000} disabled={busy} className="mt-2 min-h-24" />
            </label>

            <Button onClick={() => void publishRelease()} disabled={busy} className="h-11 w-full rounded-md font-black">
              {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CloudUpload className="mr-2 h-4 w-4" />}
              Publish Cloudflare update
            </Button>
          </div>

          <div className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Progress</h2>
            <div className="mt-4 space-y-3">
              {steps.map((step, index) => (
                <div key={step.label} className="flex items-center gap-3 text-sm">
                  {step.state === 'done' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : step.state === 'error' ? <XCircle className="h-5 w-5 text-destructive" /> : <span className={`h-5 w-5 rounded-full border ${step.state === 'active' ? 'border-primary bg-primary/20' : 'border-muted-foreground/30'}`} />}
                  <span className={step.state === 'active' ? 'font-bold text-foreground' : 'text-muted-foreground'}>{index + 1}. {step.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{uploadProgress}% uploaded</p>
            </div>
            {statusMessage && <p className="mt-4 rounded-md border bg-background p-3 text-sm text-muted-foreground">{statusMessage}</p>}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Release history</h2>
            <Button variant="outline" size="sm" onClick={() => void loadReleases()}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-3">Version</th>
                  <th className="py-3 pr-3">Target</th>
                  <th className="py-3 pr-3">Rollout</th>
                  <th className="py-3 pr-3">Storage</th>
                  <th className="py-3 pr-3">Size</th>
                  <th className="py-3 pr-3">Status</th>
                  <th className="py-3 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {releases.map(release => (
                  <tr key={`${release.platform}-${release.channel}-${release.version}`} className="border-b last:border-0">
                    <td className="py-3 pr-3 font-bold">{release.version}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{release.platform} · {release.channel} · native {release.minNativeVersionCode}+</td>
                    <td className="py-3 pr-3">{release.rolloutPercent}%{release.mandatory ? ' · mandatory' : ''}</td>
                    <td className="py-3 pr-3">cloudflare</td>
                    <td className="py-3 pr-3">{formatBytes(release.fileSizeBytes)}</td>
                    <td className="py-3 pr-3">{release.enabled ? 'Enabled' : 'Disabled'}</td>
                    <td className="py-3 pr-3">
                      <Button size="sm" variant="outline" disabled={!release.enabled || busy} onClick={() => void disableRelease(release)}>
                        Disable
                      </Button>
                    </td>
                  </tr>
                ))}
                {!releases.length && (
                  <tr>
                    <td className="py-6 text-center text-muted-foreground" colSpan={7}>No releases found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OtaUpdates;
