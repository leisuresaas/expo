import * as AuthSession from "expo-auth-session";
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

import { AuthLoginError, toAuthLoginError } from "./auth-errors";

export type { AuthLoginErrorCode } from "./auth-errors";
export { AuthLoginError } from "./auth-errors";
import { accessNeedsRefresh, refreshOAuthTokens } from "./auth-session";
import {
  assertAuthStorageAllowed,
  authDeleteItem,
  authGetItem,
  authSetItem,
  isWebProduction,
} from "./auth-storage";
import { normalizeHostedUILocale, useHostedUIPasswordResetLink } from "./hosted-ui-link";
import type { AuthConfig } from "./types";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_SCOPES = ["openid", "profile"];
const DEFAULT_REFRESH_STORAGE_KEY = "leisuresaas_refresh_token";
const DEFAULT_TERMINAL = "mobile";

export type AuthContextValue = {
  accessToken: string | null;
  redirectUri: string;
  loading: boolean;
  /** Last login failure; cleared on success or logout. Prefer try/catch on `login()`. */
  lastError: AuthLoginError | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  /** Returns a valid access token, refreshing when near expiry. */
  resolveAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export type AuthProviderProps = {
  config: AuthConfig;
  children: ReactNode;
};

export function AuthProvider({ config, children }: AuthProviderProps) {
  const issuer = config.issuer.replace(/\/$/, "");
  const storageKey = config.storageKey ?? "leisuresaas_access_token";
  const refreshStorageKey = config.refreshStorageKey ?? DEFAULT_REFRESH_STORAGE_KEY;
  const terminal = config.terminal ?? DEFAULT_TERMINAL;
  // Any BCP 47 tag; invalid/empty→ omitted (or normalize to en when provided but invalid).
  const uiLocale = config.locale?.trim() ? normalizeHostedUILocale(config.locale) : "";
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: config.redirectScheme,
    path: config.redirectPath ?? "auth/callback",
  });
  useHostedUIPasswordResetLink(config.handlePasswordResetLinks !== false, uiLocale || undefined);
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
  const [lastError, setLastError] = useState<AuthLoginError | null>(null);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const persistTokens = useCallback(
    async (access: string, refresh?: string) => {
      assertAuthStorageAllowed();
      await authSetItem(storageKey, access);
      if (refresh) {
        await authSetItem(refreshStorageKey, refresh);
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
      const refreshToken = (await authGetItem(refreshStorageKey))?.trim();
      if (!refreshToken) {
        return (await authGetItem(storageKey))?.trim() || null;
      }
      try {
        const tokens = await refreshOAuthTokens(issuer, config.clientId, refreshToken);
        await persistTokens(tokens.accessToken, tokens.refreshToken ?? refreshToken);
        return tokens.accessToken;
      } catch (err) {
        console.warn("OAuth refresh failed", err);
        return (await authGetItem(storageKey))?.trim() || null;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = task;
    return task;
  }, [config.clientId, issuer, persistTokens, refreshStorageKey, storageKey]);

  const resolveAccessToken = useCallback(async (): Promise<string | null> => {
    const current = (await authGetItem(storageKey))?.trim() || accessToken;
    if (!current) {
      return null;
    }
    if (!accessNeedsRefresh(current)) {
      return current;
    }
    return refreshStoredTokens();
  }, [accessToken, refreshStoredTokens, storageKey]);

  useEffect(() => {
    if (isWebProduction()) {
      setAccessToken(null);
      setLoading(false);
      return;
    }
    (async () => {
      const stored = (await authGetItem(storageKey))?.trim() || null;
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

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: config.clientId,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      scopes,
      extraParams: {
        terminal,
        ...(uiLocale ? { ui_locales: uiLocale } : {}),
      },
    },
    discovery,
  );

  const login = useCallback(async () => {
    assertAuthStorageAllowed();
    setLastError(null);

    function failLogin(code: AuthLoginError["code"], cause?: unknown): never {
      const err = toAuthLoginError(code, cause);
      setLastError(err);
      throw err;
    }

    if (!request) {
      failLogin("not_ready");
    }

    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type === "cancel" || result.type === "dismiss") {
        failLogin("cancelled");
      }
      if (result.type !== "success") {
        failLogin("no_code", result);
      }
      const code = result.params.code?.trim();
      if (!code) {
        failLogin("no_code");
      }

      let tokenRes: AuthSession.TokenResponse;
      try {
        tokenRes = await AuthSession.exchangeCodeAsync(
          {
            clientId: config.clientId,
            code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier ?? "" },
          },
          discovery,
        );
      } catch (err) {
        failLogin("exchange_failed", err);
      }

      const token = tokenRes.accessToken?.trim();
      if (!token) {
        failLogin("exchange_failed", new Error("missing access_token"));
      }
      await persistTokens(token, tokenRes.refreshToken?.trim());
      setLastError(null);
    } finally {
      setLoading(false);
    }
  }, [config.clientId, discovery, persistTokens, promptAsync, redirectUri, request]);

  const logout = useCallback(async () => {
    await authDeleteItem(storageKey);
    await authDeleteItem(refreshStorageKey);
    setAccessToken(null);
    setLastError(null);
  }, [refreshStorageKey, storageKey]);

  const value = useMemo(
    () => ({ accessToken, redirectUri, loading, lastError, login, logout, resolveAccessToken }),
    [accessToken, redirectUri, loading, lastError, login, logout, resolveAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/** @deprecated Use AuthProvider */
export const LeisureSaasAuthProvider = AuthProvider;
/** @deprecated Use useAuth */
export const useLeisureSaasAuth = useAuth;
/** @deprecated Use AuthContextValue */
export type LeisureSaasAuthContextValue = AuthContextValue;
/** @deprecated Use AuthProviderProps */
export type LeisureSaasAuthProviderProps = AuthProviderProps;
