import { Platform } from "react-native";

import type { MobilePlatform } from "./types";

export function mobilePlatform(): MobilePlatform {
  return Platform.OS === "ios" ? "ios" : "android";
}
