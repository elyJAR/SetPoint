import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elyjah.setpoint',
  appName: 'SetPoint',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#f4f5f7',
      style: 'LIGHT' as any
    }
  }
};

export default config;
