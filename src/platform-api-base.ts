import { LeisureSaasHttpError } from "./errors";
import { resolveGatewayUrlFromEnv } from "./gateway-url";

const DISCOVERY_PLATFORM_API_KEY = "leisuresaas_platform_api_base";

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Fetch LeisureSaas platform API base from OIDC discovery
 * (`leisuresaas_platform_api_base` vendor claim).
 * Prefer {@link resolvePlatformApiBase} so EXPO_PUBLIC_GATEWAY_URL wins.
 */
export async function fetchPlatformApiBase(issuer: string): Promise<string> {
  const base = trimSlash(issuer.trim());
  if (!base) {
    throw new Error("issuer is required");
  }
  const res = await fetch(`${base}/.well-known/openid-configuration`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new LeisureSaasHttpError(res.status, text.trim());
  }
  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("openid-configuration: invalid JSON");
  }
  const raw = doc[DISCOVERY_PLATFORM_API_KEY];
  const api = typeof raw === "string" ? trimSlash(raw.trim()) : "";
  if (!api) {
    throw new Error(`openid-configuration missing ${DISCOVERY_PLATFORM_API_KEY}`);
  }
  return api;
}

export type ResolvePlatformApiBaseOptions = {
  /** Explicit platform API root (wins). */
  gatewayUrl?: string;
  /** OAuth issuer used to fetch discovery when env/prop absent. */
  issuer?: string;
  env?: Record<string, string | undefined>;
};

/**
 * Resolve platform API base: prop → EXPO_PUBLIC_GATEWAY_URL → discovery via issuer.
 * Never treats OAuth issuer itself as the Public API root.
 */
export async function resolvePlatformApiBase(opts: ResolvePlatformApiBaseOptions = {}): Promise<string> {
  const fromProp = opts.gatewayUrl?.trim();
  if (fromProp) {
    return trimSlash(fromProp);
  }
  const fromEnv = resolveGatewayUrlFromEnv(opts.env);
  if (fromEnv) {
    return trimSlash(fromEnv);
  }
  const issuer =
    opts.issuer?.trim() ||
    opts.env?.EXPO_PUBLIC_OAUTH_ISSUER?.trim() ||
    (typeof process !== "undefined" ? process.env.EXPO_PUBLIC_OAUTH_ISSUER?.trim() : "") ||
    "";
  if (!issuer) {
    return "";
  }
  return fetchPlatformApiBase(issuer);
}
