import type { ReactElement } from "react";

import { AdCreativeView } from "../creative";
import type { TextLayout } from "../constants";
import type { AdCreativeStyles, AdLayoutRenderContext } from "../theme";

export type AdLayoutRendererProps = {
  ctx: AdLayoutRenderContext;
  styles: AdCreativeStyles;
  contentStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};

function TextInlineLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="inline"
      showImage={false}
    />
  );
}

function TextCalloutLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="stacked"
      showImage={false}
    />
  );
}

function TextFooterLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="compact"
      showImage={false}
    />
  );
}

function TextSidebarLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="stacked"
      showImage={false}
    />
  );
}

function TextMinimalLayout(props: AdLayoutRendererProps) {
  const { ctx, styles, contentStyle } = props;
  return (
    <AdCreativeView
      ad={ctx.ad}
      onPress={ctx.onPress}
      styles={styles}
      contentStyle={contentStyle}
      variant="text"
      showImage={false}
    />
  );
}

const textLayoutMap: Record<TextLayout, (props: AdLayoutRendererProps) => ReactElement> = {
  text_inline: TextInlineLayout,
  text_callout: TextCalloutLayout,
  text_footer: TextFooterLayout,
  text_sidebar: TextSidebarLayout,
  text_minimal: TextMinimalLayout,
};

export function renderTextLayout(layout: TextLayout, props: AdLayoutRendererProps): ReactElement {
  const Layout = textLayoutMap[layout] ?? TextInlineLayout;
  return <Layout {...props} />;
}
