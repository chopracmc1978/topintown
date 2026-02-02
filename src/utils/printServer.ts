export const DEFAULT_PRINT_SERVER_URL = "http://localhost:3001";

/**
 * Normalizes a user-entered print server address into a fetch-safe base URL.
 *
 * Examples:
 *  - "192.168.0.10" -> "http://192.168.0.10:3001"
 *  - "http://192.168.0.10" -> "http://192.168.0.10:3001"
 *  - "http://192.168.0.10:3001/" -> "http://192.168.0.10:3001"
 */
export function normalizePrintServerUrl(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `http://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (!url.port) url.port = "3001";

    // We only want the origin as a base URL for /health and /print.
    return `${url.protocol}//${url.hostname}:${url.port}`;
  } catch {
    // If URL parsing fails, return the raw trimmed value.
    // Callers should handle failures by showing "offline" / error toast.
    return trimmed.replace(/\/+$/, "");
  }
}

export function getPrintServerUrl(): string {
  const raw = localStorage.getItem("print_server_url") ?? DEFAULT_PRINT_SERVER_URL;
  return normalizePrintServerUrl(raw) || DEFAULT_PRINT_SERVER_URL;
}

export function savePrintServerUrl(input: string): string {
  const normalized = normalizePrintServerUrl(input) || "";
  if (normalized) {
    localStorage.setItem("print_server_url", normalized);
  } else {
    localStorage.removeItem("print_server_url");
  }
  return normalized;
}
