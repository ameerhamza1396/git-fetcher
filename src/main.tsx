import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";

import { StatusBar } from "@capacitor/status-bar";
import { Capacitor } from "@capacitor/core";

import { setupIonicReact } from "@ionic/react";

setupIonicReact({
  mode: "md",
  scrollAssist: true,
  scrollPadding: true
});

const BUILD_ID = "v10-STABLE";

const Root = () => {
  const initNativeFeatures = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      console.log(`[${BUILD_ID}] Native Init Start`);
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.error(`[${BUILD_ID}] Native Init Error:`, e);
    }
  };

  useEffect(() => {
    initNativeFeatures();
  }, []);

  return (
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
};

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch(err => console.log("SW failed", err));
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}
