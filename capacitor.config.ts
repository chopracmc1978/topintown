import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.topintown.pos',
  appName: 'topintown',
  webDir: 'dist',
  server: {
    url: 'https://topintown.lovable.app/pos',
    cleartext: true
  }
};

export default config;
