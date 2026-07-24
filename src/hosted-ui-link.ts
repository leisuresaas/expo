import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

/** True when URL is a Hosted UI password-reset page (path ends with /reset-password). */
export function isHostedUIPasswordResetURL(url: string): boolean {
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? "").replace(/^\//, "");
    return /(^|\/)reset-password\/?$/.test(path) || /\/reset-password\b/.test(path);
  } catch {
    return false;
  }
}

/** True when deep link path is auth/open (custom scheme from Hosted UI). */
function isAppOpenPath(url: string): boolean {
  try {
    const parsed = Linking.parse(url);
    const host = (parsed.hostname ?? "").replace(/^\//, "");
    const path = (parsed.path ?? "").replace(/^\//, "");
    if (host === "auth" && (path === "open" || path === "")) {
      return true;
    }
    return path === "auth/open" || path.endsWith("/auth/open");
  } catch {
    return false;
  }
}

/** HTTPS page URL embedded in `{scheme}://auth/open?url=…`. */
export function hostedUIURLFromAppOpenLink(url: string): string | null {
  if (!isAppOpenPath(url)) {
    return null;
  }
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams?.url;
    const embedded = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
    const trimmed = (embedded ?? "").trim();
    if (!trimmed || !/^https:\/\//i.test(trimmed)) {
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/** Ensure Hosted UI opens with compact mobile layout when terminal is absent. */
export function withTerminalMobile(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed);
    if (!u.searchParams.get("terminal")) {
      u.searchParams.set("terminal", "mobile");
    }
    return u.toString();
  } catch {
    return trimmed;
  }
}

/**
 * Open Hosted UI password-reset (or other identity) URL inside an in-app browser.
 * Pass the HTTPS Universal Link / App Link URL unchanged — do not strip token.
 * Adds `terminal=mobile` when missing so Hosted UI uses the compact layout.
 */
export async function openHostedUIInApp(url: string): Promise<void> {
  const trimmed = withTerminalMobile(url.trim());
  if (!trimmed) {
    return;
  }
  await WebBrowser.openBrowserAsync(trimmed, {
    createTask: false,
    showInRecents: true,
  });
}

/**
 * Handle an incoming deep link:
 * - HTTPS Hosted UI reset-password → In-App Browser
 * - `{scheme}://auth/open?url=https…` → In-App Browser with embedded URL
 */
export async function handleHostedUILink(url: string): Promise<boolean> {
  const fromOpen = hostedUIURLFromAppOpenLink(url);
  if (fromOpen) {
    await openHostedUIInApp(fromOpen);
    return true;
  }
  if (!isHostedUIPasswordResetURL(url)) {
    return false;
  }
  await openHostedUIInApp(url);
  return true;
}

/**
 * Subscribe to cold-start + foreground links for Hosted UI reset-password / auth/open.
 * Call once near the app root (e.g. inside AuthProvider children).
 */
export function useHostedUIPasswordResetLink(enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    (async () => {
      const initial = await Linking.getInitialURL();
      if (active && initial) {
        await handleHostedUILink(initial);
      }
    })();
    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleHostedUILink(url);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [enabled]);
}
