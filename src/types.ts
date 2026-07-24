export type MobilePlatform = "ios" | "android";

export type Plan = {
  plan_id: string;
  name: string;
  code?: string;
  description?: string;
  includes?: { text: string; href?: string; accent?: boolean }[];
  plan_version_id?: string;
  payment_channel?: string;
  is_current?: boolean;
};

export type SubscriptionStatus = {
  id?: string;
  status: string;
  plan_id?: string;
  plan_version_id?: string;
  billing_source?: string;
  current_period_end_unix?: number;
};

export type StoreConfirmResult = {
  subscription?: SubscriptionStatus;
  order_id?: string;
};

export type QuotaUsage = {
  metric_key: string;
  limit: number;
  used: number;
  remaining: number;
  period: string;
  period_key: string;
};

export type QuotaConsumeResult = {
  allowed: boolean;
  remaining: number;
};

export type Entitlement = {
  id?: string;
  tenant_id?: string;
  product_id?: string;
  plan_id?: string;
  plan_version_id?: string;
  status?: string;
  permission_keys?: string[];
  quotas?: { metric_key: string; limit: number; period: string }[];
};

/** Product BFF (recommended): Bearer only; Integration Key stays on server. */
export type BffClientConfig = {
  mode?: "bff";
  bffBaseUrl: string;
};

  /** Direct gateway (dev / internal builds only — do not ship Integration Key in store apps). */
export type GatewayClientConfig = {
  mode: "gateway";
  gatewayUrl: string;
  integrationApiKey: string;
  /** Optional ads_pk for Public Ads API (safe to embed in client builds). */
  publishableKey?: string;
};

export type LeisureSaasClientConfig = BffClientConfig | GatewayClientConfig;

export type AppleConfirmInput = {
  signedTransaction: string;
  storeProductId?: string;
  idempotencyKey?: string;
};

export type GoogleConfirmInput = {
  purchaseToken: string;
  storeProductId: string;
  idempotencyKey?: string;
};

export type RegisterDeviceTokenInput = {
  platform: MobilePlatform;
  token: string;
  androidPackage?: string;
  bundleId?: string;
  environment?: "development" | "production";
};

export type EnablePushOptions = {
  platform?: MobilePlatform;
  androidPackage?: string;
  bundleId?: string;
  environment?: "development" | "production";
};

export type SendNotificationInput = {
  templateKey: string;
  userId?: string;
  channel?: "email" | "push" | "inbox";
  toEmail?: string;
  locale?: string;
  vars?: Record<string, string>;
  idempotencyKey?: string;
};

export type ChannelSendResult = {
  channel?: string;
  status?: string;
  delivery_id?: string;
  recipient_count?: number;
  error?: string;
};

export type SendNotificationResult = {
  status?: string;
  results?: ChannelSendResult[];
};

export type DeviceTokenResult = {
  status?: string;
};

export type AuthConfig = {
  issuer: string;
  clientId: string;
  redirectScheme: string;
  redirectPath?: string;
  scopes?: string[];
  storageKey?: string;
  refreshStorageKey?: string;
  /**
   * OAuth authorize `terminal` for Hosted UI layout (`mobile` = compact In-App Browser).
   * Default: `mobile`.
   */
  terminal?: "mobile" | "web";
  /**
   * Hosted UI UI language (BCP 47). Sent as OIDC `ui_locales` on authorize and used to
   * rewrite Hosted UI HTTPS paths opened via deep link (e.g. `de` → `/de/…`).
   * Invalid tags fall back to `en` (no closed locale allow-list in the SDK).
   */
  locale?: string;
  /** When true (default), Universal Links to Hosted UI reset-password open In-App Browser. */
  handlePasswordResetLinks?: boolean;
};

/** @deprecated Use AuthConfig */
export type LeisureSaasAuthConfig = AuthConfig;

export type AdFeedItem = {
  id: string;
  scope?: string;
  type: string;
  placement?: string;
  priority?: number;
  title?: string;
  body_text?: string;
  image_url?: string;
  click_url?: string;
};

export type AdFeedRotation = {
  enabled: boolean;
  mode: string;
  interval_sec: number;
  loop: boolean;
  autoplay: boolean;
  show_indicators: boolean;
};

export type AdFeedSource = {
  kind: string;
  lineup_id?: string;
  scope: string;
  overridden?: boolean;
};

export type AdsFeedResponse = {
  placement: string;
  surface_key?: string;
  type?: string;
  layout?: string;
  source?: AdFeedSource;
  rotation?: AdFeedRotation;
  ads: AdFeedItem[];
};

export type AdEventInput = {
  adId: string;
  eventType: "impression";
  placementKey?: string;
  lineupId?: string;
};
