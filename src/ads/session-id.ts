import * as SecureStore from "expo-secure-store";

const STORAGE_KEY = "leisuresaas_ads_session_id";

function randomSessionId(): string {
  const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${hex()}${hex()}-${hex().slice(0, 4)}-4${hex().slice(1, 4)}-a${hex().slice(1, 4)}-${hex()}${hex()}${hex()}`.slice(0, 36);
}

export async function getOrCreateAdsSessionId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(STORAGE_KEY);
  if (existing?.trim()) {
    return existing.trim();
  }
  const id = randomSessionId();
  await SecureStore.setItemAsync(STORAGE_KEY, id);
  return id;
}
