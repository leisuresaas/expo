/**
 * OIDC UserInfo (GET {issuer}/oauth/userinfo).
 * Requires a user access token from the authorization_code flow — not client_credentials.
 */
export type UserInfo = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

/** Fetch OIDC UserInfo from the platform issuer. */
export async function fetchUserInfo(issuer: string, accessToken: string): Promise<UserInfo> {
  const base = issuer.replace(/\/$/, "");
  const token = accessToken.trim();
  if (!base) {
    throw new Error("issuer is required");
  }
  if (!token) {
    throw new Error("access token is required");
  }
  const res = await fetch(`${base}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`userinfo failed (${res.status}): ${body}`);
  }
  const data = (await res.json()) as UserInfo;
  if (!data?.sub) {
    throw new Error("userinfo missing sub");
  }
  return data;
}
