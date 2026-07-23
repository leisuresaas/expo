/** Sets X-Publishable-Key (preferred) plus an optional legacy header for older gateways. */
export function applyPublishableKeyHeaders(
  headers: Record<string, string>,
  publishableKey: string,
  legacyHeader?: string,
): void {
  const key = publishableKey.trim();
  if (!key) return;
  headers["X-Publishable-Key"] = key;
  if (legacyHeader?.trim()) {
    headers[legacyHeader.trim()] = key;
  }
}

/** Prefer EXPO_PUBLIC_PUBLISHABLE_KEY; fall back to legacy per-capability env vars. */
export function resolvePublishableKeyFromEnv(env: Record<string, string | undefined> = process.env): string {
  return (
    env.EXPO_PUBLIC_PUBLISHABLE_KEY?.trim() ||
    env.EXPO_PUBLIC_ADS_PK?.trim() ||
    env.EXPO_PUBLIC_APP_CFG_PK?.trim() ||
    ""
  );
}
