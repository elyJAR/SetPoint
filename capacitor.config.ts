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
      serverClientId: '366233977678-kaa9b1q2d8c78l1kp6j063nic5fks1b5.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
