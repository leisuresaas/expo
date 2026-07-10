import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { LeisureSaasClient } from "../client";
import type { AdsTheme } from "./theme";

export type AdsProviderProps = {
  client: LeisureSaasClient;
  resolveAccessToken: () => Promise<string | null>;
  theme?: AdsTheme;
  children: ReactNode;
};

type AdsContextValue = {
  client: LeisureSaasClient;
  resolveAccessToken: () => Promise<string | null>;
  providerTheme?: AdsTheme;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdsProvider({ client, resolveAccessToken, theme, children }: AdsProviderProps) {
  const value = useMemo(
    () => ({ client, resolveAccessToken, providerTheme: theme }),
    [client, resolveAccessToken, theme],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

export function useAdsContext(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    throw new Error("Ad components must be used within AdsProvider");
  }
  return ctx;
}
