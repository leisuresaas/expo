import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Alert, AppState, Linking, Platform, Pressable, Text, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

import { appBundleId } from "../ads/bundle-id";
import { mobilePlatform } from "../platform";
import { getPublicAppConfig, type AppConfigResponse } from "../public-app-config";

const DISMISS_KEY_PREFIX = "leisuresaas_app_update_dismissed_";
const DEFAULT_FOREGROUND_THROTTLE_MS = 4 * 60 * 60 * 1000;

export type AppUpdateStatus = "idle" | "checking" | "up_to_date" | "recommended" | "required" | "error";

export type AppUpdateInfo = AppConfigResponse;

export type AppUpdateProviderProps = {
  publishableKey?: string;
  gatewayUrl?: string;
  locale?: string;
  checkOnMount?: boolean;
  checkOnForeground?: boolean;
  foregroundThrottleMs?: number;
  skipInDev?: boolean;
  skipOnWeb?: boolean;
  onUpdateRequired?: (info: AppUpdateInfo) => void;
  onUpdateRecommended?: (info: AppUpdateInfo) => void;
  children: ReactNode;
};

type AppUpdateContextValue = {
  status: AppUpdateStatus;
  info: AppUpdateInfo | null;
  error: string | null;
  displayVersion: string;
  checkForUpdate: (opts?: { fresh?: boolean; quiet?: boolean }) => Promise<AppUpdateInfo | null>;
  openStore: () => Promise<void>;
  dismiss: () => Promise<void>;
};

const AppUpdateContext = createContext<AppUpdateContextValue | null>(null);

function nativeAppVersion(): string {
  return Constants.nativeApplicationVersion?.trim() || Constants.expoConfig?.version?.trim() || "0.0.0";
}

function nativeAppBuild(): string {
  return Constants.nativeBuildVersion?.trim() || "";
}

function displayVersionString(): string {
  const v = nativeAppVersion();
  const b = nativeAppBuild();
  return b ? `${v} (${b})` : v;
}

export function AppUpdateProvider({
  publishableKey,
  gatewayUrl,
  locale,
  checkOnMount = true,
  checkOnForeground = true,
  foregroundThrottleMs = DEFAULT_FOREGROUND_THROTTLE_MS,
  skipInDev = true,
  skipOnWeb = true,
  onUpdateRequired,
  onUpdateRecommended,
  children,
}: AppUpdateProviderProps) {
  const [status, setStatus] = useState<AppUpdateStatus>("idle");
  const [info, setInfo] = useState<AppUpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastCheckAt = useRef(0);
  const callbacksRef = useRef({ onUpdateRequired, onUpdateRecommended });
  callbacksRef.current = { onUpdateRequired, onUpdateRecommended };
  const displayVersion = useMemo(() => displayVersionString(), []);

  const skipped =
    (skipInDev && typeof __DEV__ !== "undefined" && __DEV__) || (skipOnWeb && Platform.OS === "web");

  const showDefaultAlert = useCallback((next: AppConfigResponse) => {
    if (next.update.required) {
      if (callbacksRef.current.onUpdateRequired) {
        callbacksRef.current.onUpdateRequired(next);
        return;
      }
      Alert.alert(
        "Update required",
        next.policy.update_message || "Please update to continue using the app.",
        [{ text: "Update now", onPress: () => void Linking.openURL(next.policy.store_url) }],
        { cancelable: false },
      );
      return;
    }
    if (next.update.recommended) {
      if (callbacksRef.current.onUpdateRecommended) {
        callbacksRef.current.onUpdateRecommended(next);
        return;
      }
      Alert.alert(
        "Update available",
        next.policy.update_message || next.policy.release_notes || "A new version is available.",
        [
          {
            text: "Later",
            style: "cancel",
            onPress: () => {
              void SecureStore.setItemAsync(DISMISS_KEY_PREFIX + next.policy.latest_version, "1");
            },
          },
          { text: "Update", onPress: () => void Linking.openURL(next.policy.store_url) },
        ],
      );
    }
  }, []);

  const checkForUpdate = useCallback(
    async (opts?: { fresh?: boolean; quiet?: boolean }) => {
      const key = publishableKey?.trim();
      const gw = gatewayUrl?.trim();
      if (!key || !gw || skipped) {
        return null;
      }
      setStatus("checking");
      setError(null);
      try {
        const next = await getPublicAppConfig(
          {
            gatewayUrl: gw,
            publishableKey: key,
            platform: mobilePlatform(),
            bundleId: appBundleId(),
            locale,
          },
          {
            appVersion: nativeAppVersion(),
            appBuild: nativeAppBuild(),
            fresh: opts?.fresh,
          },
        );
        setInfo(next);
        lastCheckAt.current = Date.now();

        if (next.update.required) {
          setStatus("required");
          if (!opts?.quiet) showDefaultAlert(next);
        } else if (next.update.recommended) {
          setStatus("recommended");
          const dismissed = await SecureStore.getItemAsync(DISMISS_KEY_PREFIX + next.policy.latest_version);
          if (!dismissed || opts?.fresh) {
            if (!opts?.quiet) showDefaultAlert(next);
          }
        } else {
          setStatus("up_to_date");
        }
        return next;
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "update check failed");
        return null;
      }
    },
    [publishableKey, gatewayUrl, locale, skipped, showDefaultAlert],
  );

  const openStore = useCallback(async () => {
    const url = info?.policy.store_url?.trim();
    if (url) await Linking.openURL(url);
  }, [info]);

  const dismiss = useCallback(async () => {
    const latest = info?.policy.latest_version;
    if (latest) await SecureStore.setItemAsync(DISMISS_KEY_PREFIX + latest, "1");
  }, [info]);

  useEffect(() => {
    if (checkOnMount) void checkForUpdate();
  }, [checkOnMount, checkForUpdate]);

  useEffect(() => {
    if (!checkOnForeground || skipped) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (Date.now() - lastCheckAt.current < foregroundThrottleMs) return;
      void checkForUpdate();
    });
    return () => sub.remove();
  }, [checkOnForeground, checkForUpdate, foregroundThrottleMs, skipped]);

  const value = useMemo(
    (): AppUpdateContextValue => ({
      status, info, error, displayVersion, checkForUpdate, openStore, dismiss,
    }),
    [status, info, error, displayVersion, checkForUpdate, openStore, dismiss],
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) throw new Error("useAppUpdate must be used within AppUpdateProvider");
  return ctx;
}

export function AppVersionSettingsCard() {
  const { status, displayVersion, checkForUpdate, openStore, info, error } = useAppUpdate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onCheck() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await checkForUpdate({ fresh: true });
      if (!next) {
        setMessage(error || "Check failed. Try again.");
        return;
      }
      if (next.update.required || next.update.recommended) {
        setMessage(next.policy.update_message || "A newer version is available.");
      } else {
        setMessage("You're up to date.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>App version</Text>
      <Text style={{ opacity: 0.7 }}>{displayVersion}</Text>
      {message ? <Text>{message}</Text> : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={() => void onCheck()}
          disabled={busy || status === "checking"}
          style={{ paddingVertical: 8, paddingHorizontal: 12, opacity: busy ? 0.5 : 1 }}
        >
          <Text>{busy || status === "checking" ? "Checking…" : "Check for updates"}</Text>
        </Pressable>
        {info?.update.required || info?.update.recommended ? (
          <Pressable onPress={() => void openStore()} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text>Open store</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
