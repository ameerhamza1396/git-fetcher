import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater, type DownloadEvent } from '@capgo/capacitor-updater';
import { supabase } from '@/integrations/supabase/client';

export type OtaUpdatePhase = 'idle' | 'checking' | 'downloading' | 'preparing' | 'ready' | 'error';

export type OtaUpdateState = {
  phase: OtaUpdatePhase;
  progress: number;
  version?: string;
  notes?: string;
  message?: string;
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
const INSTALL_ID_KEY = 'medmacs_ota_install_id';
const QUEUED_VERSION_KEY = 'medmacs_ota_queued_version';

let currentState: OtaUpdateState = { phase: 'idle', progress: 0 };
let started = false;
const listeners = new Set<(state: OtaUpdateState) => void>();

const emit = (state: OtaUpdateState) => {
  currentState = state;
  listeners.forEach(listener => listener(currentState));
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

export const initializeOtaUpdates = async () => {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  try {
    await CapacitorUpdater.notifyAppReady();
  } catch (error) {
    console.warn('OTA notifyAppReady failed:', error);
  }

  try {
    emit({ phase: 'checking', progress: 0, message: 'Checking for new features...' });

    const appInfo = await App.getInfo();
    const nativeVersionCode = parseVersionCode(appInfo.build);
    const currentBundle = await CapacitorUpdater.current();
    const currentBundleVersion = currentBundle.bundle.version || currentBundle.bundle.id || 'builtin';
    const queuedVersion = localStorage.getItem(QUEUED_VERSION_KEY);

    const { data, error } = await supabase.functions.invoke<OtaLatestResponse>('ota-latest', {
      body: {
        platform: Capacitor.getPlatform(),
        nativeVersionCode,
        currentBundleVersion,
        channel: OTA_CHANNEL,
        installId: getInstallId(),
      },
    });

    if (error) throw error;
    if (!data?.available) {
      emit({ phase: 'idle', progress: 0 });
      return;
    }

    if (queuedVersion === data.version) {
      emit({
        phase: 'ready',
        progress: 100,
        version: data.version,
        notes: data.notes ?? undefined,
        message: 'Update ready. It will apply next time you restart the app.',
      });
      return;
    }

    const removeDownloadListener = await subscribeToDownloadProgress();

    try {
      emit({
        phase: 'downloading',
        progress: 0,
        version: data.version,
        notes: data.notes ?? undefined,
        message: 'Getting new features ready...',
      });

      const bundle = await CapacitorUpdater.download({
        version: data.version,
        url: data.url,
        checksum: data.checksum ?? undefined,
      });

      emit({
        phase: 'preparing',
        progress: 100,
        version: data.version,
        notes: data.notes ?? undefined,
        message: 'Preparing your update...',
      });

      await CapacitorUpdater.next({ id: bundle.id });
      localStorage.setItem(QUEUED_VERSION_KEY, data.version);

      emit({
        phase: 'ready',
        progress: 100,
        version: data.version,
        notes: data.notes ?? undefined,
        message: 'Update ready. It will apply next time you restart the app.',
      });
    } finally {
      removeDownloadListener();
    }
  } catch (error) {
    console.error('OTA update check failed:', error);
    if (currentState.phase === 'downloading' || currentState.phase === 'preparing') {
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
