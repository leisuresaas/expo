# @leisuresaas/expo

Expo / React Native SDK for LeisureSaas **product OAuth**, **mobile billing**, and **platform ads** (catalog plans, store confirm/restore, subscription, ad banners).

Mirrors [`sdk/go`](../go) Integration API surface for Expo apps. Production apps should call a **product BFF** that holds the Integration API Key; use **gateway mode** only for local dev.

## Install

**公开发布（npm）：**

```bash
npm install @leisuresaas/expo
```

`metro.config.js` 需加入 `transpilePackages: ["@leisuresaas/expo"]`（SDK 为 TypeScript 源码）。  
发布流程见 [PUBLIC_PUBLISHING.md](./PUBLIC_PUBLISHING.md)。

**Monorepo 本地开发：**

```json
{
  "dependencies": {
    "@leisuresaas/expo": "file:../../sdk/expo"
  }
}
```

Peer dependencies: `expo`, `expo-auth-session`, `expo-secure-store`, `expo-web-browser`, `react`, `react-native`.

## Quick start (BFF — recommended)

```tsx
import {
  LeisureSaasAuthProvider,
  createLeisureSaasClient,
  devAppleSignedTransaction,
  mobilePlatform,
  useLeisureSaasAuth,
} from "@leisuresaas/expo";

const client = createLeisureSaasClient({
  bffBaseUrl: "https://api.myproduct.com",
});

export function App() {
  return (
    <LeisureSaasAuthProvider
      config={{
        issuer: "https://auth.example.com",
        clientId: "my-app-mobile",
        redirectScheme: "myapp",
      }}
    >
      <Home />
    </LeisureSaasAuthProvider>
  );
}

function Home() {
  const { accessToken, login } = useLeisureSaasAuth();
  // client.listPlans(accessToken, mobilePlatform())
  // client.confirmApplePurchase(accessToken, { signedTransaction: devAppleSignedTransaction(sku) })
}
```

Register OAuth redirect URI in Admin: `{scheme}://auth/callback` (from `makeRedirectUri`).

## Gateway mode (dev only)

```ts
const client = createLeisureSaasClient({
  mode: "gateway",
  gatewayUrl: "http://127.0.0.1:8080",
  integrationApiKey: process.env.EXPO_PUBLIC_INTEGRATION_KEY!,
});
```

Do **not** ship Integration API Key in App Store / Play builds.

## API

| Method | BFF | Gateway |
|--------|-----|---------|
| `listPlans(token, platform)` | ✅ | ✅ |
| `getSubscription(token)` | ✅ | ✅ |
| `getEntitlement(token)` | ✅ | ✅ |
| `confirmApplePurchase` | ✅ | ✅ |
| `confirmGooglePurchase` | ✅ | ✅ |
| `restoreApplePurchases` | ✅ | ✅ |
| `registerDeviceToken` | ✅ | ✅ |
| `unregisterDeviceToken` | ✅ | ✅ |
| `sendNotification` | ✅ | ✅ |
| `getAdsFeed` | ✅ | ✅ |
| `recordAdEvents` | ✅ | ✅ |
| `getQuotaUsage` | ❌ (proxy on BFF) | ✅ |
| `consumeQuota` | ❌ | ✅ |
| `checkPermission` | ❌ | ✅ |

## Dev store confirm

When billing `store.verification_mode: dev`:

```ts
import { devAppleSignedTransaction, devGooglePurchaseToken } from "@leisuresaas/expo";

await client.confirmApplePurchase(token, {
  signedTransaction: devAppleSignedTransaction("com.example.pro.monthly"),
  storeProductId: "com.example.pro.monthly",
});

await client.registerDeviceToken(token, {
  platform: mobilePlatform(),
  token: devDeviceToken(mobilePlatform()),
});
await client.sendNotification(token, {
  templateKey: "product_alert",
  vars: { message: "Hello from Expo" },
});
```

## Platform ads (UI components)

`GET /ads/feed` returns **`click_url`** (platform tracking URL, often short `/c/{short_id}`). Clients open it for navigation; impressions use `POST /ads/events` with Bearer.

```tsx
import {
  AdsProvider,
  AdBanner,
  createLeisureSaasClient,
  useLeisureSaasAuth,
} from "@leisuresaas/expo";

const client = createLeisureSaasClient({ bffBaseUrl: "https://api.myproduct.com" });

function Home() {
  const { resolveAccessToken } = useLeisureSaasAuth();

  return (
    <AdsProvider client={client} resolveAccessToken={resolveAccessToken}>
      <AdBanner />
    </AdsProvider>
  );
}
```

Lower-level API (custom UI):

```ts
const ads = await client.getAdsFeed(token, "home_banner");
await client.recordAdEvents(token, [{ adId: ads[0].id, eventType: "impression" }]);
// navigation: open ads[0].click_url (no Bearer)
```

Plan permissions: **not required** for feed/events (Integration Auth only). Product backend manage APIs need OAuth scope `ads:manage`.

## Reference

- [PUBLIC_PUBLISHING.md](./PUBLIC_PUBLISHING.md) — 公开发布到 npmjs.com
- [PUBLISHING.md](./PUBLISHING.md) — 私有发布（Git tag / GitHub Packages）
- [demo/mobile](../../demo/mobile) — sample Expo app
- [plan/openapi/integration-quota.yaml](../../plan/openapi/integration-quota.yaml)
- [sdk/go](../go) — Go backend SDK
