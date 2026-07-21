import { appBundleId } from "./ads/bundle-id";
import { mobilePlatform } from "./platform";
import type { EnablePushOptions, MobilePlatform, RegisterDeviceTokenInput } from "./types";

type ExpoNotificationsModule = {
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getDevicePushTokenAsync: () => Promise<{ data: string; type?: string }>;
};

function loadNotifications(): ExpoNotificationsModule {
  try {
    // Optional peer: apps must install expo-notifications for enablePush/disablePush.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as ExpoNotificationsModule;
  } catch {
    throw new Error(
      "LeisureSaasClient.enablePush/disablePush requires peer dependency expo-notifications. Install it in your Expo app.",
    );
  }
}

function resolveAndroidPackage(opts?: EnablePushOptions): string | undefined {
  if (opts?.androidPackage?.trim()) return opts.androidPackage.trim();
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Application = require("expo-application") as { applicationId?: string | null };
    if (Application.applicationId?.trim()) return Application.applicationId.trim();
  } catch {
    // fall through to appBundleId
  }
  return appBundleId() || undefined;
}

function resolveBundleId(opts?: EnablePushOptions): string | undefined {
  if (opts?.bundleId?.trim()) return opts.bundleId.trim();
  return appBundleId() || undefined;
}

function resolveEnvironment(opts?: EnablePushOptions): "development" | "production" {
  if (opts?.environment === "development" || opts?.environment === "production") {
    return opts.environment;
  }
  return typeof __DEV__ !== "undefined" && __DEV__ ? "development" : "production";
}

export async function fetchNativeDevicePushToken(): Promise<string> {
  const Notifications = loadNotifications();
  const device = await Notifications.getDevicePushTokenAsync();
  const token = String(device.data ?? "").trim();
  if (!token) {
    throw new Error("LeisureSaasClient: empty device push token");
  }
  if (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")) {
    throw new Error(
      "LeisureSaasClient: ExponentPushToken is not supported; use a Dev Client / Store build with native FCM/APNs",
    );
  }
  return token;
}

export async function buildEnablePushRegistration(
  opts?: EnablePushOptions,
): Promise<RegisterDeviceTokenInput> {
  const Notifications = loadNotifications();
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== "granted") {
    throw new Error(`LeisureSaasClient.enablePush: notification permission ${permission.status}`);
  }

  const token = await fetchNativeDevicePushToken();
  const platform: MobilePlatform = opts?.platform ?? mobilePlatform();
  const input: RegisterDeviceTokenInput = {
    platform,
    token,
    environment: resolveEnvironment(opts),
  };
  if (platform === "android") {
    input.androidPackage = resolveAndroidPackage(opts);
  } else {
    input.bundleId = resolveBundleId(opts);
  }
  return input;
}
