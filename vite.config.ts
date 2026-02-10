import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  // NOTE: Some POS tablets run an older Android System WebView that can't parse
  // modern JS (ES2020+/dynamic import), causing a blank white screen in the APK
  // while Chrome still works. This generates a legacy fallback bundle.
  plugins: [
    react(),
    legacy({
      // "nomodule" (legacy) bundle targets.
      // Keep this quite broad for older embedded WebViews.
      targets: ["Android >= 5", "Chrome >= 49"],

      // Don't override modernTargets – let Vite use its built-in modern
      // targets. This avoids the "modernTargets overrode builtin" warning
      // and ensures the modern bundle stays clean for Chrome 61+ WebViews.

      // Smaller output; polyfills included only when needed.
      modernPolyfills: true,
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Prevent duplicate React instances in native Capacitor builds
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
