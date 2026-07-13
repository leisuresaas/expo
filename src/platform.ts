import { Platform } from "react-native";

import type { MobilePlatform } from "./types";

export function mobilePlatform(): MobilePlatform {
  return Platform.OS === "ios" ? "ios" : "android";
}

/** Surface key for Public / Integration ads feed (ios | android). */
export function adsSurfaceKey(): MobilePlatform {
  return mobilePlatform();
}

export function adsSurfaceHeaders(): Record<string, string> {
  return { "X-Ads-Surface-Key": adsSurfaceKey() };
}
