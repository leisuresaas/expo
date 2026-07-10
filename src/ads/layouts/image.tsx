import type { ReactElement } from "react";

import { AdCreativeView } from "../creative";
import type { ImageLayout } from "../constants";
import type { AdCreativeStyles, AdLayoutRenderContext } from "../theme";

export type AdLayoutRendererProps = {
  ctx: AdLayoutRenderContext;
  styles: AdCreativeStyles;
  contentStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};

function ImageHeroLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="stacked"
    />
  );
}

function ImageCardLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="stacked"
    />
  );
}

function ImageStripLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="compact"
    />
  );
}

function ImageThumbnailLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="row"
    />
  );
}

function ImageInlineLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="stacked"
    />
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
