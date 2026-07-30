import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const generatedServiceWorker = (): Plugin => ({
  name: 'generated-service-worker',
  apply: 'build',
  generateBundle(_options, bundle) {
    const startupFiles = new Set<string>(['/', 'index.html']);
    const includeStaticImports = (fileName: string) => {
      if (startupFiles.has(fileName)) return;
      startupFiles.add(fileName);
      const output = bundle[fileName];
      if (output?.type === 'chunk') output.imports.forEach(includeStaticImports);
    };

    Object.values(bundle).forEach(output => {
      if (output.type === 'chunk' && output.isEntry) includeStaticImports(output.fileName);
      if (output.type === 'asset' && output.fileName.endsWith('.css')) startupFiles.add(output.fileName);
    });

    const precache = Array.from(startupFiles);
    const cacheVersion = precache.join('|').split('').reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 0).toString(36);
    const source = `const CACHE_NAME = 'medmacs-${cacheVersion}';
const PRECACHE_URLS = ${JSON.stringify(precache)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html').then(response => response || caches.match('/'))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  })));
});`;
    this.emitFile({ type: 'asset', fileName: 'service-worker.js', source });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 1. CRITICAL FIX FOR NETLIFY: Set the base path
  // This ensures assets (JS/CSS) are loaded correctly on deployment.
  base: '/', 
  
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/reference': {
        target: 'https://reference.medmacs.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reference/, '/search'),
      },
    },
  },
  plugins: [
    react(),
    generatedServiceWorker(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'chrome74',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('commonjsHelpers')) return 'commonjs';
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/clsx/') || id.includes('/class-variance-authority/') || id.includes('/tailwind-merge/')) return 'ui-vendor';
          if (id.includes('/recharts/')) return 'charts';
          if (id.includes('/framer-motion/') || id.includes('/motion-dom/') || id.includes('/motion-utils/')) return 'motion';
          if (id.includes('/@supabase/')) return 'supabase';
          if (id.includes('/@capacitor/') || id.includes('/@capgo/')) return 'capacitor';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router') || id.includes('/@remix-run/router/')) return 'react-vendor';
          if (id.includes('/@tanstack/')) return 'query';
          return undefined;
        },
      },
    },
  },
}));
