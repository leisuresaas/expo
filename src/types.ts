export type MobilePlatform = "ios" | "android";

/** Shared shape for product BFF plan list responses (optional typing aid). */
export type Plan = {
  plan_id: string;
  name: string;
  code?: string;
  description?: string;
  includes?: { text: string; href?: string; accent?: boolean }[];
  plan_version_id?: string;
  payment_channel?: string;
  payment_mode?: string;
  is_current?: boolean;
  seat_limit?: number;
  sort_order?: number;
  recommended?: boolean;
};

export type SubscriptionStatus = {
  id?: string;
  status: string;
  plan_id?: string;
  plan_version_id?: string;
  billing_source?: string;
  current_period_end_unix?: number;
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

/** Body for product BFF `POST …/notifications/device-tokens` (from buildEnablePushRegistration). */
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
