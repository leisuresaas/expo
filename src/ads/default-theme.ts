import { StyleSheet } from "react-native";

import type { AdLayout, AdType, ImageLayout, TextLayout } from "./constants";
import { IMAGE_LAYOUTS, TEXT_LAYOUTS } from "./constants";
import type { AdCreativeStyles, AdLayoutStyles, AdsStateStyles, AdsTheme, AdRotationStyles, ResolvedAdsTheme } from "./theme";

export const defaultCreativeStyles = StyleSheet.create({
  root: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  pressed: { opacity: 0.85 },
  image: { width: "100%", height: 160 },
  caption: { paddingHorizontal: 16, paddingVertical: 10, gap: 2 },
  title: { fontSize: 14, fontWeight: "600", color: "#111" },
  body: { fontSize: 13, color: "#666", lineHeight: 18 },
  link: { fontSize: 13, color: "#2563eb", lineHeight: 18 },
  media: {},
  content: {},
});

export const defaultRotationStyles = StyleSheet.create({
  root: {},
  slide: {},
  indicators: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ccc" },
  dotActive: { backgroundColor: "#111" },
});

export const defaultStateStyles = StyleSheet.create({
  loading: {
    overflow: "hidden",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#ddd",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  empty: { fontSize: 13, color: "#888", lineHeight: 18 },
  error: { fontSize: 13, color: "#b00020", lineHeight: 18 },
});

const textLayoutOverrides: Record<TextLayout, AdCreativeStyles> = {
  text_inline: {
    root: { borderRadius: 6, borderWidth: 0, backgroundColor: "#f8f8f8", paddingHorizontal: 12, paddingVertical: 10 },
    title: { fontSize: 13 },
    body: { fontSize: 12 },
  },
  text_callout: {
    root: { paddingHorizontal: 14, paddingVertical: 12, gap: 4, borderLeftWidth: 3, borderLeftColor: "#2563eb" },
    title: { fontSize: 14, fontWeight: "600" },
    body: { fontSize: 13 },
  },
  text_footer: {
    root: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    title: { fontSize: 12, fontWeight: "600" },
    body: { fontSize: 11, lineHeight: 15 },
  },
  text_sidebar: {
    root: { maxWidth: 280, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
    title: { fontSize: 13, fontWeight: "600" },
    body: { fontSize: 12, lineHeight: 16 },
  },
  text_minimal: {
    root: { paddingHorizontal: 4, paddingVertical: 4, borderWidth: 0, backgroundColor: "transparent" },
    title: { fontSize: 13, color: "#2563eb", textDecorationLine: "underline" },
    body: { fontSize: 12, color: "#666" },
    link: { fontSize: 12, color: "#2563eb" },
  },
};

const imageLayoutOverrides: Record<ImageLayout, AdCreativeStyles> = {
  image_hero: { root: { paddingVertical: 0, paddingHorizontal: 0 }, image: { width: "100%", height: 180 } },
  image_card: {
    root: { paddingVertical: 0, paddingHorizontal: 0, borderRadius: 16 },
    image: { width: "100%", height: 160, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    caption: { paddingHorizontal: 14, paddingVertical: 12 },
  },
  image_strip: {
    root: { flexDirection: "row", alignItems: "center", padding: 10, gap: 10 },
    image: { width: 56, height: 56, borderRadius: 8 },
    content: { flex: 1, gap: 2 },
    title: { fontSize: 13 },
    body: { fontSize: 12, lineHeight: 16 },
  },
  image_thumbnail: {
    root: { maxWidth: 280, flexDirection: "row", alignItems: "center", padding: 10, gap: 10 },
    image: { width: 72, height: 72, borderRadius: 8 },
    content: { flex: 1, gap: 2 },
    title: { fontSize: 13 },
    body: { fontSize: 12, lineHeight: 16 },
  },
  image_inline: {
    root: { paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: "transparent" },
    image: { width: "100%", height: 140, borderRadius: 8 },
    caption: { paddingHorizontal: 4, paddingVertical: 8, gap: 2 },
    title: { fontSize: 13 },
    body: { fontSize: 12 },
  },
};

export const defaultAdsTheme: AdsTheme = {
  creative: defaultCreativeStyles,
  rotation: defaultRotationStyles,
  layouts: { text: textLayoutOverrides, image: imageLayoutOverrides },
  states: defaultStateStyles,
};

function mergeCreative(base: AdCreativeStyles, ...layers: (AdCreativeStyles | undefined)[]): AdCreativeStyles {
  return layers.reduce<AdCreativeStyles>((acc, layer) => ({ ...acc, ...layer }), { ...base });
}

function buildTextLayouts(creative: AdCreativeStyles, patch?: AdLayoutStyles["text"]): Record<TextLayout, AdCreativeStyles> {
  const out = {} as Record<TextLayout, AdCreativeStyles>;
  for (const key of TEXT_LAYOUTS) {
    out[key] = mergeCreative(creative, textLayoutOverrides[key], patch?.[key]);
  }
  return out;
}

function buildImageLayouts(creative: AdCreativeStyles, patch?: AdLayoutStyles["image"]): Record<ImageLayout, AdCreativeStyles> {
  const out = {} as Record<ImageLayout, AdCreativeStyles>;
  for (const key of IMAGE_LAYOUTS) {
    out[key] = mergeCreative(creative, imageLayoutOverrides[key], patch?.[key]);
  }
  return out;
}

export function resolveAdsTheme(
  providerTheme?: AdsTheme,
  adTheme?: AdsTheme,
  adStyles?: AdLayoutStyles,
): ResolvedAdsTheme {
  const creative = mergeCreative(
    defaultCreativeStyles,
    defaultAdsTheme.creative,
    providerTheme?.creative,
    adTheme?.creative,
  );
  const rotation: AdRotationStyles = {
    ...defaultRotationStyles,
    ...defaultAdsTheme.rotation,
    ...providerTheme?.rotation,
    ...adTheme?.rotation,
  };
  const layouts = {
    text: buildTextLayouts(creative, {
      ...defaultAdsTheme.layouts?.text,
      ...providerTheme?.layouts?.text,
      ...adTheme?.layouts?.text,
      ...adStyles?.text,
    }),
    image: buildImageLayouts(creative, {
      ...defaultAdsTheme.layouts?.image,
      ...providerTheme?.layouts?.image,
      ...adTheme?.layouts?.image,
      ...adStyles?.image,
    }),
  };
  const states: AdsStateStyles = {
    ...defaultStateStyles,
    ...defaultAdsTheme.states,
    ...providerTheme?.states,
    ...adTheme?.states,
  };
  return { creative, rotation, layouts, states };
}

export function layoutStylesFor(theme: ResolvedAdsTheme, adType: AdType, layout: AdLayout): AdCreativeStyles {
  if (adType === "image") {
    return theme.layouts.image[layout as ImageLayout] ?? theme.creative;
  }
  return theme.layouts.text[layout as TextLayout] ?? theme.creative;
}
