import { LeisureSaasHttpError } from "./errors";
import { mobilePlatform } from "./platform";
import { applyPublishableKeyHeaders } from "./publishable-key";
import type { MobilePlatform } from "./types";

export type PublicAppConfigRequestContext = {
  gatewayUrl: string;
  publishableKey: string;
  platform?: MobilePlatform | "web";
  bundleId?: string;
  origin?: string;
  locale?: string;
};

export type AppConfigResponse = {
  platform: string;
  policy: {
    min_supported_version: string;
    latest_version: string;
    store_url: string;
    release_notes?: string;
    update_message?: string;
  };
  client?: {
    app_version?: string;
    app_build?: string;
  };
  update: {
    required: boolean;
    recommended: boolean;
    reason: string;
  };
};

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function resolvePlatform(ctx: PublicAppConfigRequestContext): MobilePlatform | "web" {
  return ctx.platform ?? mobilePlatform();
}

export async function getPublicAppConfig(
  ctx: PublicAppConfigRequestContext,
  input: { appVersion: string; appBuild?: string; fresh?: boolean },
): Promise<AppConfigResponse> {
  const platform = resolvePlatform(ctx);
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Client-Platform": platform,
    "X-App-Version": input.appVersion.trim(),
  };
  applyPublishableKeyHeaders(headers, ctx.publishableKey);
  if (input.appBuild?.trim()) {
    headers["X-App-Build"] = input.appBuild.trim();
  }
  if (ctx.locale?.trim()) {
    headers["Accept-Language"] = ctx.locale.trim();
  }
  if (platform === "web") {
    if (ctx.origin?.trim()) headers.Origin = ctx.origin.trim();
  } else if (ctx.bundleId?.trim()) {
    headers["X-Ads-Bundle-Id"] = ctx.bundleId.trim();
  }
  if (input.fresh) {
    headers["Cache-Control"] = "no-cache";
  }

  // Trailing slash: some gateways 301 …/app-config → …/app-config/ with a root-relative
  // Location that drops the /gateway prefix and breaks fetch redirect (404).
  let url = `${trimSlash(ctx.gatewayUrl)}/api/v1/public/app-config/`;
  if (input.fresh) {
    url += "?fresh=1";
  }
  const res = await fetch(url, { method: "GET", headers });
  const text = await res.text();
  if (!res.ok) {
    throw new LeisureSaasHttpError(res.status, text.trim());
  }
  return JSON.parse(text) as AppConfigResponse;
}
