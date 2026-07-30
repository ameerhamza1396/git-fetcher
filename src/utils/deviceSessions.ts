import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

const DEVICE_ID_KEY = 'medmacs_device_id';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
let lastHeartbeatAt = 0;

export type UserDevice = {
  id: string;
  user_id: string;
  device_id: string;
  session_id: string | null;
  device_name: string;
  platform: string;
  browser: string | null;
  app_version: string | null;
  first_seen_at: string;
  last_seen_at: string;
  signed_out_at: string | null;
};

// The generated database types will include this table after the next schema pull.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deviceTable = () => (supabase as any).from('user_devices');

export const getDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_ID_KEY, id);
  return id;
};

const getJwtSessionId = (accessToken: string): string | null => {
  try {
    const encoded = accessToken.split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const payload = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    return JSON.parse(atob(payload)).session_id ?? null;
  } catch {
    return null;
  }
};

const capitalize = (value: string) => value
  .split(/\s+/)
  .map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
  .join(' ');

const getDeviceDetails = async () => {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
      : /CriOS|Chrome\//.test(ua) ? 'Chrome'
        : /FxiOS|Firefox\//.test(ua) ? 'Firefox'
          : /Safari\//.test(ua) ? 'Safari'
            : 'Browser';
  const platform = /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
      : /Windows/.test(ua) ? 'Windows'
        : /Macintosh|Mac OS X/.test(ua) ? 'macOS'
          : /Linux/.test(ua) ? 'Linux'
            : 'Unknown';
  const isNativeApp = Capacitor.isNativePlatform();

  if (isNativeApp) {
    try {
      const [device, app] = await Promise.all([Device.getInfo(), App.getInfo()]);
      const manufacturer = device.manufacturer ? capitalize(device.manufacturer) : '';
      const model = device.model?.trim() || platform;
      const modelAlreadyIncludesManufacturer = manufacturer
        && model.toLowerCase().includes(manufacturer.toLowerCase());

      return {
        browser: null,
        platform: device.operatingSystem === 'ios' ? 'iOS' : capitalize(device.operatingSystem || platform),
        device_name: [modelAlreadyIncludesManufacturer ? '' : manufacturer, model].filter(Boolean).join(' '),
        app_version: app.version || null,
      };
    } catch (error) {
      console.warn('Unable to read native device details:', error);
    }
  }

  return {
    browser: isNativeApp ? null : browser,
    platform,
    device_name: isNativeApp ? `Medmacs on ${platform}` : `${browser} on ${platform}`,
    app_version: import.meta.env.VITE_APP_VERSION || null,
  };
};

export const registerCurrentDevice = async (session: Session) => {
  const now = new Date().toISOString();
  const deviceDetails = await getDeviceDetails();
  const { error } = await deviceTable().upsert({
    user_id: session.user.id,
    device_id: getDeviceId(),
    session_id: getJwtSessionId(session.access_token),
    ...deviceDetails,
    last_seen_at: now,
    signed_out_at: null,
  }, { onConflict: 'user_id,device_id' });

  if (error) console.warn('Unable to register this device:', error.message);
  else lastHeartbeatAt = Date.now();
};

export const heartbeatCurrentDevice = async (session: Session, force = false) => {
  if (!force && Date.now() - lastHeartbeatAt < HEARTBEAT_INTERVAL_MS) return;
  const { error } = await deviceTable()
    .update({
      session_id: getJwtSessionId(session.access_token),
      last_seen_at: new Date().toISOString(),
      signed_out_at: null,
    })
    .eq('user_id', session.user.id)
    .eq('device_id', getDeviceId());

  if (error) console.warn('Unable to update device activity:', error.message);
  else lastHeartbeatAt = Date.now();
};

export const listUserDevices = async (userId: string): Promise<UserDevice[]> => {
  const { data, error } = await deviceTable()
    .select('id,user_id,device_id,session_id,device_name,platform,browser,app_version,first_seen_at,last_seen_at,signed_out_at')
    .eq('user_id', userId)
    .gte('last_seen_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('last_seen_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserDevice[];
};

export const markCurrentDeviceSignedOut = async (userId: string) => {
  await deviceTable()
    .update({ signed_out_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('device_id', getDeviceId());
};

export const markOtherDevicesSignedOut = async (userId: string) => {
  await deviceTable()
    .update({ signed_out_at: new Date().toISOString() })
    .eq('user_id', userId)
    .neq('device_id', getDeviceId())
    .is('signed_out_at', null);
};

export const markAllDevicesSignedOut = async (userId: string) => {
  await deviceTable()
    .update({ signed_out_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('signed_out_at', null);
};
