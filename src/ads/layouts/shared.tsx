import type { ReactNode } from "react";
import { Image, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import type { AdFeedItem } from "../../types";
import { AdRotationIndicators } from "../rotation/indicators";
import { useAdRotationIndicators } from "../rotation/indicators-context";
import type { AdCreativeStyles } from "../theme";

export type LayoutShellProps = {
  ad: AdFeedItem;
  onPress: () => void;
  styles: AdCreativeStyles;
  contentStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityLabel?: string;
};

export function adLabel(ad: AdFeedItem): string {
  return ad.title || ad.body_text || "Platform ad";
}

export function LayoutShell({
  ad, onPress, styles, contentStyle, children, accessibilityLabel,
}: LayoutShellProps) {
  const indicatorState = useAdRotationIndicators();

  return (
    <View style={[styles.root, contentStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [shellContentStyle, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? adLabel(ad)}
      >
        {children}
      </Pressable>
      {indicatorState ? <AdRotationIndicators state={indicatorState} /> : null}
    </View>
  );
}

const shellContentStyle = { width: "100%" as const, position: "relative" as const };

export function AdTitle({ text, styles, numberOfLines }: { text?: string; styles: AdCreativeStyles; numberOfLines?: number }) {
  if (!text) {
    return null;
  }
  return <Text style={styles.title} numberOfLines={numberOfLines}>{text}</Text>;
}

export function AdBody({ text, styles, numberOfLines }: { text?: string; styles: AdCreativeStyles; numberOfLines?: number }) {
  if (!text) {
    return null;
  }
  return <Text style={styles.body} numberOfLines={numberOfLines}>{text}</Text>;
}

export function AdLinkCta({ styles, label = "Learn more" }: { styles: AdCreativeStyles; label?: string }) {
  return <Text style={styles.link}>{label}</Text>;
}

export function AdBadge({ styles, label = "Ad" }: { styles: AdCreativeStyles; label?: string }) {
  if (!styles.badge) {
    return null;
  }
  return <Text style={styles.badge}>{label}</Text>;
}

export function AdImage({
  uri, styles, resizeMode = "cover",
}: { uri?: string; styles: AdCreativeStyles; resizeMode?: "cover" | "contain" }) {
  if (!uri) {
    return null;
  }
  return (
    <View style={styles.media}>
      <Image source={{ uri }} style={styles.image} resizeMode={resizeMode} />
    </View>
  );
}
