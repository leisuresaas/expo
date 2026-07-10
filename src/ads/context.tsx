import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { LeisureSaasClient } from "../client";
import type { PublicAdsRequestContext } from "../public-ads";
import { mobilePlatform } from "../platform";
import { appBundleId } from "./bundle-id";
import type { AdsTheme } from "./theme";

export type AdsProviderProps = {
  client: LeisureSaasClient;
  /** When set, feed/events use Public Ads API (no login required). */
  publishableKey?: string;
  /** Gateway base for public ads; defaults to client gateway URL in gateway mode. */
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
    const key = publishableKey?.trim() || client.configuredPublishableKey?.();
    const gatewayUrl = publicAdsGatewayUrl?.trim() || client.gatewayBaseUrl?.();
    let publicAds: PublicAdsRequestContext | undefined;
    if (key && gatewayUrl) {
      publicAds = {
        gatewayUrl,
        publishableKey: key,
        platform: mobilePlatform(),
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
