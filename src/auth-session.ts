const REFRESH_SKEW_SEC = 60;

export function accessExpUnix(accessToken: string): number | undefined {
  const parts = accessToken.split(".");
  if (parts.length < 2) {
    return undefined;
  }
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" ? payload.exp : undefined;
  } catch {
    return undefined;
  }
}

export function accessNeedsRefresh(accessToken: string): boolean {
  const exp = accessExpUnix(accessToken);
  if (!exp) {
    return false;
  }
  return exp - Math.floor(Date.now() / 1000) <= REFRESH_SKEW_SEC;
}

export type OAuthTokenResponse = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
};

export async function refreshOAuthTokens(
  issuer: string,
  clientId: string,
  refreshToken: string,
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
  });
  const res = await fetch(`${issuer.replace(/\/$/, "")}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token refresh failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
  };
  const accessToken = data.access_token?.trim();
  if (!accessToken) {
    throw new Error("token refresh: missing access_token");
  }
  return {
    accessToken,
    refreshToken: data.refresh_token?.trim() || undefined,
    expiresIn: data.expires_in,
    refreshExpiresIn: data.refresh_expires_in,
  };
}
