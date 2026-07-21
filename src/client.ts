import { requestJson } from "./http";
import {
  getPublicAdsFeed,
  recordPublicAdEvents,
  type PublicAdsRequestContext,
} from "./public-ads";
import { adsSurfaceHeaders } from "./platform";
import { buildEnablePushRegistration, fetchNativeDevicePushToken } from "./push";
import type {
  AdEventInput,
  AdFeedItem,
  AdsFeedResponse,
  AppleConfirmInput,
  DeviceTokenResult,
  EnablePushOptions,
  Entitlement,
  GatewayClientConfig,
  GoogleConfirmInput,
  LeisureSaasClientConfig,
  MobilePlatform,
  Plan,
  QuotaConsumeResult,
  QuotaUsage,
  RegisterDeviceTokenInput,
  SendNotificationInput,
  SendNotificationResult,
  StoreConfirmResult,
  SubscriptionStatus,
} from "./types";

type ClientMode = "bff" | "gateway";

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function resolveMode(config: LeisureSaasClientConfig): ClientMode {
  if ("mode" in config && config.mode === "gateway") {
    return "gateway";
  }
  return "bff";
}

function newIdempotencyKey(prefix: string): string {
  return `${prefix}-${Date.now()}`;
}

/**
 * HTTP client for LeisureSaas mobile billing and entitlement.
 *
 * - **bff** (default): call your product BFF with OAuth Bearer only (recommended).
 * - **gateway**: call `/api/v1/integration/*` directly (dev only — requires Integration API Key in app).
 */
export class LeisureSaasClient {
  private readonly mode: ClientMode;
  private readonly baseUrl: string;
  private readonly integrationPrefix: string;
  private readonly integrationApiKey?: string;
  private readonly publishableKey?: string;

  constructor(config: LeisureSaasClientConfig) {
    this.mode = resolveMode(config);
    if (this.mode === "gateway") {
      const gw = config as GatewayClientConfig;
      this.baseUrl = trimSlash(gw.gatewayUrl);
      this.integrationPrefix = `${this.baseUrl}/api/v1/integration`;
      this.integrationApiKey = gw.integrationApiKey.trim();
      this.publishableKey = gw.publishableKey?.trim() || undefined;
      if (!this.integrationApiKey) {
        throw new Error("LeisureSaasClient: integrationApiKey is required in gateway mode");
      }
    } else {
      const bff = config as Extract<LeisureSaasClientConfig, { bffBaseUrl: string }>;
      this.baseUrl = trimSlash(bff.bffBaseUrl);
      this.integrationPrefix = "";
    }
  }

  /** Gateway base URL when in gateway mode (for Public Ads direct calls). */
  gatewayBaseUrl(): string | undefined {
    if (this.mode === "gateway") {
      return this.baseUrl;
    }
    return undefined;
  }

  /** ads_pk from gateway client config, if any. */
  configuredPublishableKey(): string | undefined {
    return this.publishableKey;
  }

  getPublicAdsFeed(ctx: PublicAdsRequestContext, placement = "home_banner"): Promise<AdsFeedResponse> {
    return getPublicAdsFeed(ctx, placement);
  }

  recordPublicAdEvents(
    ctx: PublicAdsRequestContext,
    sessionId: string,
    events: AdEventInput[],
    accessToken?: string | null,
  ): Promise<number> {
    return recordPublicAdEvents(ctx, sessionId, events, accessToken);
  }

  private async get<T>(
    accessToken: string,
    bffPath: string,
    gatewayPath: string,
    headers?: Record<string, string>,
  ): Promise<T> {
    if (this.mode === "bff") {
      return requestJson<T>(this.baseUrl, bffPath, { accessToken, headers });
    }
    return requestJson<T>(this.integrationPrefix, gatewayPath, {
      accessToken,
      integrationApiKey: this.integrationApiKey,
      headers,
    });
  }

  private async post<T>(
    accessToken: string,
    bffPath: string,
    gatewayPath: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<T> {
    if (this.mode === "bff") {
      return requestJson<T>(this.baseUrl, bffPath, {
        accessToken,
        method: "POST",
        body,
        headers,
      });
    }
    return requestJson<T>(this.integrationPrefix, gatewayPath, {
      accessToken,
      integrationApiKey: this.integrationApiKey,
      method: "POST",
      body,
      headers,
    });
  }

  private async del<T>(
    accessToken: string,
    bffPath: string,
    gatewayPath: string,
  ): Promise<T> {
    if (this.mode === "bff") {
      return requestJson<T>(this.baseUrl, bffPath, { accessToken, method: "DELETE" });
    }
    return requestJson<T>(this.integrationPrefix, gatewayPath, {
      accessToken,
      integrationApiKey: this.integrationApiKey,
      method: "DELETE",
    });
  }

  listPlans(accessToken: string, platform: MobilePlatform): Promise<Plan[]> {
    if (this.mode === "bff") {
      return this.get<{ plans: Plan[] }>(
        accessToken,
        `/api/v1/plans?platform=${encodeURIComponent(platform)}`,
        "/catalog/plans",
      ).then((r) => r.plans ?? []);
    }
    return this.get<{ plans: Plan[] }>(accessToken, "", "/catalog/plans", {
      "X-Client-Platform": platform,
    }).then((r) => r.plans ?? []);
  }

  getSubscription(accessToken: string): Promise<SubscriptionStatus> {
    return this.get<SubscriptionStatus>(
      accessToken,
      "/api/v1/subscription",
      "/billing/subscription",
    );
  }

  getEntitlement(accessToken: string): Promise<Entitlement> {
    return this.get<Entitlement>(accessToken, "/api/v1/entitlement", "/entitlement");
  }

  checkPermission(accessToken: string, permissionKey: string): Promise<boolean> {
    if (this.mode === "bff") {
      throw new Error("LeisureSaasClient: checkPermission requires gateway mode or a BFF route");
    }
    return this.post<{ allowed: boolean }>(accessToken, "", "/permissions/check", {
      permission_key: permissionKey,
    }).then((r) => r.allowed);
  }

  getQuotaUsage(accessToken: string, metricKey: string): Promise<QuotaUsage> {
    if (this.mode === "bff") {
      throw new Error("LeisureSaasClient: getQuotaUsage requires gateway mode or a BFF proxy");
    }
    const q = encodeURIComponent(metricKey.trim());
    return this.get<QuotaUsage>(accessToken, "", `/quota?metric_key=${q}`);
  }

  consumeQuota(accessToken: string, metricKey: string, delta: number): Promise<QuotaConsumeResult> {
    if (this.mode === "bff") {
      throw new Error("LeisureSaasClient: consumeQuota requires gateway mode or a BFF proxy");
    }
    return this.post<QuotaConsumeResult>(accessToken, "", "/quota/consume", {
      metric_key: metricKey,
      delta,
    });
  }

  confirmApplePurchase(accessToken: string, input: AppleConfirmInput): Promise<StoreConfirmResult> {
    const idem = input.idempotencyKey?.trim() || newIdempotencyKey("apple");
    const headers = { "Idempotency-Key": idem };
    const payload = {
      signed_transaction: input.signedTransaction,
      store_product_id: input.storeProductId ?? "",
    };
    if (this.mode === "bff") {
      return this.post<StoreConfirmResult>(
        accessToken,
        "/api/v1/store/apple/confirm",
        "/billing/apple/confirm",
        { ...payload, idempotency_key: idem },
        headers,
      );
    }
    return this.post<StoreConfirmResult>(
      accessToken,
      "",
      "/billing/apple/confirm",
      payload,
      headers,
    );
  }

  confirmGooglePurchase(accessToken: string, input: GoogleConfirmInput): Promise<StoreConfirmResult> {
    const idem = input.idempotencyKey?.trim() || newIdempotencyKey("google");
    const headers = { "Idempotency-Key": idem };
    const payload = {
      purchase_token: input.purchaseToken,
      store_product_id: input.storeProductId,
    };
    if (this.mode === "bff") {
      return this.post<StoreConfirmResult>(
        accessToken,
        "/api/v1/store/google/confirm",
        "/billing/google/confirm",
        { ...payload, idempotency_key: idem },
        headers,
      );
    }
    return this.post<StoreConfirmResult>(
      accessToken,
      "",
      "/billing/google/confirm",
      payload,
      headers,
    );
  }

  restoreApplePurchases(accessToken: string, signedTransactions: string[]): Promise<StoreConfirmResult> {
    if (this.mode === "bff") {
      return this.post<StoreConfirmResult>(
        accessToken,
        "/api/v1/store/apple/restore",
        "/billing/apple/restore",
        { signed_transactions: signedTransactions },
      );
    }
    return this.post<StoreConfirmResult>(accessToken, "", "/billing/apple/restore", {
      signed_transactions: signedTransactions,
    });
  }

  registerDeviceToken(
    accessToken: string,
    input: RegisterDeviceTokenInput,
  ): Promise<DeviceTokenResult> {
    const body: Record<string, string> = {
      platform: input.platform,
      token: input.token,
    };
    if (input.androidPackage) body.android_package = input.androidPackage;
    if (input.bundleId) body.bundle_id = input.bundleId;
    if (input.environment) body.environment = input.environment;
    return this.post<DeviceTokenResult>(
      accessToken,
      "/api/v1/notifications/device-tokens",
      "/notifications/device-tokens",
      body,
    );
  }

  /**
   * Request notification permission, fetch the native FCM/APNs device token, and register it.
   * Requires peer dependency `expo-notifications` (and a Dev Client / Store build — not Expo Go).
   */
  async enablePush(accessToken: string, opts?: EnablePushOptions): Promise<DeviceTokenResult> {
    const input = await buildEnablePushRegistration(opts);
    return this.registerDeviceToken(accessToken, input);
  }

  /** Unregister the current native device push token (or an explicit token). */
  async disablePush(accessToken: string, token?: string): Promise<DeviceTokenResult> {
    const value = (token ?? (await fetchNativeDevicePushToken())).trim();
    return this.unregisterDeviceToken(accessToken, value);
  }

  unregisterDeviceToken(accessToken: string, token: string): Promise<DeviceTokenResult> {
    const encoded = encodeURIComponent(token.trim());
    return this.del<DeviceTokenResult>(
      accessToken,
      `/api/v1/notifications/device-tokens/${encoded}`,
      `/notifications/device-tokens/${encoded}`,
    );
  }

  getAdsFeed(accessToken: string, placement = "home_banner"): Promise<AdsFeedResponse> {
    const q = encodeURIComponent(placement.trim());
    return this.get<AdsFeedResponse>(
      accessToken,
      `/api/v1/ads/feed?placement=${q}`,
      `/ads/feed?placement=${q}`,
      adsSurfaceHeaders(),
    ).then((r) => ({ ...r, ads: r.ads ?? [] }));
  }

  recordAdEvents(accessToken: string, events: AdEventInput[]): Promise<number> {
    if (events.length === 0) {
      return Promise.resolve(0);
    }
    const payload = {
      events: events.map((ev) => {
        const lineupId = ev.lineupId?.trim() ?? "";
        return {
          ad_id: ev.adId,
          event_type: ev.eventType,
          ...(ev.placementKey ? { placement_key: ev.placementKey } : {}),
          ...(lineupId ? { lineup_id: lineupId } : {}),
        };
      }),
    };
    return this.post<{ recorded: number }>(
      accessToken,
      "/api/v1/ads/events",
      "/ads/events",
      payload,
      adsSurfaceHeaders(),
    ).then((r) => r.recorded ?? 0);
  }

  sendNotification(
    accessToken: string,
    input: SendNotificationInput,
  ): Promise<SendNotificationResult> {
    const idem = input.idempotencyKey?.trim() || newIdempotencyKey("push");
    const headers = { "Idempotency-Key": idem };
    const body: Record<string, unknown> = { template_key: input.templateKey };
    if (input.userId?.trim()) {
      body.user_id = input.userId.trim();
    }
    if (input.locale?.trim()) {
      body.locale = input.locale.trim();
    }
    if (input.channel?.trim()) {
      body.channel = input.channel.trim();
    }
    if (input.toEmail?.trim()) {
      body.to_email = input.toEmail.trim();
    }
    if (input.vars && Object.keys(input.vars).length > 0) {
      body.vars = input.vars;
    }
    return this.post<SendNotificationResult>(
      accessToken,
      "/api/v1/notifications/send",
      "/notifications/send",
      body,
      headers,
    );
  }
}

export function createLeisureSaasClient(config: LeisureSaasClientConfig): LeisureSaasClient {
  return new LeisureSaasClient(config);
}
