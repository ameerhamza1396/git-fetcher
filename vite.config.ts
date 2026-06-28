import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // 1. CRITICAL FIX FOR NETLIFY: Set the base path
  // This ensures assets (JS/CSS) are loaded correctly on deployment.
  base: '/', 
  
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/content': {
        target: 'https://medmacs.app',
        changeOrigin: true,
      },
      '/api/reference': {
        target: 'https://reference.medmacs.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/reference/, '/search'),
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
