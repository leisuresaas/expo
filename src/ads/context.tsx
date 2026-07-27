import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { LeisureSaasClient } from "../client";
import { resolveGatewayUrlFromEnv } from "../gateway-url";
import type { PublicAdsRequestContext } from "../public-ads";
import { resolvePublishableKeyFromEnv } from "../publishable-key";
import { adsSurfaceKey } from "../platform";
import { appBundleId } from "./bundle-id";
import type { AdsTheme } from "./theme";

export type AdsProviderProps = {
  client: LeisureSaasClient;
  /** When set, feed/events use Public Ads API (no login required). */
  publishableKey?: string;
  /**
   * Platform API base for Public Ads.
   * Defaults to EXPO_PUBLIC_GATEWAY_URL, then client gateway URL in gateway mode.
   * Do not pass the OAuth issuer (Hosted UI login host).
   */
  publicAdsGatewayUrl?: string;
  /** Optional; when logged in, impressions may attach user_id on public events. */
  resolveAccessToken?: () => Promise<string | null>;
  theme?: AdsTheme;
  children: ReactNode;
};

type AdsContextValue = {
  client: LeisureSaasClient;
  resolveAccessToken?: () => Promise<string | null>;
  providerTheme?: AdsTheme;
  publicAds?: PublicAdsRequestContext;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdsProvider({
  client,
  publishableKey,
  publicAdsGatewayUrl,
  resolveAccessToken,
  theme,
  children,
}: AdsProviderProps) {
  const value = useMemo((): AdsContextValue => {
    const key = publishableKey?.trim() || client.configuredPublishableKey?.() || resolvePublishableKeyFromEnv();
    const gatewayUrl =
      publicAdsGatewayUrl?.trim() || resolveGatewayUrlFromEnv() || client.gatewayBaseUrl?.() || "";
    let publicAds: PublicAdsRequestContext | undefined;
    if (key && gatewayUrl) {
      publicAds = {
        gatewayUrl,
        publishableKey: key,
        surfaceKey: adsSurfaceKey(),
        bundleId: appBundleId(),
      };
    }
    return { client, resolveAccessToken, providerTheme: theme, publicAds };
  }, [client, publishableKey, publicAdsGatewayUrl, resolveAccessToken, theme]);

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAdsContext(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    throw new Error("Ad components must be used within AdsProvider");
  }
  return ctx;
}
