import { Pressable, View } from "react-native";

import type { AdRotationIndicatorState } from "./indicators-context";

type AdRotationIndicatorsProps = {
  state: AdRotationIndicatorState;
};

/** Rendered once inside the ad root View — avoids absolute positioning bugs under Pressable. */
export function AdRotationIndicators({ state }: AdRotationIndicatorsProps) {
  const { ads, index, onIndexChange, styles } = state;

  return (
    <View style={styles.indicators} pointerEvents="box-none">
      {ads.map((item, i) => (
        <Pressable key={item.id} onPress={() => onIndexChange(i)} hitSlop={8}>
          <View style={[styles.dot, i === index && styles.dotActive]} />
        </Pressable>
      ))}
    </View>
  );
}
