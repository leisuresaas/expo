import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import type { AdProps } from "./theme";
import { AdSlotView } from "./ad-slot";
import { useAdsContext } from "./context";
import { resolveAdsTheme } from "./default-theme";
import { useAdsFeed } from "./hooks";

export function Ad({
  placement = "home_banner",
  style,
  contentStyle,
  theme: adTheme,
  styles: adStyles,
  onError,
  onPress,
  showEmpty = false,
  showIndicators,
  renderAd,
  renderLayout,
}: AdProps) {
  const { providerTheme } = useAdsContext();
  const { feed, loading, error } = useAdsFeed({ placement });
  const theme = resolveAdsTheme(providerTheme, adTheme, adStyles);

  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  if (loading) {
    return (
      <View style={[theme.states.loading, style]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[theme.states.loading, style]}>
        <Text style={theme.states.error}>广告加载失败: {error.message}</Text>
      </View>
    );
  }

  if (!feed?.ads?.length) {
    if (!showEmpty) {
      return null;
    }
    return (
      <View style={[theme.states.loading, style]}>
        <Text style={theme.states.empty}>（当前无 {placement} 广告）</Text>
      </View>
    );
  }

  return (
    <AdSlotView
      feed={feed}
      placement={placement}
      style={style}
      contentStyle={contentStyle}
      theme={adTheme}
      styles={adStyles}
      showIndicators={showIndicators}
      trackImpressions
      onPress={onPress}
      renderAd={renderAd}
      renderLayout={renderLayout}
    />
  );
}

export function AdBanner(props: Omit<AdProps, "placement">) {
  return <Ad placement="home_banner" {...props} />;
}

export function AdSidebar(props: Omit<AdProps, "placement">) {
  return <Ad placement="sidebar" {...props} />;
}

export function AdFooter(props: Omit<AdProps, "placement">) {
  return <Ad placement="footer" {...props} />;
}

export function AdInline(props: Omit<AdProps, "placement">) {
  return <Ad placement="inline" {...props} />;
}
