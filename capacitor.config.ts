import type { CapacitorConfig } from '@capacitor/cli';

/**
 * POS Tablet Native App Configuration
 * 
 * This app launches directly to /pos for store staff usage.
 * Uses hot-reload from the Lovable sandbox for development.
 */
const config: CapacitorConfig = {
  appId: 'com.topintown.pos',
  appName: 'topintown',
  webDir: 'dist',
  server: {
    // Point directly to /pos route on the Lovable sandbox for hot-reload
    url: 'https://07a7628e-fd52-4c35-8fb8-58a2e4a62bc5.lovableproject.com/pos?forceHideBadge=true',
    cleartext: true,
  },
};

export default config;
