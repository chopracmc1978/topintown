import type { CapacitorConfig } from '@capacitor/cli';

/**
 * POS Native build strategy (reliable “proper” way):
 * - Default: bundle the web app into the native binary (NO server.url).
 *   This avoids “white screen” caused by WebView/network failing to load a remote URL at boot.
 * - Optional: remote-hosted mode for quick iteration by setting CAPACITOR_SERVER_URL.
 *   Example: CAPACITOR_SERVER_URL=https://topintown.lovable.app/pos
 */
const serverUrl = (process.env.CAPACITOR_SERVER_URL || '').trim();

const config: CapacitorConfig = {
  appId: 'com.topintown.pos',
  appName: 'topintown',
  webDir: 'dist',
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: true,
        // If remote URL fails to load, show a local page from dist/ instead.
        errorPath: 'native-error.html',
        // NOTE: allowNavigation is intentionally omitted.
        // There are known cases where allowNavigation causes loading issues on some Android WebViews.
      }
    : undefined,
};

export default config;
