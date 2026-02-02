import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.topintown.pos',
  appName: 'topintown',
  webDir: 'dist',
  server: {
    url: 'https://topintown.lovable.app/pos',
    cleartext: true,
    // Prevent silent white screens if the WebView can't load the remote URL.
    // Shows a local page from dist/ instead.
    errorPath: 'native-error.html',
    // Keep navigation inside the WebView for our published domain.
    // (Not intended for production in Capacitor docs, but required for remote-hosted POS variant.)
    allowNavigation: ['topintown.lovable.app', '*.lovable.app']
  }
};

export default config;
