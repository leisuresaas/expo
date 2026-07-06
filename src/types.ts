export type MobilePlatform = "ios" | "android";

export type Plan = {
  plan_id: string;
  name: string;
  code?: string;
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

export type LeisureSaasAuthConfig = {
  issuer: string;
  clientId: string;
  redirectScheme: string;
  redirectPath?: string;
  scopes?: string[];
  storageKey?: string;
  refreshStorageKey?: string;
};
