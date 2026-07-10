import type { ReactNode } from "react";
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";

import type { AdFeedItem, AdFeedRotation } from "../types";
import type { AdLayout, AdType } from "./constants";

export type AdCreativeStyles = {
  root?: ViewStyle;
  pressed?: ViewStyle;
  image?: ImageStyle;
  title?: TextStyle;
  body?: TextStyle;
  link?: TextStyle;
  caption?: ViewStyle;
  media?: ViewStyle;
  content?: ViewStyle;
};

export type AdRotationStyles = {
  root?: ViewStyle;
  slide?: ViewStyle;
  indicators?: ViewStyle;
  dot?: ViewStyle;
  dotActive?: ViewStyle;
};

export type TextLayoutStyles = Partial<Record<import("./constants").TextLayout, AdCreativeStyles>>;
export type ImageLayoutStyles = Partial<Record<import("./constants").ImageLayout, AdCreativeStyles>>;

export type AdLayoutStyles = {
  text?: TextLayoutStyles;
  image?: ImageLayoutStyles;
};

export type AdsStateStyles = {
  loading?: ViewStyle;
  empty?: TextStyle;
  error?: TextStyle;
};

export type AdsTheme = {
  creative?: AdCreativeStyles;
  rotation?: AdRotationStyles;
  layouts?: AdLayoutStyles;
  states?: AdsStateStyles;
};

export type ResolvedCreativeStyles = Required<Pick<AdCreativeStyles, never>> & AdCreativeStyles;

export type ResolvedAdsTheme = {
  creative: AdCreativeStyles;
  rotation: AdRotationStyles;
  layouts: {
    text: Record<import("./constants").TextLayout, AdCreativeStyles>;
    image: Record<import("./constants").ImageLayout, AdCreativeStyles>;
  };
  states: AdsStateStyles;
};

export type AdRenderContext = {
  ad: AdFeedItem;
  adType: AdType;
  layout: AdLayout;
  placement: string;
  index: number;
  count: number;
  onPress: () => void;
  theme: ResolvedAdsTheme;
};

export type AdLayoutRenderContext = AdRenderContext & {
  styles: AdCreativeStyles;
};

export type AdProps = {
  placement?: string;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  theme?: AdsTheme;
  styles?: AdLayoutStyles;
  onError?: (error: Error) => void;
  onPress?: (ad: AdFeedItem) => void;
  showEmpty?: boolean;
  showIndicators?: boolean;
  renderAd?: (ctx: AdRenderContext) => ReactNode;
  renderLayout?: (ctx: AdLayoutRenderContext) => ReactNode;
};

export type UseAdsFeedOptions = {
  placement?: string;
  enabled?: boolean;
};

export type UseAdsFeedResult = {
  feed: import("../types").AdsFeedResponse | null;
  ad: AdFeedItem | null;
  ads: AdFeedItem[];
  layout?: string;
  rotation?: AdFeedRotation;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};
