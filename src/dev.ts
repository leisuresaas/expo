/** Dev-mode Apple signed_transaction for store.verification_mode=dev. */
export function devAppleSignedTransaction(storeProductId: string, suffix?: string): string {
  const tx = suffix?.trim() || `expo-${Date.now()}`;
  return `dev:${storeProductId.trim()}:${tx}`;
}

/** Dev-mode Google purchase_token for store.verification_mode=dev. */
export function devGooglePurchaseToken(suffix?: string): string {
  return `dev-token-${suffix?.trim() || Date.now()}`;
}
