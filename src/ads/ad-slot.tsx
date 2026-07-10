import { useCallback, useMemo } from "react";
import { Text, View } from "react-native";

import type { AdFeedItem, AdsFeedResponse } from "../types";
import { normalizeAdType, normalizeLayout } from "./constants";
import { useAdsContext } from "./context";
import { layoutStylesFor, resolveAdsTheme } from "./default-theme";
import { useAdImpression, useAdRotation } from "./hooks";
import { renderLayoutByKey } from "./layouts";
import { openAdClickUrl } from "./open-click";
import { AdRotationShell } from "./rotation/shell";
import type { AdLayoutRenderContext, AdProps, AdRenderContext } from "./theme";

export type AdSlotViewProps = {
  feed: AdsFeedResponse;
  placement: string;
  style?: AdProps["style"];
  contentStyle?: AdProps["contentStyle"];
  theme?: AdProps["theme"];
  styles?: AdProps["styles"];
  showIndicators?: boolean;
  trackImpressions?: boolean;
  onPress?: AdProps["onPress"];
  renderAd?: AdProps["renderAd"];
  renderLayout?: AdProps["renderLayout"];
};

export function AdSlotView({
  feed,
  placement,
  style,
  contentStyle,
  theme: adTheme,
  styles: adStyles,
  showIndicators,
  trackImpressions = true,
  onPress,
  renderAd,
  renderLayout,
}: AdSlotViewProps) {
  const { providerTheme } = useAdsContext();
  const ads = feed.ads ?? [];
  const rotation = feed.rotation;
  const adType = normalizeAdType(feed.type ?? ads[0]?.type);
  const layout = normalizeLayout(adType, feed.layout);
  const { index, setIndex, current, count } = useAdRotation({ ads, rotation, enabled: true });

  const theme = useMemo(
    () => resolveAdsTheme(providerTheme, adTheme, adStyles),
    [providerTheme, adTheme, adStyles],
  );
  const creativeStyles = useMemo(() => layoutStylesFor(theme, adType, layout), [theme, adType, layout]);

  useAdImpression(
    trackImpressions ? current : null,
    placement,
    feed.source?.group_id ?? "",
  );

  const handlePress = useCallback(async (ad: AdFeedItem) => {
    onPress?.(ad);
    const clickUrl = ad.click_url?.trim();
    if (clickUrl) {
      await openAdClickUrl(clickUrl);
    }
  }, [onPress]);

  const buildContext = useCallback((ad: AdFeedItem, adIndex: number): AdRenderContext => ({
    ad,
    adType,
    layout,
    placement,
    index: adIndex,
    count,
    onPress: () => void handlePress(ad),
    theme,
  }), [adType, count, handlePress, layout, placement, theme]);

  const renderOne = useCallback((ad: AdFeedItem, adIndex: number) => {
    const ctx = buildContext(ad, adIndex);
    if (renderAd) {
      return renderAd(ctx);
    }
    const layoutCtx: AdLayoutRenderContext = { ...ctx, styles: creativeStyles };
    if (renderLayout) {
      return renderLayout(layoutCtx);
    }
    return renderLayoutByKey({ ctx: layoutCtx, styles: creativeStyles, contentStyle });
  }, [buildContext, creativeStyles, contentStyle, renderAd, renderLayout]);

  if (count === 0) {
    return (
      <View style={[theme.states.loading, style]}>
        <Text style={theme.states.empty}>（无广告素材）</Text>
      </View>
    );
  }

  const indicators = showIndicators ?? rotation?.show_indicators ?? false;

  return (
    <AdRotationShell
      ads={ads}
      rotation={rotation}
      index={index}
      onIndexChange={setIndex}
      styles={theme.rotation}
      showIndicators={indicators}
      rootStyle={style}
      renderSlide={(ad, adIndex) => renderOne(ad, adIndex)}
    />
  );
}

export type AdPreviewProps = Omit<AdSlotViewProps, "placement"> & {
  placement?: string;
};

/** Render a feed payload without fetching (labs, Storybook, admin preview). */
export function AdPreview({ feed, placement, trackImpressions = false, ...rest }: AdPreviewProps) {
  const slotPlacement = placement ?? feed.placement ?? "preview";
  return (
    <AdSlotView
      feed={feed}
      placement={slotPlacement}
      trackImpressions={trackImpressions}
      {...rest}
    />
  );
}
