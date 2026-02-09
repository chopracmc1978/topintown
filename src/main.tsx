// Boot breadcrumb
if (typeof window !== 'undefined' && (window as any).__bootLog) {
  (window as any).__bootLog.push('main.tsx: start');
}

// Polyfill AbortController for older Android WebViews (pre-Chrome 66)
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  require('abortcontroller-polyfill/dist/polyfill-patch-fetch');
} catch {
  try {
    import('abortcontroller-polyfill/dist/polyfill-patch-fetch').catch(() => {});
  } catch {}
}

// Polyfill ResizeObserver for older Android WebViews (pre-Chrome 64)
try {
  if (typeof window !== 'undefined' && !window.ResizeObserver) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const RO = require('resize-observer-polyfill');
    window.ResizeObserver = RO.default || RO;
  }
} catch {
  try {
    if (typeof window !== 'undefined' && !window.ResizeObserver) {
      import('resize-observer-polyfill').then(mod => {
        window.ResizeObserver = mod.default || (mod as any);
      }).catch(() => {});
    }
  } catch {}
}

import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import "./index.css";

// Boot breadcrumb helper
function bootLog(msg: string) {
  try {
    console.log('[POS-BOOT] ' + msg);
    if ((window as any).__bootLog) (window as any).__bootLog.push(msg);
  } catch {}
}

bootLog('imports done');

/**
 * POS Native boot routing
 */
function applyNativePosViewportFixes() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    bootLog('native platform detected');

    document.documentElement.style.setProperty("-webkit-text-size-adjust", "100%");
    document.documentElement.style.setProperty("text-size-adjust", "100%");

    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        "content",
        [
          "width=1920",
          "initial-scale=1.0",
          "maximum-scale=1.0",
          "minimum-scale=1.0",
          "user-scalable=no",
          "target-densitydpi=device-dpi",
          "viewport-fit=cover",
        ].join(", ")
      );
    }

    document.documentElement.style.setProperty("image-rendering", "crisp-edges");
    document.documentElement.style.setProperty("-webkit-image-rendering", "crisp-edges");
  } catch (e) {
    bootLog('viewport fix error: ' + String(e));
  }
}

function forcePosRouteForNativeBoot() {
  try {
    if (!Capacitor.isNativePlatform()) return;
    const path = window.location.pathname;
    const isRoot = path === "/" || path.endsWith("/index.html") || path === "/index.html";
    if (isRoot) {
      window.history.replaceState({}, "", "/pos");
      bootLog('redirected to /pos');
    }
  } catch (e) {
    bootLog('route fix error: ' + String(e));
  }
}

try { applyNativePosViewportFixes(); } catch {}
try { forcePosRouteForNativeBoot(); } catch {}

bootLog('pre-render');

type BootIssue = {
  type: "error" | "unhandledrejection";
  message: string;
  stack?: string;
  time: string;
};

declare global {
  interface Window {
    __bootIssues?: BootIssue[];
    __bootLog?: string[];
  }
}

function recordBootIssue(issue: BootIssue) {
  window.__bootIssues = window.__bootIssues || [];
  window.__bootIssues.push(issue);
  if (window.__bootIssues.length > 10) window.__bootIssues.shift();
  bootLog(issue.type + ': ' + issue.message);
}

function BootCrashScreen({ title, details }: { title: string; details?: string }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{title}</h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '12px' }}>
          The POS app failed to start. This screen is shown so it doesn't stay white/blank.
        </p>
        {details ? (
          <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap', background: '#1e293b', padding: '12px', borderRadius: '8px', color: '#fbbf24', maxHeight: '250px', overflow: 'auto' }}>
            {details}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ marginTop: '12px', background: '#3b82f6', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
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

// Register early global handlers
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
  bootLog('mount() called');

  // Reference to inline boot fallback
  const fallback = document.getElementById('boot-fallback');

  // Show crash screen if nothing renders after 5 seconds
  const timeout = window.setTimeout(() => {
    const issues = window.__bootIssues || [];
    const logs = window.__bootLog || [];
    const details = [
      issues.map((i) => `[${i.time}] ${i.type}: ${i.message}${i.stack ? `\n${i.stack}` : ""}`).join("\n\n"),
      '\n--- Boot Log ---\n' + logs.join('\n'),
    ].filter(Boolean).join("\n");

    root.render(
      <BootCrashScreen
        title="Still loading POS…"
        details={details || "No JS errors captured yet. This may be a network/WebView loading issue."}
      />
    );
  }, 5000);

  try {
    bootLog('importing App');
    const { default: App } = await import("./App.tsx");
    bootLog('App imported, rendering');

    // Remove inline fallback before React render
    if (fallback) fallback.remove();

    root.render(<App />);
    bootLog('App rendered');
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    bootLog('mount error: ' + err.message);

    const issues = window.__bootIssues || [];
    const logs = window.__bootLog || [];
    const details = [
      `Boot import error: ${err.message}`,
      err.stack || "",
      issues.length
        ? `\nCaptured issues:\n${issues.map((i) => `- [${i.time}] ${i.type}: ${i.message}`).join("\n")}`
        : "",
      '\n--- Boot Log ---\n' + logs.join('\n'),
    ].filter(Boolean).join("\n");

    // Remove inline fallback
    if (fallback) fallback.remove();

    root.render(<BootCrashScreen title="POS failed to start" details={details} />);
  } finally {
    window.clearTimeout(timeout);
  }
}

void mount();
