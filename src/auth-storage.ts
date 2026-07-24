import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const WEB_PROD_MSG =
  "OAuth token persistence is not supported on web production builds; use the native app.";

/** Metro / Expo web development (`npm start` in browser). */
export function isWebDev(): boolean {
  return Platform.OS === "web" && typeof __DEV__ !== "undefined" && __DEV__;
}

/** Web production / release build — no durable OAuth tokens. */
export function isWebProduction(): boolean {
  return Platform.OS === "web" && !isWebDev();
}

/** Throws when Web production would persist OAuth credentials. */
export function assertAuthStorageAllowed(): void {
  if (isWebProduction()) {
    throw new Error(WEB_PROD_MSG);
  }
}

export async function authGetItem(key: string): Promise<string | null> {
  if (Platform.OS !== "web") {
    return SecureStore.getItemAsync(key);
  }
  if (isWebDev()) {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function authSetItem(key: string, value: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  if (isWebDev()) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  throw new Error(WEB_PROD_MSG);
}

export async function authDeleteItem(key: string): Promise<void> {
  if (Platform.OS !== "web") {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  if (isWebDev()) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
