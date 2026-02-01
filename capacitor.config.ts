import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.topintown.pos',
  appName: 'Top In Town POS',
  webDir: 'dist',
  server: {
    url: 'https://07a7628e-fd52-4c35-8fb8-58a2e4a62bc5.lovableproject.com/pos?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
