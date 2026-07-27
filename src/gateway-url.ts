/**
 * Platform API base for Public Ads / App Config (not OAuth).
 * Never fall back to EXPO_PUBLIC_OAUTH_ISSUER — that may be a Hosted UI login host.
 */
export function resolveGatewayUrlFromEnv(env: Record<string, string | undefined> = process.env): string {
  return env.EXPO_PUBLIC_GATEWAY_URL?.trim() || "";
}
