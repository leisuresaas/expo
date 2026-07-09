import * as WebBrowser from "expo-web-browser";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import type { LeisureSaasClient } from "./client";
import type { AdFeedItem, AdFeedRotation, AdsFeedResponse } from "./types";

const impressionRecorded = new Set<string>();

export type AdsProviderProps = {
  client: LeisureSaasClient;
  resolveAccessToken: () => Promise<string | null>;
  children: ReactNode;
};

type AdsContextValue = {
  client: LeisureSaasClient;
  resolveAccessToken: () => Promise<string | null>;
};

const AdsContext = createContext<AdsContextValue | null>(null);

export function AdsProvider({ client, resolveAccessToken, children }: AdsProviderProps) {
  const value = useMemo(
    () => ({ client, resolveAccessToken }),
    [client, resolveAccessToken],
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
}

function useAdsContext(): AdsContextValue {
  const ctx = useContext(AdsContext);
  if (!ctx) {
    throw new Error("Ad components must be used within AdsProvider");
  }
  return ctx;
}

export type UseAdsFeedOptions = {
  placement?: string;
  enabled?: boolean;
};

export type UseAdsFeedResult = {
  feed: AdsFeedResponse | null;
  ad: AdFeedItem | null;
  ads: AdFeedItem[];
  layout?: string;
  rotation?: AdFeedRotation;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

export function useAdsFeed(options: UseAdsFeedOptions = {}): UseAdsFeedResult {
  const { client, resolveAccessToken } = useAdsContext();
  const placement = options.placement ?? "home_banner";
  const enabled = options.enabled ?? true;

  const [feed, setFeed] = useState<AdsFeedResponse | null>(null);
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
  }, [client, resolveAccessToken, placement, enabled]);

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

type UseAdRotationResult = {
  index: number;
  current: AdFeedItem | null;
  count: number;
};

function useAdRotation({ ads, rotation, enabled = true }: UseAdRotationOptions): UseAdRotationResult {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  const autoplay = rotation?.enabled && rotation.autoplay !== false && ads.length > 1;
  const intervalMs = Math.max(1000, (rotation?.interval_sec ?? 5) * 1000);

  useEffect(() => {
    setIndex(0);
  }, [ads]);

  useEffect(() => {
    if (!enabled || !autoplay || ads.length <= 1) {
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
  }, [ads, autoplay, intervalMs, enabled, rotation?.loop]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      paused.current = state !== "active";
    });
    return () => sub.remove();
  }, []);

  const current = ads[index] ?? null;
  return { index, current, count: ads.length };
}

function useAdImpression(ad: AdFeedItem | null, placement: string, groupId: string, resolveAccessToken: () => Promise<string | null>, client: LeisureSaasClient) {
  const sent = useRef<string>("");

  useEffect(() => {
    if (!ad?.id) {
      return;
    }
    const key = `${ad.id}:${placement}`;
    if (sent.current === key || impressionRecorded.has(key)) {
      return;
    }
    sent.current = key;
    impressionRecorded.add(key);

    void (async () => {
      try {
        const token = await resolveAccessToken();
        if (!token) {
          return;
        }
        await client.recordAdEvents(token, [{
          adId: ad.id, eventType: "impression", placementKey: placement, groupId,
        }]);
      } catch (err) {
        console.warn("Ad: impression tracking failed", err);
      }
    })();
  }, [ad?.id, client, groupId, placement, resolveAccessToken]);
}

async function openAdClickUrl(url: string): Promise<void> {
  if (!url) {
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

type AdCreativeViewProps = {
  ad: AdFeedItem;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

function AdCreativeView({ ad, onPress, style }: AdCreativeViewProps) {
  if (ad.type === "image_link" && ad.image_url) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        accessibilityRole="button"
        accessibilityLabel={ad.title || "Platform ad"}
      >
        <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
        {(ad.title || ad.body_text) && (
          <View style={styles.caption}>
            {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
            {ad.body_text ? <Text style={styles.body}>{ad.body_text}</Text> : null}
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.textCard, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={ad.title || ad.body_text || "Platform ad"}
    >
      {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
      {ad.body_text ? <Text style={styles.body}>{ad.body_text}</Text> : null}
    </Pressable>
  );
}

export type AdProps = {
  placement?: string;
  style?: StyleProp<ViewStyle>;
  onError?: (error: Error) => void;
  onPress?: (ad: AdFeedItem) => void;
  showEmpty?: boolean;
  showIndicators?: boolean;
};

export function Ad({
  placement = "home_banner",
  style,
  onError,
  onPress,
  showEmpty = false,
  showIndicators,
}: AdProps) {
  const { client, resolveAccessToken } = useAdsContext();
  const { ads, rotation, loading, error, feed } = useAdsFeed({ placement });
  const { index, current, count } = useAdRotation({ ads, rotation, enabled: !loading });
  useAdImpression(current, placement, feed?.source?.group_id ?? "", resolveAccessToken, client);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  const handlePress = useCallback(async () => {
    if (!current) {
      return;
    }
    onPress?.(current);
    const clickUrl = current.click_url?.trim();
    if (clickUrl) {
      await openAdClickUrl(clickUrl);
    }
  }, [current, onPress]);

  if (loading) {
    return (
      <View style={[styles.card, styles.textCard, style]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.card, styles.textCard, style]}>
        <Text style={styles.error}>广告加载失败: {error.message}</Text>
      </View>
    );
  }

  if (!current) {
    if (!showEmpty) {
      return null;
    }
    return (
      <View style={[styles.card, styles.textCard, style]}>
        <Text style={styles.muted}>（当前无 {placement} 广告）</Text>
      </View>
    );
  }

  const indicators = showIndicators ?? rotation?.show_indicators ?? false;

  return (
    <View style={style}>
      <AdCreativeView ad={current} onPress={() => void handlePress()} />
      {indicators && count > 1 ? (
        <View style={styles.indicators}>
          {ads.map((item, i) => (
            <View key={item.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Alias for `home_banner` placement. */
export function AdBanner(props: Omit<AdProps, "placement">) {
  return <Ad placement="home_banner" {...props} />;
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  textCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  image: {
    width: "100%",
    height: 160,
  },
  caption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
  },
  body: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  error: {
    fontSize: 13,
    color: "#b00020",
    lineHeight: 18,
  },
  muted: {
    fontSize: 13,
    color: "#888",
    lineHeight: 18,
  },
  indicators: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ccc",
  },
  dotActive: {
    backgroundColor: "#111",
  },
});
