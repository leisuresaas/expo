import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ImageLayout } from "../constants";
import type { AdCreativeStyles, AdLayoutRenderContext } from "../theme";
import { AdBody, AdImage, AdLinkCta, AdTitle, LayoutShell } from "./shared";
import { useAdRotationIndicators } from "../rotation/indicators-context";

export type AdLayoutRendererProps = {
  ctx: AdLayoutRenderContext;
  styles: AdCreativeStyles;
  contentStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};

const layoutRows = StyleSheet.create({
  strip: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
  thumbnail: { flexDirection: "row", alignItems: "flex-start", gap: 12, width: "100%" },
});

function ImageHeroLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <AdImage uri={ctx.ad.image_url} styles={styles} />
      <View style={styles.overlay}>
        <AdTitle text={ctx.ad.title} styles={styles} />
        <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={2} />
      </View>
    </LayoutShell>
  );
}

function ImageCardLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <AdImage uri={ctx.ad.image_url} styles={styles} />
      <View style={styles.caption}>
        <AdTitle text={ctx.ad.title} styles={styles} />
        <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={2} />
        <AdLinkCta styles={styles} />
      </View>
    </LayoutShell>
  );
}

function ImageStripLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  const indicatorState = useAdRotationIndicators();

  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <View style={layoutRows.strip}>
        <AdImage uri={ctx.ad.image_url} styles={styles} />
        <View style={[styles.content, indicatorState ? stripIndicatorPad : null]}>
          <AdTitle text={ctx.ad.title} styles={styles} numberOfLines={1} />
          <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={1} />
        </View>
      </View>
    </LayoutShell>
  );
}

const stripIndicatorPad = { paddingRight: 28 };

function ImageThumbnailLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <View style={layoutRows.thumbnail}>
        <AdImage uri={ctx.ad.image_url} styles={styles} />
        <View style={styles.content}>
          <AdTitle text={ctx.ad.title} styles={styles} />
          <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={2} />
          <Text style={styles.link}>Open</Text>
        </View>
      </View>
    </LayoutShell>
  );
}

function ImageInlineLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <AdImage uri={ctx.ad.image_url} styles={styles} />
      <View style={styles.caption}>
        <AdTitle text={ctx.ad.title} styles={styles} />
        <AdBody text={ctx.ad.body_text} styles={styles} />
      </View>
    </LayoutShell>
  );
}

const imageLayoutMap: Record<ImageLayout, (props: AdLayoutRendererProps) => ReactElement> = {
  image_hero: ImageHeroLayout,
  image_card: ImageCardLayout,
  image_strip: ImageStripLayout,
  image_thumbnail: ImageThumbnailLayout,
  image_inline: ImageInlineLayout,
};

export function renderImageLayout(layout: ImageLayout, props: AdLayoutRendererProps): ReactElement {
  const Layout = imageLayoutMap[layout] ?? ImageHeroLayout;
  return <Layout {...props} />;
}
