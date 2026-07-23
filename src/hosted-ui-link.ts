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

/**
 * Open Hosted UI password-reset (or other identity) URL inside an in-app browser.
 * Pass the HTTPS Universal Link / App Link URL unchanged — do not strip token.
 */
export async function openHostedUIInApp(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) {
    return;
  }
  await WebBrowser.openBrowserAsync(trimmed, {
    createTask: false,
    showInRecents: true,
  });
}

/** Handle an incoming deep link: if it is a password-reset Hosted UI URL, open In-App Browser. */
export async function handleHostedUILink(url: string): Promise<boolean> {
  if (!isHostedUIPasswordResetURL(url)) {
    return false;
  }
  await openHostedUIInApp(url);
  return true;
}

/**
 * Subscribe to cold-start + foreground Universal Links for Hosted UI reset-password.
 * Call once near the app root (e.g. inside LeisureSaasAuthProvider children).
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
