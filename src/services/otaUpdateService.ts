import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater, type BundleInfo, type DownloadEvent } from '@capgo/capacitor-updater';

export type OtaUpdatePhase = 'idle' | 'checking' | 'downloading' | 'preparing' | 'installing' | 'complete' | 'failed' | 'error';

export type OtaUpdateState = {
  phase: OtaUpdatePhase;
  progress: number;
  version?: string;
  notes?: string;
  message?: string;
  mandatory?: boolean;
  size?: number | null;
};

type OtaLatestResponse =
  | {
      available: true;
      version: string;
      url: string;
      checksum?: string | null;
      mandatory?: boolean;
      notes?: string | null;
    }
  | {
      available: false;
      reason?: string;
    };

const OTA_CHANNEL = import.meta.env.VITE_OTA_CHANNEL || 'production';
const MEDMACS_API_BASE_URL = (import.meta.env.VITE_MEDMACS_API_BASE_URL || 'https://admin.medmacs.app').replace(/\/+$/, '');
const INSTALL_ID_KEY = 'medmacs_ota_install_id';
const FAILED_VERSIONS_KEY = 'medmacs_ota_failed_versions';
const INSTALLING_VERSION_KEY = 'medmacs_ota_installing_version';
const COMPLETED_VERSION_KEY = 'medmacs_ota_completed_version';
const OTA_DIAGNOSTICS_KEY = 'medmacs_ota_diagnostics';

let currentState: OtaUpdateState = { phase: 'idle', progress: 0 };
let started = false;
let appReadyPromise: Promise<void> | null = null;
const listeners = new Set<(state: OtaUpdateState) => void>();

const emit = (state: OtaUpdateState) => {
  currentState = state;
  listeners.forEach(listener => listener(currentState));
};

const recordDiagnostic = (event: string, details: Record<string, unknown> = {}) => {
  const entry = {
    event,
    details,
    at: new Date().toISOString(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem(OTA_DIAGNOSTICS_KEY) || '[]');
    const entries = Array.isArray(existing) ? existing : [];
    entries.push(entry);
    localStorage.setItem(OTA_DIAGNOSTICS_KEY, JSON.stringify(entries.slice(-50)));
  } catch (_error) {
    localStorage.setItem(OTA_DIAGNOSTICS_KEY, JSON.stringify([entry]));
  }

  console.info('[OTA]', event, details);
};

const getInstallId = () => {
  const existing = localStorage.getItem(INSTALL_ID_KEY);
  if (existing) return existing;

  const installId = crypto.randomUUID();
  localStorage.setItem(INSTALL_ID_KEY, installId);
  return installId;
};

const parseVersionCode = (value: unknown) => {
  const versionCode = Number(value);
  return Number.isFinite(versionCode) ? Math.trunc(versionCode) : 0;
};

const readJsonArray = (key: string) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
  } catch (_error) {
    return [];
  }
};

const rememberFailedVersion = (version?: string) => {
  if (!version || version === 'builtin') return;
  const failedVersions = new Set(readJsonArray(FAILED_VERSIONS_KEY));
  failedVersions.add(version);
  localStorage.setItem(FAILED_VERSIONS_KEY, JSON.stringify([...failedVersions].slice(-10)));
};

const getBundleVersion = (bundle?: BundleInfo | null) => {
  if (!bundle) return 'builtin';
  return bundle.version || bundle.id || 'builtin';
};

const clearInstallingVersionIfCurrent = (currentBundleVersion: string) => {
  const installingVersion = localStorage.getItem(INSTALLING_VERSION_KEY);
  if (!installingVersion || installingVersion !== currentBundleVersion) return;

  localStorage.removeItem(INSTALLING_VERSION_KEY);
  localStorage.setItem(COMPLETED_VERSION_KEY, currentBundleVersion);
  emit({
    phase: 'complete',
    progress: 100,
    version: currentBundleVersion,
    message: 'Update complete. You are now using the latest version.',
  });
};

const subscribeToDownloadProgress = async () => {
  const handle = await CapacitorUpdater.addListener('download', (event: DownloadEvent) => {
    emit({
      ...currentState,
      phase: 'downloading',
      progress: Math.max(0, Math.min(100, Math.round(event.percent ?? 0))),
    });
  });

  return () => {
    handle.remove();
  };
};

export const subscribeToOtaUpdates = (listener: (state: OtaUpdateState) => void) => {
  listeners.add(listener);
  listener(currentState);

  return () => {
    listeners.delete(listener);
  };
};

export const dismissOtaUpdateScreen = () => {
  emit({ phase: 'idle', progress: 0 });
};

export const getOtaDiagnostics = () => {
  try {
    const existing = JSON.parse(localStorage.getItem(OTA_DIAGNOSTICS_KEY) || '[]');
    return Array.isArray(existing) ? existing : [];
  } catch (_error) {
    return [];
  }
};

export const clearOtaDiagnostics = () => {
  localStorage.removeItem(OTA_DIAGNOSTICS_KEY);
};

export const markOtaBundleReady = () => {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (!appReadyPromise) {
    recordDiagnostic('notify_app_ready_start');
    appReadyPromise = CapacitorUpdater.notifyAppReady()
      .then(result => {
        recordDiagnostic('notify_app_ready_success', {
          bundle: result.bundle,
        });
      })
      .catch(error => {
        recordDiagnostic('notify_app_ready_failed', {
          message: error instanceof Error ? error.message : String(error),
        });
        console.warn('OTA notifyAppReady failed:', error);
      });
  }

  return appReadyPromise;
};

export const initializeOtaUpdates = async () => {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  await markOtaBundleReady();

  try {
    recordDiagnostic('check_start');
    emit({ phase: 'checking', progress: 0, message: 'Checking for new features...' });

    const appInfo = await App.getInfo();
    const nativeVersionCode = parseVersionCode(appInfo.build);
    const currentBundle = await CapacitorUpdater.current();
    const currentBundleVersion = getBundleVersion(currentBundle.bundle);
    recordDiagnostic('current_bundle', {
      native: currentBundle.native,
      bundle: currentBundle.bundle,
      currentBundleVersion,
      nativeVersionCode,
    });

    const failedUpdate = await CapacitorUpdater.getFailedUpdate().catch(error => {
      recordDiagnostic('failed_update_lookup_error', {
        message: error instanceof Error ? error.message : String(error),
      });
      console.warn('OTA failed update lookup failed:', error);
      return null;
    });

    if (failedUpdate?.bundle) {
      const failedVersion = getBundleVersion(failedUpdate.bundle);
      recordDiagnostic('failed_update_found', {
        bundle: failedUpdate.bundle,
        failedVersion,
      });
      rememberFailedVersion(failedVersion);
      localStorage.removeItem(INSTALLING_VERSION_KEY);
      CapacitorUpdater.delete({ id: failedUpdate.bundle.id }).catch(error => {
        console.warn('OTA failed bundle cleanup skipped:', error);
      });
      emit({
        phase: 'failed',
        progress: 0,
        version: failedVersion,
        message: 'Update failed and was rolled back. We will wait for a newer update before trying again.',
      });
    } else {
      clearInstallingVersionIfCurrent(currentBundleVersion);
    }

    const failedBundleVersions = readJsonArray(FAILED_VERSIONS_KEY);
    recordDiagnostic('server_check_request', {
      currentBundleVersion,
      failedBundleVersions,
      channel: OTA_CHANNEL,
      platform: Capacitor.getPlatform(),
    });

    const response = await fetch(`${MEDMACS_API_BASE_URL}/api/ota/latest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        platform: Capacitor.getPlatform(),
        nativeVersionCode,
        currentBundleVersion,
        failedBundleVersions,
        channel: OTA_CHANNEL,
        installId: getInstallId(),
      }),
    });

    if (!response.ok) throw new Error(`OTA check failed with status ${response.status}`);
    const data = await response.json() as OtaLatestResponse;
    recordDiagnostic('server_check_response', { data });
    if (!data?.available) {
      if (currentState.phase === 'checking') {
        emit({ phase: 'idle', progress: 0 });
      }
      return;
    }

    if (failedBundleVersions.includes(data.version)) {
      recordDiagnostic('server_returned_failed_version', {
        version: data.version,
        failedBundleVersions,
      });
      emit({
        phase: 'failed',
        progress: 0,
        version: data.version,
        message: 'This update already failed on this device. We will wait for a newer update before trying again.',
      });
      return;
    }

    // Fetch bundle size via HEAD request
    let updateSize: number | null = null;
    try {
      const headResponse = await fetch(data.url, { method: 'HEAD' });
      const contentLength = headResponse.headers.get('content-length');
      if (contentLength) {
        updateSize = parseInt(contentLength, 10);
      }
    } catch {
      // Size unavailable
    }

    const removeDownloadListener = await subscribeToDownloadProgress();

    try {
      recordDiagnostic('download_start', {
        version: data.version,
        checksum: data.checksum,
      });
      emit({
        phase: 'downloading',
        progress: 0,
        version: data.version,
        notes: data.notes ?? undefined,
        mandatory: data.mandatory ?? false,
        size: updateSize,
        message: 'Getting new features ready...',
      });

      const bundle = await CapacitorUpdater.download({
        version: data.version,
        url: data.url,
        checksum: data.checksum ?? undefined,
      });
      recordDiagnostic('download_success', { bundle });

      emit({
        phase: 'preparing',
        progress: 100,
        version: data.version,
        notes: data.notes ?? undefined,
        mandatory: data.mandatory ?? false,
        size: updateSize,
        message: 'Preparing your update...',
      });

      emit({
        phase: 'installing',
        progress: 100,
        version: data.version,
        notes: data.notes ?? undefined,
        mandatory: data.mandatory ?? false,
        size: updateSize,
        message: 'Installing update. The app will reopen automatically.',
      });

      localStorage.setItem(INSTALLING_VERSION_KEY, data.version);
      recordDiagnostic('set_start', {
        id: bundle.id,
        version: data.version,
      });
      await CapacitorUpdater.set({ id: bundle.id });
    } finally {
      removeDownloadListener();
    }
  } catch (error) {
    recordDiagnostic('ota_flow_error', {
      phase: currentState.phase,
      message: error instanceof Error ? error.message : String(error),
    });
    console.error('OTA update check failed:', error);
    if (currentState.phase === 'downloading' || currentState.phase === 'preparing' || currentState.phase === 'installing') {
      emit({
        phase: 'error',
        progress: 0,
        message: "We couldn't prepare the update right now. We'll try again later.",
      });
      return;
    }

    emit({ phase: 'idle', progress: 0 });
  }
};
