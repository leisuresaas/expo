import { createContext, useContext, useMemo, type ReactNode } from "react";

import { resolveGatewayUrlFromEnv } from "../gateway-url";
import type { PublicAdsRequestContext } from "../public-ads";
import { resolvePublishableKeyFromEnv } from "../publishable-key";
import { adsSurfaceKey } from "../platform";
import { appBundleId } from "./bundle-id";
import type { AdsTheme } from "./theme";

export type AdsProviderProps = {
  /** When set with gatewayUrl, feed/events use Public Ads API (no Integration Key). */
  publishableKey?: string;
  /**
   * Platform API base for Public Ads (`/v1/public/ads`).
   * Defaults to EXPO_PUBLIC_GATEWAY_URL.
   * Do not pass the OAuth issuer (Hosted UI login host).
   */
  gatewayUrl?: string;
  /** @deprecated Use gatewayUrl */
  publicAdsGatewayUrl?: string;
  /** Optional; when logged in, impressions may attach user_id on public events. */
  resolveAccessToken?: () => Promise<string | null>;
  theme?: AdsTheme;
  children: ReactNode;
};

type AdsContextValue = {
  resolveAccessToken?: () => Promise<string | null>;
  providerTheme?: AdsTheme;
  publicAds?: PublicAdsRequestContext;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdsProvider({
  publishableKey,
  gatewayUrl,
  publicAdsGatewayUrl,
  resolveAccessToken,
  theme,
  children,
}: AdsProviderProps) {
  const value = useMemo((): AdsContextValue => {
    const key = publishableKey?.trim() || resolvePublishableKeyFromEnv();
    const base =
      gatewayUrl?.trim() ||
      publicAdsGatewayUrl?.trim() ||
      resolveGatewayUrlFromEnv() ||
      "";
    let publicAds: PublicAdsRequestContext | undefined;
    if (key && base) {
      publicAds = {
        gatewayUrl: base,
        publishableKey: key,
        surfaceKey: adsSurfaceKey(),
        bundleId: appBundleId(),
      };
    }
    return { resolveAccessToken, providerTheme: theme, publicAds };
  }, [publishableKey, gatewayUrl, publicAdsGatewayUrl, resolveAccessToken, theme]);

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAdsContext(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    throw new Error("useAdsContext must be used within AdsProvider");
  }
  return ctx;
}
