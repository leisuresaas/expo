import Constants from "expo-constants";

export function appBundleId(): string {
  const ios = Constants.expoConfig?.ios?.bundleIdentifier?.trim();
  if (ios) {
    return ios;
  }
  return Constants.expoConfig?.android?.package?.trim() ?? "";
}
