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
      // Broad but safe target for older WebViews.
      targets: ["Android >= 7", "Chrome >= 70"],
      // Smaller output; polyfills included only when needed.
      modernPolyfills: true,
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ensure the base bundle is not too new for older WebViews.
    target: "es2017",
  },
}));
