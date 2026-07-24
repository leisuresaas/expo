import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
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

import { accessNeedsRefresh, refreshOAuthTokens } from "./auth-session";
import { useHostedUIPasswordResetLink } from "./hosted-ui-link";
import type { LeisureSaasAuthConfig } from "./types";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_SCOPES = ["openid", "profile"];
const DEFAULT_REFRESH_STORAGE_KEY = "leisuresaas_refresh_token";

export type LeisureSaasAuthContextValue = {
  accessToken: string | null;
  redirectUri: string;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  /** Returns a valid access token, refreshing when near expiry. */
  resolveAccessToken: () => Promise<string | null>;
};

const LeisureSaasAuthContext = createContext<LeisureSaasAuthContextValue | null>(null);

export type LeisureSaasAuthProviderProps = {
  config: LeisureSaasAuthConfig;
  children: ReactNode;
};

export function LeisureSaasAuthProvider({ config, children }: LeisureSaasAuthProviderProps) {
  const issuer = config.issuer.replace(/\/$/, "");
  const storageKey = config.storageKey ?? "leisuresaas_access_token";
  const refreshStorageKey = config.refreshStorageKey ?? DEFAULT_REFRESH_STORAGE_KEY;
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: config.redirectScheme,
    path: config.redirectPath ?? "auth/callback",
  });
  useHostedUIPasswordResetLink(config.handlePasswordResetLinks !== false);
  const discovery = useMemo(
    () => ({
      authorizationEndpoint: `${issuer}/oauth/authorize`,
      tokenEndpoint: `${issuer}/oauth/token`,
    }),
    [issuer],
  );
  const scopes = config.scopes ?? DEFAULT_SCOPES;

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const persistTokens = useCallback(
    async (access: string, refresh?: string) => {
      await SecureStore.setItemAsync(storageKey, access);
      if (refresh) {
        await SecureStore.setItemAsync(refreshStorageKey, refresh);
      }
      setAccessToken(access);
    },
    [refreshStorageKey, storageKey],
  );

  const refreshStoredTokens = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) {
      return refreshInFlight.current;
    }
    const task = (async () => {
      const refreshToken = (await SecureStore.getItemAsync(refreshStorageKey))?.trim();
      if (!refreshToken) {
        return (await SecureStore.getItemAsync(storageKey))?.trim() || null;
      }
      try {
        const tokens = await refreshOAuthTokens(issuer, config.clientId, refreshToken);
        await persistTokens(tokens.accessToken, tokens.refreshToken ?? refreshToken);
        return tokens.accessToken;
      } catch (err) {
        console.warn("LeisureSaas OAuth refresh failed", err);
        return (await SecureStore.getItemAsync(storageKey))?.trim() || null;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = task;
    return task;
  }, [config.clientId, issuer, persistTokens, refreshStorageKey, storageKey]);

  const resolveAccessToken = useCallback(async (): Promise<string | null> => {
    const current = (await SecureStore.getItemAsync(storageKey))?.trim() || accessToken;
    if (!current) {
      return null;
    }
    if (!accessNeedsRefresh(current)) {
      return current;
    }
    return refreshStoredTokens();
  }, [accessToken, refreshStoredTokens, storageKey]);

  useEffect(() => {
    (async () => {
      const stored = (await SecureStore.getItemAsync(storageKey))?.trim() || null;
      if (!stored) {
        setAccessToken(null);
        setLoading(false);
        return;
      }
      if (accessNeedsRefresh(stored)) {
        const refreshed = await refreshStoredTokens();
        setAccessToken(refreshed);
      } else {
        setAccessToken(stored);
      }
      setLoading(false);
    })();
  }, [refreshStoredTokens, storageKey]);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes,
    },
    discovery,
  );

  useEffect(() => {
    if (response?.type !== "success" || !response.params.code) {
      return;
    }
    const code = response.params.code;
    (async () => {
      setLoading(true);
      try {
        const tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId: config.clientId,
            code,
            redirectUri,
            extraParams: { code_verifier: request?.codeVerifier ?? "" },
          },
          discovery,
        );
        const token = tokenRes.accessToken?.trim();
        if (!token) {
          throw new Error("missing access_token");
        }
        await persistTokens(token, tokenRes.refreshToken?.trim());
      } catch (err) {
        console.warn("LeisureSaas OAuth exchange failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [config.clientId, discovery, persistTokens, redirectUri, request?.codeVerifier, response]);

  const login = useCallback(async () => {
    if (!request) {
      throw new Error("OAuth request not ready");
    }
    await promptAsync();
  }, [promptAsync, request]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(storageKey);
    await SecureStore.deleteItemAsync(refreshStorageKey);
    setAccessToken(null);
  }, [refreshStorageKey, storageKey]);

  const value = useMemo(
    () => ({ accessToken, redirectUri, loading, login, logout, resolveAccessToken }),
    [accessToken, redirectUri, loading, login, logout, resolveAccessToken],
  );

  return <LeisureSaasAuthContext.Provider value={value}>{children}</LeisureSaasAuthContext.Provider>;
}

export function useLeisureSaasAuth(): LeisureSaasAuthContextValue {
  const ctx = useContext(LeisureSaasAuthContext);
  if (!ctx) {
    throw new Error("useLeisureSaasAuth must be used within LeisureSaasAuthProvider");
  }
  return ctx;
}
