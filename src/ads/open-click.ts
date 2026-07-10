import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

export async function openAdClickUrl(url: string): Promise<void> {
  if (!url) {
    return;
  }
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}
