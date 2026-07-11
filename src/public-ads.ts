import { LeisureSaasHttpError } from "./errors";
import type { AdEventInput, AdsFeedResponse, MobilePlatform } from "./types";

export type PublicAdsRequestContext = {
  gatewayUrl: string;
  publishableKey: string;
  platform: MobilePlatform | "web";
  bundleId?: string;
  origin?: string;
};

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function publicAdsHeaders(ctx: PublicAdsRequestContext, accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Ads-Publishable-Key": ctx.publishableKey.trim(),
    "X-Ads-Platform": ctx.platform,
  };
  if (ctx.platform === "web") {
    if (ctx.origin?.trim()) {
      headers.Origin = ctx.origin.trim();
    }
  } else if (ctx.bundleId?.trim()) {
    headers["X-Ads-Bundle-Id"] = ctx.bundleId.trim();
  }
  if (accessToken?.trim()) {
    headers.Authorization = `Bearer ${accessToken.trim()}`;
  }
  return headers;
}

async function publicAdsRequest<T>(
  ctx: PublicAdsRequestContext,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  accessToken?: string,
): Promise<T> {
  const base = `${trimSlash(ctx.gatewayUrl)}/api/v1/public/ads`;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = publicAdsHeaders(ctx, accessToken);
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(url, { method, headers, body: payload });
  const text = await res.text();
  if (!res.ok) {
    throw new LeisureSaasHttpError(res.status, text.trim());
  }
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export async function getPublicAdsFeed(
  ctx: PublicAdsRequestContext,
  placement = "home_banner",
): Promise<AdsFeedResponse> {
  const q = encodeURIComponent(placement.trim());
  const resp = await publicAdsRequest<AdsFeedResponse>(ctx, "GET", `/feed?placement=${q}`);
  return { ...resp, ads: resp.ads ?? [] };
}

export async function recordPublicAdEvents(
  ctx: PublicAdsRequestContext,
  sessionId: string,
  events: AdEventInput[],
  accessToken?: string | null,
): Promise<number> {
  if (events.length === 0) {
    return 0;
  }
  const payload = {
    session_id: sessionId.trim(),
    events: events.map((ev) => {
      const lineupId = (ev.lineupId ?? ev.groupId ?? "").trim();
      return {
        ad_id: ev.adId,
        event_type: ev.eventType,
        ...(ev.placementKey ? { placement_key: ev.placementKey } : {}),
        ...(lineupId ? { lineup_id: lineupId } : {}),
      };
    }),
  };
  const resp = await publicAdsRequest<{ recorded: number }>(
    ctx, "POST", "/events", payload, accessToken ?? undefined,
  );
  return resp.recorded ?? 0;
}
