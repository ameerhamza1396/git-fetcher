import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { setupIonicReact } from '@ionic/react';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import { App as CapacitorApp } from '@capacitor/app';

setupIonicReact({
  mode: 'md',
  scrollAssist: true,
  scrollPadding: true
});

const VERSION_MANIFEST = "https://pxjvltgarzvoptdfdkxq.supabase.co/storage/v1/object/public/app-updates/version.json";

const checkForRemoteUpdates = async () => {
  try {
    const res = await fetch(VERSION_MANIFEST, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch version manifest");

    const remote = await res.json();

    const builtin = await CapacitorUpdater.getBuiltinVersion();
    const next = await CapacitorUpdater.getNextBundle();

    const currentVersion = next?.version || builtin.version;

    if (remote.version === currentVersion) {
      console.log("App already on latest version:", currentVersion);
      return;
    }

    console.log(`New version detected ${remote.version}`);

    const downloaded = await CapacitorUpdater.download({
      url: remote.url,
      version: remote.version
    });

    await CapacitorUpdater.set(downloaded);

  } catch (err) {
    console.warn("OTA update skipped:", err);
  }
};

const initNativeFeatures = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await CapacitorUpdater.notifyAppReady();

    await StatusBar.setOverlaysWebView({ overlay: true });

    await checkForRemoteUpdates();

    CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
      if (isActive) {
        await checkForRemoteUpdates();
      }
    });

  } catch (e) {
    console.error("Native initialization failed:", e);
  }
};

initNativeFeatures();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch(err => console.log("SW failed", err));
  });
}
