import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

export type InAppNavigate = (path: string) => void;

type OpenAdClickOptions = {
  onInAppNavigate?: InAppNavigate;
};

async function openExternal(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

/**
 * Opens feed click_url. Sends X-Ads-Click: resolve so the gateway can return
 * an in-app path instead of a browser redirect. Click is recorded by that GET.
 */
export async function openAdClickUrl(url: string, options?: OpenAdClickOptions): Promise<void> {
  if (!url) {
    return;
  }
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", "X-Ads-Click": "resolve" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (res.ok && contentType.includes("application/json")) {
      const data = (await res.json()) as { kind?: string; path?: string; url?: string };
      if (data.kind === "in_app" && data.path?.startsWith("/")) {
        if (options?.onInAppNavigate) {
          options.onInAppNavigate(data.path);
        } else {
          console.warn("Ad: in-app click ignored; pass AdsProvider onInAppNavigate");
        }
        return;
      }
      if (data.kind === "external" && data.url?.startsWith("https://")) {
        await openExternal(data.url);
        return;
      }
      console.warn("Ad: unexpected click resolve body");
      return;
    }
    if (res.url && res.url !== url && res.url.startsWith("https://")) {
      await openExternal(res.url);
      return;
    }
    if (!res.ok) {
      console.warn("Ad: click resolve failed", res.status);
      return;
    }
  } catch (err) {
    console.warn("Ad: click resolve failed", err);
  }
  await openExternal(url);
}
