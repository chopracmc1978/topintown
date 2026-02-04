// Polyfill AbortController for older Android WebViews (pre-Chrome 66)
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';

// Polyfill ResizeObserver for older Android WebViews (pre-Chrome 64)
import ResizeObserver from 'resize-observer-polyfill';
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}

import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import "./index.css";

/**
 * POS Native boot routing
 *
 * Capacitor native apps typically start at "/" (or "/index.html").
 * The POS tablet build must always start at "/pos".
 */
function applyNativePosViewportFixes() {
  try {
    if (!Capacitor.isNativePlatform()) return;

    // 1) Prevent Android WebView "text autosize" / font boosting
    document.documentElement.style.setProperty("-webkit-text-size-adjust", "100%");
    document.documentElement.style.setProperty("text-size-adjust", "100%");

    // 2) Force HD rendering at native device resolution
    const dpr = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width * dpr;
    const screenHeight = window.screen.height * dpr;
    
    // Use actual screen dimensions for maximum clarity
    const targetWidth = Math.max(screenWidth, 1920);
    
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        "content",
        [
          // Use device's native width for HD rendering
          `width=${targetWidth}`,
          // Force 1:1 pixel mapping (no scaling)
          "initial-scale=1.0",
          "maximum-scale=1.0",
          "minimum-scale=1.0",
          "user-scalable=no",
          // HD density hint for legacy Android WebViews
          "target-densitydpi=device-dpi",
          // Safe-area on newer devices
          "viewport-fit=cover",
        ].join(", ")
      );
    }

    // 3) Force crisp rendering on the root element
    document.documentElement.style.setProperty("image-rendering", "crisp-edges");
    document.documentElement.style.setProperty("-webkit-image-rendering", "crisp-edges");
  } catch {
    // never block boot
  }
}

function forcePosRouteForNativeBoot() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const path = window.location.pathname;
    const isRoot = path === "/" || path.endsWith("/index.html") || path === "/index.html";
    if (isRoot) {
      window.history.replaceState({}, "", "/pos");
    }
  } catch {
    // no-op: never block boot
  }
}

applyNativePosViewportFixes();
forcePosRouteForNativeBoot();

type BootIssue = {
  type: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  time: string;
};

declare global {
  interface Window {
    __bootIssues?: BootIssue[];
  }
}

function recordBootIssue(issue: BootIssue) {
  window.__bootIssues = window.__bootIssues || [];
  window.__bootIssues.push(issue);
  // keep last 10
  if (window.__bootIssues.length > 10) window.__bootIssues.shift();
}

function BootCrashScreen({ title, details }: { title: string; details?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">
          The POS app failed to start. This screen is shown so it doesn’t stay white/blank.
        </p>
        {details ? (
          <pre className="text-xs whitespace-pre-wrap rounded-md bg-muted p-3 text-muted-foreground max-h-64 overflow-auto">
            {details}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found");
}

// Register *early* global handlers (before App imports) to prevent silent white screens.
window.addEventListener("error", (event) => {
  const err = event.error instanceof Error ? event.error : undefined;
  recordBootIssue({
    type: "error",
    message: err?.message || event.message || "Unknown error",
    stack: err?.stack,
    time: new Date().toISOString(),
  });
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const err = reason instanceof Error ? reason : undefined;
  recordBootIssue({
    type: "unhandledrejection",
    message: err?.message || String(reason) || "Unhandled rejection",
    stack: err?.stack,
    time: new Date().toISOString(),
  });
});

const root = createRoot(rootEl);

async function mount() {
  // If nothing renders for a while, show a helpful fallback.
  const timeout = window.setTimeout(() => {
    if (rootEl.childElementCount === 0) {
      const issues = window.__bootIssues || [];
      const details = issues
        .map((i) => `[${i.time}] ${i.type}: ${i.message}${i.stack ? `\n${i.stack}` : ""}`)
        .join("\n\n");
      root.render(
        <BootCrashScreen
          title="Still loading POS…"
          details={details || "No JS errors captured yet. This may be a network/WebView loading issue."}
        />
      );
    }
  }, 8000);

  try {
    const { default: App } = await import("./App.tsx");
    root.render(<App />);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const issues = window.__bootIssues || [];
    const details = [
      `Boot import error: ${err.message}`,
      err.stack || "",
      issues.length
        ? `\nCaptured issues:\n${issues
            .map((i) => `- [${i.time}] ${i.type}: ${i.message}`)
            .join("\n")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    root.render(<BootCrashScreen title="POS failed to start" details={details} />);
  } finally {
    window.clearTimeout(timeout);
  }
}

void mount();
