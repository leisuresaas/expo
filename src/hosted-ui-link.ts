import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

const HOSTED_UI_LOCALES = new Set(["en", "zh-CN"]);

/** Map BCP 47-ish tag onto Hosted UI path locales. */
export function normalizeHostedUILocale(raw?: string | null): string {
  const v = (raw ?? "").trim().replace(/_/g, "-");
  if (!v) {
    return "";
  }
  const lower = v.toLowerCase();
  if (lower === "en" || lower === "en-us" || lower === "en-gb") {
    return "en";
  }
  if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans" || lower === "zh-hans-cn") {
    return "zh-CN";
  }
  for (const canonical of HOSTED_UI_LOCALES) {
    if (canonical.toLowerCase() === lower) {
      return canonical;
    }
  }
  return "";
}

function pathSegments(url: string): string[] {
  try {
    const parsed = Linking.parse(url);
    return (parsed.path ?? "").replace(/^\//, "").split("/").filter(Boolean);
  } catch {
    return [];
  }
}

/** True when URL is a Hosted UI password-reset page (path ends with /reset-password). */
export function isHostedUIPasswordResetURL(url: string): boolean {
  try {
    const path = (Linking.parse(url).path ?? "").replace(/^\//, "");
    return /(^|\/)reset-password\/?$/.test(path) || /\/reset-password\b/.test(path);
  } catch {
    return false;
  }
}

/** True when URL is Hosted UI `/{locale}/open` handoff. */
export function isHostedUIOpenHandoffURL(url: string): boolean {
  const segs = pathSegments(url);
  if (segs.length >= 2 && normalizeHostedUILocale(segs[0]) && segs[1] === "open") {
    return true;
  }
  return segs.length === 1 && segs[0] === "open";
}

/** Business HTTPS URL from `/{locale}/open?next=…`. */
export function hostedUIURLFromOpenHandoff(url: string): string | null {
  if (!isHostedUIOpenHandoffURL(url)) {
    return null;
  }
  try {
    const parsed = Linking.parse(url);
    const q = parsed.queryParams?.next;
    const next = typeof q === "string" ? q : Array.isArray(q) ? q[0] : "";
    const trimmed = (next ?? "").trim();
    if (!trimmed) {
      return null;
    }
    if (/^https:\/\//i.test(trimmed)) {
      return trimmed;
    }
    if (trimmed.startsWith("/")) {
      const base = Linking.parse(url);
      const host = base.hostname;
      if (!host) {
        return null;
      }
      const scheme = base.scheme === "http" ? "http" : "https";
      return `${scheme}://${host}${trimmed}`;
    }
    return null;
  } catch {
    return null;
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

/** Rewrite Hosted UI path locale segment (insert or replace). */
export function withHostedUILocale(url: string, locale?: string | null): string {
  const normalized = normalizeHostedUILocale(locale);
  const trimmed = url.trim();
  if (!normalized || !trimmed || !/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed);
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length > 0 && normalizeHostedUILocale(segs[0])) {
      segs[0] = normalized;
    } else {
      segs.unshift(normalized);
    }
    u.pathname = "/" + segs.join("/");
    return u.toString();
  } catch {
    return trimmed;
  }
}

export type OpenHostedUIInAppOptions = {
  locale?: string;
};

/**
 * Open Hosted UI identity URL inside an in-app browser.
 * Pass the HTTPS Universal Link / App Link URL unchanged — do not strip token.
 * Adds `terminal=mobile` when missing so Hosted UI uses the compact layout.
 * Optionally rewrites path locale to match the app language.
 * Never opens `/open` itself — resolves `next` to the business page first.
 */
export async function openHostedUIInApp(url: string, opts?: OpenHostedUIInAppOptions): Promise<void> {
  let trimmed = url.trim();
  const fromHandoff = hostedUIURLFromOpenHandoff(trimmed);
  if (fromHandoff) {
    trimmed = fromHandoff;
  }
  trimmed = withTerminalMobile(trimmed);
  if (opts?.locale) {
    trimmed = withHostedUILocale(trimmed, opts.locale);
  }
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
 * - HTTPS Hosted UI `/open?next=` → In-App Browser with business URL
 * - HTTPS Hosted UI reset-password → In-App Browser
 * - `{scheme}://auth/open?url=https…` → In-App Browser with embedded URL
 */
export async function handleHostedUILink(url: string, opts?: OpenHostedUIInAppOptions): Promise<boolean> {
  const fromOpen = hostedUIURLFromAppOpenLink(url);
  if (fromOpen) {
    await openHostedUIInApp(fromOpen, opts);
    return true;
  }
  if (isHostedUIOpenHandoffURL(url) || isHostedUIPasswordResetURL(url)) {
    await openHostedUIInApp(url, opts);
    return true;
  }
  return false;
}

/**
 * Subscribe to cold-start + foreground links for Hosted UI reset-password / open / auth/open.
 * Call once near the app root (e.g. inside AuthProvider children).
 */
export function useHostedUIPasswordResetLink(enabled = true, locale?: string): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const opts = locale ? { locale } : undefined;
    let active = true;
    (async () => {
      const initial = await Linking.getInitialURL();
      if (active && initial) {
        await handleHostedUILink(initial, opts);
      }
    })();
    const sub = Linking.addEventListener("url", ({ url }) => {
      void handleHostedUILink(url, opts);
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, [enabled, locale]);
}
