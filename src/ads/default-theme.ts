import { StyleSheet, type TextStyle } from "react-native";

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
  badge: {
    alignSelf: "flex-start",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#2563eb",
    marginBottom: 4,
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  media: { overflow: "hidden" },
  content: { gap: 4 },
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
    root: { borderRadius: 8, borderWidth: 0, backgroundColor: "#f4f4f5", paddingHorizontal: 14, paddingVertical: 12 },
    content: { gap: 6 },
    title: { fontSize: 14, fontWeight: "600" },
    body: { fontSize: 13, lineHeight: 19 },
    link: { marginTop: 2, fontWeight: "500" },
  },
  text_callout: {
    root: {
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
      borderLeftWidth: 4,
      borderLeftColor: "#2563eb",
      backgroundColor: "#eff6ff",
      borderWidth: 0,
    },
    title: { fontSize: 15, fontWeight: "700", color: "#1e3a8a" },
    body: { fontSize: 13, color: "#334155", lineHeight: 19 },
    link: { marginTop: 4, fontWeight: "600" },
  },
  text_footer: {
    root: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: "#f8fafc",
      borderColor: "#e2e8f0",
      alignItems: "center",
    },
    title: { fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "center", lineHeight: 17 },
  },
  text_sidebar: {
    root: {
      maxWidth: 280,
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 6,
      borderTopWidth: 3,
      borderTopColor: "#2563eb",
      borderRadius: 8,
    },
    content: { gap: 4 },
    title: { fontSize: 14, fontWeight: "700" },
    body: { fontSize: 12, lineHeight: 17, color: "#64748b" },
  },
  text_minimal: {
    root: { paddingHorizontal: 2, paddingVertical: 6, borderWidth: 0, backgroundColor: "transparent" },
    link: { fontSize: 14, fontWeight: "500", color: "#2563eb" },
  },
};

const heroTitle: TextStyle = { fontSize: 15, fontWeight: "700", color: "#fff" };
const heroBody: TextStyle = { fontSize: 12, color: "rgba(255,255,255,0.92)", lineHeight: 16 };

const imageLayoutOverrides: Record<ImageLayout, AdCreativeStyles> = {
  image_hero: {
    root: { position: "relative", paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, borderRadius: 12 },
    media: { width: "100%" },
    image: { width: "100%", height: 200 },
    overlay: { paddingHorizontal: 16, paddingVertical: 14 },
    title: heroTitle,
    body: heroBody,
  },
  image_card: {
    root: {
      paddingVertical: 0,
      paddingHorizontal: 0,
      borderRadius: 16,
      borderWidth: 0,
      backgroundColor: "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    media: { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" },
    image: { width: "100%", height: 168 },
    caption: { paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
    title: { fontSize: 15, fontWeight: "700" },
    body: { fontSize: 13, lineHeight: 18 },
    link: { marginTop: 4, fontWeight: "600" },
  },
  image_strip: {
    root: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12, borderRadius: 10 },
    media: { borderRadius: 8, overflow: "hidden" },
    image: { width: 64, height: 64, borderRadius: 8 },
    content: { flex: 1, gap: 2 },
    title: { fontSize: 14, fontWeight: "600" },
    body: { fontSize: 12, lineHeight: 16, color: "#64748b" },
  },
  image_thumbnail: {
    root: {
      maxWidth: 300,
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 12,
      gap: 12,
      borderRadius: 10,
      backgroundColor: "#fafafa",
    },
    media: { borderRadius: 10, overflow: "hidden" },
    image: { width: 80, height: 80, borderRadius: 10 },
    content: { flex: 1, gap: 4, paddingTop: 2 },
    title: { fontSize: 14, fontWeight: "700" },
    body: { fontSize: 12, lineHeight: 17 },
    link: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  },
  image_inline: {
    root: { paddingVertical: 0, paddingHorizontal: 0, borderWidth: 0, backgroundColor: "transparent", gap: 8 },
    media: { borderRadius: 10, overflow: "hidden" },
    image: { width: "100%", height: 148, borderRadius: 10 },
    caption: { paddingHorizontal: 2, paddingVertical: 0, gap: 4 },
    title: { fontSize: 14, fontWeight: "600" },
    body: { fontSize: 13, color: "#64748b" },
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
