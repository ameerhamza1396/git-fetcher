import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hmacs.medmacs',
  appName: 'Medmacs App',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // FIXED: Swapped Android ID for Web Client ID
      serverClientId: '1072567800759-9gup2643t3svl9bbf5p9ic813n42h5fq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  },
  server: {
    androidScheme: 'https',
    hostname: 'com.hmacs.medmacs',
  }
};

export default config;