import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import type { AdFeedItem, AdFeedRotation } from "../types";
import { IMPRESSION_MIN_DWELL_MS } from "./constants";
import { useAdsContext } from "./context";
import { getOrCreateAdsSessionId } from "./session-id";
import type { UseAdsFeedOptions, UseAdsFeedResult } from "./theme";

const impressionRecorded = new Set<string>();

export function useAdsFeed(options: UseAdsFeedOptions = {}): UseAdsFeedResult {
  const { client, resolveAccessToken, publicAds } = useAdsContext();
  const placement = options.placement ?? "home_banner";
  const enabled = options.enabled ?? true;

  const [feed, setFeed] = useState<UseAdsFeedResult["feed"]>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setFeed(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (publicAds) {
        const next = await client.getPublicAdsFeed(publicAds, placement);
        setFeed(next);
        return;
      }
      if (!resolveAccessToken) {
        setFeed(null);
        return;
      }
      const token = await resolveAccessToken();
      if (!token) {
        setFeed(null);
        return;
      }
      const next = await client.getAdsFeed(token, placement);
      setFeed(next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setFeed(null);
    } finally {
      setLoading(false);
    }
  }, [client, resolveAccessToken, publicAds, placement, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ads = feed?.ads ?? [];
  const ad = ads[0] ?? null;
  return {
    feed, ad, ads, layout: feed?.layout, rotation: feed?.rotation,
    loading, error, refresh,
  };
}

type UseAdRotationOptions = {
  ads: AdFeedItem[];
  rotation?: AdFeedRotation;
  enabled?: boolean;
};

export type UseAdRotationResult = {
  index: number;
  setIndex: (index: number) => void;
  current: AdFeedItem | null;
  count: number;
};

export function useAdRotation({ ads, rotation, enabled = true }: UseAdRotationOptions): UseAdRotationResult {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const autoplay = enabled && rotation?.enabled && rotation.autoplay !== false && ads.length > 1;
  const intervalMs = Math.max(1000, (rotation?.interval_sec ?? 5) * 1000);

  useEffect(() => {
    setIndex(0);
  }, [ads]);

  useEffect(() => {
    if (!autoplay || ads.length <= 1) {
      return;
    }
    const timer = setInterval(() => {
      if (paused.current) {
        return;
      }
      setIndex((prev) => {
        const next = prev + 1;
        if (next >= ads.length) {
          return rotation?.loop === false ? prev : 0;
        }
        return next;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [ads, autoplay, intervalMs, rotation?.loop]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      paused.current = state !== "active";
    });
    return () => sub.remove();
  }, []);

  const current = ads[index] ?? null;
  return { index, setIndex, current, count: ads.length };
}

export function useAdImpression(
  ad: AdFeedItem | null,
  placement: string,
  groupId: string,
) {
  const { client, resolveAccessToken, publicAds } = useAdsContext();
  const sent = useRef<string>("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!ad?.id) {
      return;
    }
    const key = `${ad.id}:${placement}`;
    timer.current = setTimeout(() => {
      if (sent.current === key || impressionRecorded.has(key)) {
        return;
      }
      sent.current = key;
      impressionRecorded.add(key);
      void (async () => {
        try {
          const event = {
            adId: ad.id, eventType: "impression" as const, placementKey: placement, groupId,
          };
          if (publicAds) {
            const sessionId = await getOrCreateAdsSessionId();
            const token = resolveAccessToken ? await resolveAccessToken() : null;
            await client.recordPublicAdEvents(publicAds, sessionId, [event], token);
            return;
          }
          if (!resolveAccessToken) {
            return;
          }
          const token = await resolveAccessToken();
          if (!token) {
            return;
          }
          await client.recordAdEvents(token, [event]);
        } catch (err) {
          console.warn("Ad: impression tracking failed", err);
        }
      })();
    }, IMPRESSION_MIN_DWELL_MS);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [ad?.id, client, groupId, placement, publicAds, resolveAccessToken]);
}
