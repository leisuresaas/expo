import { Image, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";

import type { AdFeedItem } from "../types";
import type { AdCreativeStyles } from "./theme";

export type AdCreativeViewProps = {
  ad: AdFeedItem;
  onPress: () => void;
  styles: AdCreativeStyles;
  contentStyle?: StyleProp<ViewStyle>;
  showImage?: boolean;
  variant?: "stacked" | "row" | "compact" | "inline" | "text";
};

function pressableStyle(styles: AdCreativeStyles, pressed: boolean, extra?: StyleProp<ViewStyle>) {
  return [styles.root, pressed && styles.pressed, extra];
}

export function AdCreativeView({
  ad, onPress, styles, contentStyle, showImage = true, variant = "stacked",
}: AdCreativeViewProps) {
  const hasImage = showImage && ad.type === "image" && !!ad.image_url;
  const label = ad.title || ad.body_text || "Platform ad";

  if (variant === "row" && hasImage) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressableStyle(styles, pressed, contentStyle)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
        <View style={styles.content}>
          {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
          {ad.body_text ? <Text style={styles.body}>{ad.body_text}</Text> : null}
        </View>
      </Pressable>
    );
  }

  if (variant === "compact" && hasImage) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressableStyle(styles, pressed, [contentStyle, { flexDirection: "row", alignItems: "center", gap: 8 }])}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
        <View style={styles.content}>
          {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
          {ad.body_text ? <Text style={styles.body} numberOfLines={1}>{ad.body_text}</Text> : null}
        </View>
      </Pressable>
    );
  }

  if (variant === "text") {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressableStyle(styles, pressed, contentStyle)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
        {ad.body_text ? <Text style={styles.body}>{ad.body_text}</Text> : null}
        <Text style={styles.link}>Learn more</Text>
      </Pressable>
    );
  }

  if (hasImage) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => pressableStyle(styles, pressed, contentStyle)}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Image source={{ uri: ad.image_url }} style={styles.image} resizeMode="cover" />
        {(ad.title || ad.body_text) ? (
          <View style={styles.caption}>
            {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
            {ad.body_text ? <Text style={styles.body}>{ad.body_text}</Text> : null}
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => pressableStyle(styles, pressed, [contentStyle, variant === "inline" && { gap: 4 }])}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {ad.title ? <Text style={styles.title}>{ad.title}</Text> : null}
      {ad.body_text ? <Text style={styles.body}>{ad.body_text}</Text> : null}
      {variant === "inline" && ad.click_url ? <Text style={styles.link}>Learn more</Text> : null}
    </Pressable>
  );
}
