import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { HelmetProvider } from 'react-helmet-async';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { setupIonicReact } from '@ionic/react';

setupIonicReact({
  mode: 'md',
  scrollAssist: true,
  scrollPadding: true
});

const initCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // 1. Make the WebView extend into the status bar area (Transparency)
      await StatusBar.setOverlaysWebView({ overlay: true });

      /** * Note: We do NOT set StatusBar.setStyle() here. 
       * If we force Style.Light here, some Android devices will paint a solid 
       * white background behind the bar until the React app fully takes over.
       * We let the StatusBarHandler in App.tsx handle the icon colors.
       */
    } catch (e) {
      console.warn('StatusBar initialization failed', e);
    }
  }
};

initCapacitor();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW failed', err));
  });
}