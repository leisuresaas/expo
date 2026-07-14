"use client";

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
const THROTTLE_KEY = "leisuresaas_app_update_last_check_at";
const DEFAULT_FOREGROUND_THROTTLE_MS = 4 * 60 * 60 * 1000;

export type AppUpdateStatus = "idle" | "checking" | "up_to_date" | "recommended" | "required" | "error";

export type AppUpdateInfo = AppConfigResponse;

/** Override default Alert / Settings Card copy (server `update_message` still preferred for body). */
export type AppUpdateLabels = {
  requiredTitle?: string;
  recommendedTitle?: string;
  updateNow?: string;
  later?: string;
  update?: string;
  settingsTitle?: string;
  checkForUpdates?: string;
  checking?: string;
  openStore?: string;
  upToDate?: string;
  checkFailed?: string;
};

/** Headless Settings-page state: product owns all UI; SDK owns check / store actions. */
export type AppVersionSettingsState = {
  status: AppUpdateStatus;
  displayVersion: string;
  message: string | null;
  busy: boolean;
  canOpenStore: boolean;
  checkNow: () => Promise<void>;
  openStore: () => Promise<void>;
  labels: Required<AppUpdateLabels>;
  info: AppUpdateInfo | null;
  error: string | null;
};

export type AppVersionSettingsCardProps = {
  /** Custom Settings UI; omit to use the unstyled reference layout. */
  children?: (state: AppVersionSettingsState) => ReactNode;
};

const defaultLabels: Required<AppUpdateLabels> = {
  requiredTitle: "Update required",
  recommendedTitle: "Update available",
  updateNow: "Update now",
  later: "Later",
  update: "Update",
  settingsTitle: "App version",
  checkForUpdates: "Check for updates",
  checking: "Checking…",
  openStore: "Open store",
  upToDate: "You're up to date.",
  checkFailed: "Check failed. Try again.",
};

export type AppUpdateProviderProps = {
  publishableKey?: string;
  gatewayUrl?: string;
  locale?: string;
  labels?: AppUpdateLabels;
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
  labels: Required<AppUpdateLabels>;
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

function mergeLabels(partial?: AppUpdateLabels): Required<AppUpdateLabels> {
  return { ...defaultLabels, ...partial };
}

export function AppUpdateProvider({
  publishableKey,
  gatewayUrl,
  locale,
  labels: labelsProp,
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
  const labels = useMemo(() => mergeLabels(labelsProp), [labelsProp]);
  const callbacksRef = useRef({ onUpdateRequired, onUpdateRecommended });
  callbacksRef.current = { onUpdateRequired, onUpdateRecommended };
  const labelsRef = useRef(labels);
  labelsRef.current = labels;
  const displayVersion = useMemo(() => displayVersionString(), []);

  const skipped =
    (skipInDev && typeof __DEV__ !== "undefined" && __DEV__) || (skipOnWeb && Platform.OS === "web");

  const dismissForVersion = useCallback(async (latest: string) => {
    const v = latest.trim();
    if (!v) return;
    await SecureStore.setItemAsync(DISMISS_KEY_PREFIX + v, "1");
  }, []);

  const showDefaultAlert = useCallback(
    (next: AppConfigResponse) => {
      const L = labelsRef.current;
      const body =
        next.policy.update_message ||
        next.policy.release_notes ||
        (next.update.required ? "Please update to continue using the app." : "A new version is available.");

      if (next.update.required) {
        if (callbacksRef.current.onUpdateRequired) {
          callbacksRef.current.onUpdateRequired(next);
          return;
        }
        Alert.alert(
          L.requiredTitle,
          body,
          [{ text: L.updateNow, onPress: () => void Linking.openURL(next.policy.store_url) }],
          { cancelable: false },
        );
        return;
      }
      if (next.update.recommended) {
        if (callbacksRef.current.onUpdateRecommended) {
          callbacksRef.current.onUpdateRecommended(next);
          return;
        }
        Alert.alert(L.recommendedTitle, body, [
          {
            text: L.later,
            style: "cancel",
            onPress: () => {
              void dismissForVersion(next.policy.latest_version);
            },
          },
          { text: L.update, onPress: () => void Linking.openURL(next.policy.store_url) },
        ]);
      }
    },
    [dismissForVersion],
  );

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
        void SecureStore.setItemAsync(THROTTLE_KEY, String(lastCheckAt.current));

        if (next.update.required) {
          setStatus("required");
          if (!opts?.quiet) showDefaultAlert(next);
        } else if (next.update.recommended) {
          setStatus("recommended");
          const dismissed = await SecureStore.getItemAsync(DISMISS_KEY_PREFIX + next.policy.latest_version);
          // Auto-prompt skips dismissed; manual fresh check always shows the dialog.
          const shouldPrompt = opts?.fresh || !dismissed;
          if (shouldPrompt && !opts?.quiet) showDefaultAlert(next);
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
    if (latest) await dismissForVersion(latest);
  }, [info, dismissForVersion]);

  useEffect(() => {
    if (checkOnMount) void checkForUpdate();
  }, [checkOnMount, checkForUpdate]);

  useEffect(() => {
    if (!checkOnForeground || skipped) return;
    let cancelled = false;
    void (async () => {
      const raw = await SecureStore.getItemAsync(THROTTLE_KEY);
      const n = Number(raw ?? 0);
      if (!cancelled && Number.isFinite(n) && n > 0) lastCheckAt.current = n;
    })();
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (Date.now() - lastCheckAt.current < foregroundThrottleMs) return;
      void checkForUpdate();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [checkOnForeground, checkForUpdate, foregroundThrottleMs, skipped]);

  const value = useMemo(
    (): AppUpdateContextValue => ({
      status, info, error, displayVersion, labels, checkForUpdate, openStore, dismiss,
    }),
    [status, info, error, displayVersion, labels, checkForUpdate, openStore, dismiss],
  );

  return <AppUpdateContext.Provider value={value}>{children}</AppUpdateContext.Provider>;
}

export function useAppUpdate(): AppUpdateContextValue {
  const ctx = useContext(AppUpdateContext);
  if (!ctx) throw new Error("useAppUpdate must be used within AppUpdateProvider");
  return ctx;
}

/**
 * Settings-page headless API: version display + manual check + open store.
 * Prefer this over `AppVersionSettingsCard` when matching product branding.
 */
export function useAppVersionSettings(): AppVersionSettingsState {
  const { status, displayVersion, checkForUpdate, openStore, info, error, labels } = useAppUpdate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const checkNow = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const next = await checkForUpdate({ fresh: true });
      if (!next) {
        setMessage(labels.checkFailed);
        return;
      }
      if (next.update.required || next.update.recommended) {
        setMessage(next.policy.update_message || next.policy.release_notes || labels.recommendedTitle);
      } else {
        setMessage(labels.upToDate);
      }
    } finally {
      setBusy(false);
    }
  }, [checkForUpdate, labels.checkFailed, labels.recommendedTitle, labels.upToDate]);

  const canOpenStore = Boolean(info?.update.required || info?.update.recommended);

  return useMemo(
    (): AppVersionSettingsState => ({
      status,
      displayVersion,
      message,
      busy,
      canOpenStore,
      checkNow,
      openStore,
      labels,
      info,
      error,
    }),
    [status, displayVersion, message, busy, canOpenStore, checkNow, openStore, labels, info, error],
  );
}

/**
 * Optional reference Settings UI (unstyled). Prefer `useAppVersionSettings` + product layout.
 * Pass `children` as a render prop for full visual control without rewriting check logic.
 */
export function AppVersionSettingsCard({ children }: AppVersionSettingsCardProps) {
  const state = useAppVersionSettings();
  if (children) return <>{children(state)}</>;

  const { status, displayVersion, message, busy, canOpenStore, checkNow, openStore, labels } = state;
  return (
    <View style={{ gap: 8, paddingVertical: 8 }}>
      <Text style={{ fontSize: 16, fontWeight: "600" }}>{labels.settingsTitle}</Text>
      <Text style={{ opacity: 0.7 }}>{displayVersion}</Text>
      {message ? <Text>{message}</Text> : null}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Pressable
          onPress={() => void checkNow()}
          disabled={busy || status === "checking"}
          style={{ paddingVertical: 8, paddingHorizontal: 12, opacity: busy ? 0.5 : 1 }}
        >
          <Text>{busy || status === "checking" ? labels.checking : labels.checkForUpdates}</Text>
        </Pressable>
        {canOpenStore ? (
          <Pressable onPress={() => void openStore()} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
            <Text>{labels.openStore}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
