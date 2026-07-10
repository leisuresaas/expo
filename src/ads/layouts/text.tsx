import type { ReactElement } from "react";
import { Text, View } from "react-native";

import type { TextLayout } from "../constants";
import type { AdCreativeStyles, AdLayoutRenderContext } from "../theme";
import { AdBadge, AdBody, AdLinkCta, AdTitle, LayoutShell } from "./shared";

export type AdLayoutRendererProps = {
  ctx: AdLayoutRenderContext;
  styles: AdCreativeStyles;
  contentStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};

function TextInlineLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <View style={styles.content}>
        <AdTitle text={ctx.ad.title} styles={styles} />
        <AdBody text={ctx.ad.body_text} styles={styles} />
        <AdLinkCta styles={styles} />
      </View>
    </LayoutShell>
  );
}

function TextCalloutLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <AdBadge styles={styles} />
      <AdTitle text={ctx.ad.title} styles={styles} />
      <AdBody text={ctx.ad.body_text} styles={styles} />
      <AdLinkCta styles={styles} label="View details" />
    </LayoutShell>
  );
}

function TextFooterLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  const line = [ctx.ad.title, ctx.ad.body_text].filter(Boolean).join(" · ");
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <Text style={styles.title} numberOfLines={2}>{line || "Platform ad"}</Text>
    </LayoutShell>
  );
}

function TextSidebarLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <View style={styles.content}>
        <AdTitle text={ctx.ad.title} styles={styles} />
        <AdBody text={ctx.ad.body_text} styles={styles} numberOfLines={3} />
      </View>
    </LayoutShell>
  );
}

function TextMinimalLayout({ ctx, styles, contentStyle }: AdLayoutRendererProps) {
  const label = ctx.ad.title || ctx.ad.body_text || "Learn more";
  return (
    <LayoutShell ad={ctx.ad} onPress={ctx.onPress} styles={styles} contentStyle={contentStyle}>
      <Text style={styles.link}>{label} ›</Text>
    </LayoutShell>
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
