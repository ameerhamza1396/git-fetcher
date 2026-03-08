import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";

import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";

import { setupIonicReact } from "@ionic/react";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

import UpdaterUI from "./components/UpdaterUI";
import { runOTAUpdate } from "./Updater";
import { supabase } from "@/integrations/supabase/client";

setupIonicReact({
  mode: "md",
  scrollAssist: true,
  scrollPadding: true
});

const checkForRemoteUpdates = async setUI => {
  try {
    const { data: remote, error } = await supabase
      .from('app_updates')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!remote) {
      console.log("No active update rollout found");
      return;
    }

    const builtin = await CapacitorUpdater.getBuiltinVersion();
    const next = await CapacitorUpdater.getNextBundle();

    const currentVersion = next?.version || builtin.version;

    if (remote.version === currentVersion) {
      console.log("App already on latest version:", currentVersion);
      return;
    }

    console.log(`New version detected ${remote.version}`);

    await runOTAUpdate(remote, setUI);
  } catch (err) {
    console.warn("OTA update skipped:", err);
  }
};

const Root = () => {
  const [updateUI, setUpdateUI] = useState({
    visible: false,
    progress: 0,
    size: null,
    title: "",
    message: "",
    features: [],
    critical: false,
    status: "idle",
    error: null as string | null
  });

  const initNativeFeatures = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await CapacitorUpdater.notifyAppReady();

      await StatusBar.setOverlaysWebView({ overlay: true });

      await checkForRemoteUpdates(setUpdateUI);

      CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
        if (isActive) {
          await checkForRemoteUpdates(setUpdateUI);
        }
      });
    } catch (e) {
      console.error("Native initialization failed:", e);
    }
  };

  useEffect(() => {
    initNativeFeatures();
  }, []);

  return (
    <>
      <UpdaterUI {...updateUI} />

      <HelmetProvider>
        <App />
      </HelmetProvider>
    </>
  );
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch(err => console.log("SW failed", err));
  });
}
