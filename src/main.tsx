// Polyfill AbortController for older Android WebViews (pre-Chrome 66)
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';

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

    // 1) Prevent Android WebView "text autosize" / font boosting that can
    // completely change layout density versus desktop preview.
    document.documentElement.style.setProperty("-webkit-text-size-adjust", "100%");
    document.documentElement.style.setProperty("text-size-adjust", "100%");

    // 2) Force a stable tablet viewport for the POS UI.
    // Many POS tablets report a smaller CSS width due to DPR/accessibility scaling,
    // which makes the POS fall into a "mobile" layout and look totally different.
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.setAttribute(
        "content",
        [
          // Lock to actual tablet resolution (1280x800 for 16:10 POS tablets)
          "width=1280",
          "height=800",
          // Prevent unexpected zoom/scale on older WebViews
          "initial-scale=1",
          "maximum-scale=1",
          "user-scalable=no",
          // Safe-area on newer devices (harmless on old ones)
          "viewport-fit=cover",
        ].join(", ")
      );
    }
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
