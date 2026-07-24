/** Sets X-Publishable-Key for Public API calls. */
export function applyPublishableKeyHeaders(
  headers: Record<string, string>,
  publishableKey: string,
): void {
  const key = publishableKey.trim();
  if (!key) return;
  headers["X-Publishable-Key"] = key;
}

/** Prefer EXPO_PUBLIC_PUBLISHABLE_KEY; legacy env names still accepted if they hold pk_live_. */
export function resolvePublishableKeyFromEnv(env: Record<string, string | undefined> = process.env): string {
  return (
    env.EXPO_PUBLIC_PUBLISHABLE_KEY?.trim() ||
    env.EXPO_PUBLIC_ADS_PK?.trim() ||
    env.EXPO_PUBLIC_APP_CFG_PK?.trim() ||
    ""
  );
}
