import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, View } from "react-native";

import type { AdFeedItem, AdFeedRotation } from "../../types";
import { ROTATION_ANIM_MS, effectiveRotationMode, type AdRotationMode } from "../constants";
import type { AdRotationStyles } from "../theme";

export type AdRotationShellProps = {
  ads: AdFeedItem[];
  rotation?: AdFeedRotation;
  index: number;
  onIndexChange: (index: number) => void;
  styles: AdRotationStyles;
  showIndicators: boolean;
  renderSlide: (ad: AdFeedItem, index: number) => ReactNode;
  rootStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};

function AnimatedSlide({
  mode, slideKey, children, slideStyle,
}: {
  mode: AdRotationMode;
  slideKey: string;
  children: ReactNode;
  slideStyle?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mode === "none") {
      return;
    }
    opacity.setValue(mode === "fade" ? 0 : 1);
    translateX.setValue(mode === "slide" ? 24 : 0);
    translateY.setValue(mode === "stack" ? 10 : 0);
    scale.setValue(mode === "stack" ? 0.96 : 1);

    const anims: Animated.CompositeAnimation[] = [];
    if (mode === "fade") {
      anims.push(Animated.timing(opacity, { toValue: 1, duration: ROTATION_ANIM_MS, useNativeDriver: true }));
    }
    if (mode === "slide") {
      anims.push(Animated.timing(translateX, { toValue: 0, duration: ROTATION_ANIM_MS, useNativeDriver: true }));
    }
    if (mode === "stack") {
      anims.push(
        Animated.timing(translateY, { toValue: 0, duration: ROTATION_ANIM_MS, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: ROTATION_ANIM_MS, useNativeDriver: true }),
      );
    }
    Animated.parallel(anims).start();
  }, [slideKey, mode, opacity, translateX, translateY, scale]);

  if (mode === "none") {
    return <View style={slideStyle}>{children}</View>;
  }

  return (
    <Animated.View
      style={[
        slideStyle,
        mode === "fade" && { opacity },
        mode === "slide" && { transform: [{ translateX }] },
        mode === "stack" && { transform: [{ translateY }, { scale }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function AdRotationShell({
  ads, rotation, index, onIndexChange, styles, showIndicators, renderSlide, rootStyle,
}: AdRotationShellProps) {
  const mode = effectiveRotationMode(rotation, ads.length);
  const ad = ads[index] ?? ads[0];
  if (!ad) {
    return null;
  }

  return (
    <View style={[styles.root, rootStyle]}>
      <AnimatedSlide mode={mode} slideKey={ad.id} slideStyle={styles.slide}>
        {renderSlide(ad, index)}
      </AnimatedSlide>
      {showIndicators && ads.length > 1 ? (
        <View style={styles.indicators}>
          {ads.map((item, i) => (
            <Pressable key={item.id} onPress={() => onIndexChange(i)} hitSlop={8}>
              <View style={[styles.dot, i === index && styles.dotActive]} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
