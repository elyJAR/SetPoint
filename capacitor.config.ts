import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elyjah.setpoint',
  appName: 'SetPoint',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#f4f5f7',
      style: 'LIGHT' as any
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '366233977678-YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
      androidClientId: '366233977678-YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
