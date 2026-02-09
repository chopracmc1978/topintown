/**
 * POS App entry point – kept intentionally minimal for maximum
 * compatibility with older Android WebViews and the Vite legacy plugin.
 *
 * RULES:
 *  1. NO require() calls – they don't exist in ESM and confuse bundlers.
 *  2. NO dynamic import("./App.tsx") – static import is more reliable
 *     with @vitejs/plugin-legacy chunk generation.
 *  3. NO JSX crash screens – if React can't render, JSX won't work either.
 *     The inline HTML fallback in index.html handles that case.
 *  4. Polyfills are handled by @vitejs/plugin-legacy (modernPolyfills: true),
 *     so manual polyfill imports have been removed.
 */

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/* ── Self-hosted fonts (bundled in dist/, no CDN dependency) ── */
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";

/* ── Native POS viewport & route fixes ─────────────────────── */

function applyNativeFixes() {
  try {
    // Dynamically check Capacitor – avoids a top-level import that could
    // block the entire module if @capacitor/core has issues in web-only mode.
    const isNative =
      typeof window !== "undefined" &&
      (window as any).Capacitor &&
      (window as any).Capacitor.isNativePlatform &&
      (window as any).Capacitor.isNativePlatform();

    if (!isNative) return;

    // Prevent text zoom on Android
    document.documentElement.style.setProperty("-webkit-text-size-adjust", "100%");
    document.documentElement.style.setProperty("text-size-adjust", "100%");

    // Viewport is set to device-width in index.html for all platforms.
    // color-scheme: light only prevents Android force-dark from fading colors.

    // Redirect root → /pos for native POS builds
    const path = window.location.pathname;
    if (path === "/" || path === "/index.html" || path.endsWith("/index.html")) {
      window.history.replaceState({}, "", "/pos");
    }
  } catch (e) {
    // Never let viewport/route fixes crash the app
    console.error("[POS] native fix error:", e);
  }
}

applyNativeFixes();

/* ── Mount React ───────────────────────────────────────────── */

const rootEl = document.getElementById("root");

if (rootEl) {
  // Remove the inline HTML loading spinner before React paints
  const fallback = document.getElementById("boot-fallback");
  if (fallback) fallback.remove();

  createRoot(rootEl).render(<App />);
} else {
  console.error("[POS] #root element not found");
}
