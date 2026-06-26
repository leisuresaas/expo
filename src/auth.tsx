import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LeisureSaasAuthConfig } from "./types";

WebBrowser.maybeCompleteAuthSession();

const DEFAULT_SCOPES = ["openid", "profile", "entitlement:read", "billing:read", "billing:store"];

export type LeisureSaasAuthContextValue = {
  accessToken: string | null;
  redirectUri: string;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const LeisureSaasAuthContext = createContext<LeisureSaasAuthContextValue | null>(null);

export type LeisureSaasAuthProviderProps = {
  config: LeisureSaasAuthConfig;
  children: ReactNode;
};

export function LeisureSaasAuthProvider({ config, children }: LeisureSaasAuthProviderProps) {
  const issuer = config.issuer.replace(/\/$/, "");
  const storageKey = config.storageKey ?? "leisuresaas_access_token";
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: config.redirectScheme,
    path: config.redirectPath ?? "auth/callback",
  });
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
    SecureStore.getItemAsync(storageKey)
      .then((token) => setAccessToken(token?.trim() || null))
      .finally(() => setLoading(false));
  }, [storageKey]);

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
        await SecureStore.setItemAsync(storageKey, token);
        setAccessToken(token);
      } catch (err) {
        console.warn("LeisureSaas OAuth exchange failed", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [config.clientId, discovery, redirectUri, request?.codeVerifier, response, storageKey]);

  const login = useCallback(async () => {
    if (!request) {
      throw new Error("OAuth request not ready");
    }
    await promptAsync();
  }, [promptAsync, request]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(storageKey);
    setAccessToken(null);
  }, [storageKey]);

  const value = useMemo(
    () => ({ accessToken, redirectUri, loading, login, logout }),
    [accessToken, redirectUri, loading, login, logout],
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
