export type AdType = "text" | "image";

export type TextLayout =
  | "text_inline"
  | "text_callout"
  | "text_footer"
  | "text_sidebar"
  | "text_minimal";

export type ImageLayout =
  | "image_hero"
  | "image_card"
  | "image_strip"
  | "image_thumbnail"
  | "image_inline";

export type AdLayout = TextLayout | ImageLayout;

export type AdRotationMode = "none" | "fade" | "slide" | "stack";

export const AD_TYPES: readonly AdType[] = ["text", "image"] as const;

export const TEXT_LAYOUTS: readonly TextLayout[] = [
  "text_inline",
  "text_callout",
  "text_footer",
  "text_sidebar",
  "text_minimal",
] as const;

export const IMAGE_LAYOUTS: readonly ImageLayout[] = [
  "image_hero",
  "image_card",
  "image_strip",
  "image_thumbnail",
  "image_inline",
] as const;

export const AD_ROTATION_MODES: readonly AdRotationMode[] = [
  "none", "fade", "slide", "stack",
] as const;

export const DEFAULT_TEXT_LAYOUT: TextLayout = "text_inline";
export const DEFAULT_IMAGE_LAYOUT: ImageLayout = "image_hero";
export const DEFAULT_ROTATION_MODE: AdRotationMode = "fade";
export const IMPRESSION_MIN_DWELL_MS = 300;
export const ROTATION_ANIM_MS = 300;

export function layoutsForType(type: AdType): readonly AdLayout[] {
  return type === "text" ? TEXT_LAYOUTS : IMAGE_LAYOUTS;
}

export function defaultLayoutForType(type: AdType): AdLayout {
  return type === "text" ? DEFAULT_TEXT_LAYOUT : DEFAULT_IMAGE_LAYOUT;
}

export function normalizeAdType(raw?: string): AdType {
  const key = (raw ?? "").trim();
  return key === "image" ? "image" : "text";
}

export function normalizeLayout(type: AdType, raw?: string): AdLayout {
  const key = (raw ?? "").trim();
  const allowed = layoutsForType(type);
  if (allowed.includes(key as AdLayout)) {
    return key as AdLayout;
  }
  return defaultLayoutForType(type);
}

export function normalizeRotationMode(raw?: string, enabled?: boolean): AdRotationMode {
  if (!enabled) {
    return "none";
  }
  const key = (raw ?? "").trim() as AdRotationMode;
  return AD_ROTATION_MODES.includes(key) ? key : DEFAULT_ROTATION_MODE;
}

export function effectiveRotationMode(rotation?: { enabled?: boolean; mode?: string }, adCount = 0): AdRotationMode {
  if (adCount <= 1 || !rotation?.enabled) {
    return "none";
  }
  return normalizeRotationMode(rotation.mode, true);
}

export function isTextLayout(layout: AdLayout): layout is TextLayout {
  return (TEXT_LAYOUTS as readonly string[]).includes(layout);
}

export function isImageLayout(layout: AdLayout): layout is ImageLayout {
  return (IMAGE_LAYOUTS as readonly string[]).includes(layout);
}
