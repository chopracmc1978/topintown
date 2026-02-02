import type { CapacitorConfig } from '@capacitor/cli';

/**
 * POS Tablet Native App Configuration
 *
 * Reliable strategy:
 * - Default: bundle the web app into the native binary (NO server.url)
 *   so the POS works even if Wi‑Fi is down and avoids remote-load white screens.
 * - Optional: hot-reload / remote hosting by setting CAPACITOR_SERVER_URL.
 *   Recommended value:
 *   CAPACITOR_SERVER_URL=https://topintown.lovable.app/pos?forceHideBadge=true
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
        // If the remote URL fails, show a local dist/ fallback page instead of blank white.
        errorPath: 'native-error.html',
      }
    : undefined,
};

export default config;
