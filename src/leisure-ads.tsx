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
import type { AdFeedItem } from "./types";

const impressionRecorded = new Set<string>();

export type LeisureAdsProviderProps = {
  client: LeisureSaasClient;
  resolveAccessToken: () => Promise<string | null>;
  children: ReactNode;
};

type LeisureAdsContextValue = {
  client: LeisureSaasClient;
  resolveAccessToken: () => Promise<string | null>;
};

const LeisureAdsContext = createContext<LeisureAdsContextValue | null>(null);

export function LeisureAdsProvider({ client, resolveAccessToken, children }: LeisureAdsProviderProps) {
  const value = useMemo(
    () => ({ client, resolveAccessToken }),
    [client, resolveAccessToken],
  );

  return <LeisureAdsContext.Provider value={value}>{children}</LeisureAdsContext.Provider>;
}

function useLeisureAdsContext(): LeisureAdsContextValue {
  const ctx = useContext(LeisureAdsContext);
  if (!ctx) {
    throw new Error("LeisureAd components must be used within LeisureAdsProvider");
  }
  return ctx;
}

export type UseLeisureAdsFeedOptions = {
  placement?: string;
  enabled?: boolean;
};

export type UseLeisureAdsFeedResult = {
  ad: AdFeedItem | null;
  ads: AdFeedItem[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

export function useLeisureAdsFeed(options: UseLeisureAdsFeedOptions = {}): UseLeisureAdsFeedResult {
  const { client, resolveAccessToken } = useLeisureAdsContext();
  const placement = options.placement ?? "home_banner";
  const enabled = options.enabled ?? true;

  const [ads, setAds] = useState<AdFeedItem[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setAds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await resolveAccessToken();
      if (!token) {
        setAds([]);
        return;
      }
      const feed = await client.getAdsFeed(token, placement);
      setAds(feed);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [client, resolveAccessToken, placement, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ad = ads[0] ?? null;
  return { ad, ads, loading, error, refresh };
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

export type LeisureAdProps = {
  placement?: string;
  style?: StyleProp<ViewStyle>;
  onError?: (error: Error) => void;
  onPress?: (ad: AdFeedItem) => void;
};

export function LeisureAd({ placement = "home_banner", style, onError, onPress }: LeisureAdProps) {
  const { client, resolveAccessToken } = useLeisureAdsContext();
  const { ad, loading, error } = useLeisureAdsFeed({ placement });
  const impressionSent = useRef(false);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  useEffect(() => {
    if (!ad?.id || impressionSent.current) {
      return;
    }
    const key = `${ad.id}:${placement}`;
    if (impressionRecorded.has(key)) {
      impressionSent.current = true;
      return;
    }
    impressionSent.current = true;
    impressionRecorded.add(key);

    void (async () => {
      try {
        const token = await resolveAccessToken();
        if (!token) {
          return;
        }
        await client.recordAdEvents(token, [{ adId: ad.id, eventType: "impression" }]);
      } catch (err) {
        console.warn("LeisureAd: impression tracking failed", err);
      }
    })();
  }, [ad?.id, client, placement, resolveAccessToken]);

  const handlePress = useCallback(async () => {
    if (!ad) {
      return;
    }
    onPress?.(ad);
    const clickUrl = ad.click_url?.trim();
    if (clickUrl) {
      await openAdClickUrl(clickUrl);
    }
  }, [ad, onPress]);

  if (loading || !ad) {
    return null;
  }

  if (ad.type === "image_link" && ad.image_url) {
    return (
      <Pressable
        onPress={() => void handlePress()}
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
      onPress={() => void handlePress()}
      style={({ pressed }) => [styles.card, styles.textCard, pressed && styles.pressed, style]}
      accessibilityRole="button"
      accessibilityLabel={ad.title || ad.body_text || "Platform ad"}
    >
      {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
      {ad.body_text ? <Text style={styles.body}>{ad.body_text}</Text> : null}
    </Pressable>
  );
}

/** Alias for `home_banner` placement. */
export function LeisureAdBanner(props: Omit<LeisureAdProps, "placement">) {
  return <LeisureAd placement="home_banner" {...props} />;
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
});
