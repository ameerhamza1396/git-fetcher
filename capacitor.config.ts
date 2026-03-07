import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hmacs.medmacs',
  appName: 'Medmacs App',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '1072567800759-9gup2643t3svl9bbf5p9ic813n42h5fq.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    },
    // 🎯 ADDED: Push Notification Configuration
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  server: {
    androidScheme: 'https',
    hostname: 'com.hmacs.medmacs',
    allowNavigation: [
      'ipguat.apps.net.pk',
      'ipguat2.apps.net.pk',
      'apps.net.pk'
    ]
  }
};

export default config;