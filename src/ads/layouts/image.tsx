import type { ReactElement } from "react";
import { Text, View } from "react-native";

import type { ImageLayout } from "../constants";
import type { AdCreativeStyles, AdLayoutRenderContext } from "../theme";
import { AdBody, AdImage, AdLinkCta, AdTitle, LayoutShell } from "./shared";

export type AdLayoutRendererProps = {
  ctx: AdLayoutRenderContext;
  styles: AdCreativeStyles;
  contentStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};

function ImageHeroLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  const hasCaption = !!(ctx.ad.title || ctx.ad.body_text);
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <AdImage uri={ctx.ad.image_url} styles={styles} />
      {hasCaption ? (
        <View style={styles.overlay}>
          <AdTitle text={ctx.ad.title} styles={styles} />
          <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={2} />
        </View>
      ) : null}
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
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <AdImage uri={ctx.ad.image_url} styles={styles} />
      <View style={styles.content}>
        <AdTitle text={ctx.ad.title} styles={styles} />
        <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={1} />
      </View>
    </LayoutShell>
  );
}

function ImageThumbnailLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <AdImage uri={ctx.ad.image_url} styles={styles} />
      <View style={styles.content}>
        <AdTitle text={ctx.ad.title} styles={styles} />
        <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={2} />
        <Text style={styles.link}>Open</Text>
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
