# @leisuresaas/expo

Expo / React Native SDK for LeisureSaas **product OAuth**, **mobile billing**, **platform ads**, **app version updates**, and **notifications** (device token + send via product BFF / Integration).

Mirrors [`sdk/go`](../go) Integration API surface for Expo apps. Production apps should call a **product BFF** that holds the Integration API Key; use **gateway mode** only for local dev.

**Push（定稿）**：使用**原生** FCM/APNs token。推荐：

```ts
await client.enablePush(accessToken);   // 权限 + getDevicePushTokenAsync + Register(+meta)
await client.disablePush(accessToken);  // 注销当前原生 token
```

需要 peer `expo-notifications`，且必须是 Dev Client / Store 构建（**不要** Expo Go / `getExpoPushTokenAsync` / `ExponentPushToken`）。产品须在 Admin 上传自有 FCM/APNs（Credential Vault）。详见 [plan/services/notification-platform.md](../../plan/services/notification-platform.md)。

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

Peer dependencies: `expo`, `expo-auth-session`, `expo-secure-store`, `expo-web-browser`, `react`, `react-native`；Push 还需可选 peer `expo-notifications`。

## Quick start (BFF — recommended)

```tsx
import {
  AuthProvider,
  createLeisureSaasClient,
  devAppleSignedTransaction,
  mobilePlatform,
  useAuth,
} from "@leisuresaas/expo";

const client = createLeisureSaasClient({
  bffBaseUrl: "https://api.myproduct.com",
});

export function App() {
  return (
    <AuthProvider
      config={{
        issuer: "https://auth.example.com",
        clientId: "my-app-mobile",
        redirectScheme: "myapp",
        terminal: "mobile", // Hosted UI compact layout (default)
        // locale: "de", // BCP 47; invalid tags fall back to en (no SDK allow-list)
      }}
    >
      <Home />
    </AuthProvider>
  );
}

function Home() {
  const { accessToken, login } = useAuth();
  // client.listPlans(accessToken, mobilePlatform())
  // client.confirmApplePurchase(accessToken, { signedTransaction: devAppleSignedTransaction(sku) })
}
```

Register OAuth redirect URI in Admin: `{scheme}://auth/callback` (from `makeRedirectUri`).

Also register `{scheme}://auth/password-reset-done` (or same scheme) so Hosted UI can return after password reset.

### Auth storage (Native vs Web)

| Environment | Behavior |
|-------------|----------|
| **Native** | Always `SecureStore` (Keychain / Keystore) |
| **Web + `__DEV__`** | Persist access/refresh in `localStorage` so `npm start` can debug OAuth in the browser |
| **Web production** | **No** durable OAuth tokens — `login()` / persist throw; use the native app |

### Password reset deep link (Universal Links)

When the user taps a password-reset email link, iOS/Android should open your App (Associated Domains / App Links on the Hosted UI host). `AuthProvider` then opens the same HTTPS URL in an In-App Browser (`terminal=mobile` Hosted UI).

1. Admin → Product → Domains → **App Links**: set `app_scheme`, iOS Team/Bundle, Android package + SHA-256.
2. Expo `app.json`: `scheme`, `ios.associatedDomains` (`applinks:{slug}.hosted-ui…`), Android `intentFilters` with `autoVerify`.
3. Keep `handlePasswordResetLinks` enabled (default) on `AuthProvider`, or call `handleHostedUILink(url)` yourself.

> Deprecated aliases: `LeisureSaasAuthProvider` / `useLeisureSaasAuth` still export to `AuthProvider` / `useAuth`.

### OIDC UserInfo

After login, fetch profile from the platform issuer (not by inventing email→user APIs):

```ts
import { fetchUserInfo } from "@leisuresaas/expo";

const user = await fetchUserInfo(issuer, accessToken);
// user.sub, user.email, user.name
```

Token response may also include `id_token` when scope includes `openid` (verify with JWKS).

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
| `listPlans(token, platform, locale?)` | ✅ | ✅ |
| `getSubscription(token)` | ✅ | ✅ |
| `getEntitlement(token)` | ✅ | ✅ |
| `confirmApplePurchase` | ✅ | ✅ |
| `confirmGooglePurchase` | ✅ | ✅ |
| `restoreApplePurchases` | ✅ | ✅ |
| `registerDeviceToken` | ✅ | ✅ |
| `enablePush` / `disablePush` | ✅ | ✅ |
| `unregisterDeviceToken` | ✅ | ✅ |
| `sendNotification` | ✅ | ✅ |
| `getAdsFeed` / `recordAdEvents` | ✅ deprecated 2026-12-31 | ✅ deprecated |
| `getPublicAdsFeed` / `recordPublicAdEvents` | gateway URL + `pk_live_`（推荐） | ✅ |
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
// Treat success only when the response includes a non-empty order_id.

await client.enablePush(token);
await client.sendNotification(token, {
  templateKey: "product_alert",
  vars: { message: "Hello from Expo" },
});
```

> `enablePush()` 需要 Dev Client / Store build + `expo-notifications`。`devDeviceToken` 仅本地冒烟，不能验收真机推送。

## App version updates (Public App Config)

> **AI 接入指南**：[plan/product-app-config-integration.md](../../plan/product-app-config-integration.md)  
> **平台方案**：[plan/app-config-platform.md](../../plan/app-config-platform.md)

未登录冷启动 / 回前台检查更新（`app_cfg_pk`）。客户端**不要**自写 semver，只读 `update.required` / `update.recommended`。

**Settings UI 由产品自绘**（headless）：SDK 只提供状态与动作；样式跟产品设置页一致。

```tsx
import {
  AppUpdateProvider,
  useAppVersionSettings,
} from "@leisuresaas/expo";

<AppUpdateProvider
  publishableKey={process.env.EXPO_PUBLIC_PUBLISHABLE_KEY!}
  gatewayUrl={process.env.EXPO_PUBLIC_OAUTH_ISSUER!}
>
  {children}
</AppUpdateProvider>

// Settings — product-owned layout
function AppVersionSection() {
  const s = useAppVersionSettings();
  return (
    <YourCard>
      <YourTitle>{s.labels.settingsTitle}</YourTitle>
      <YourMuted>{s.displayVersion}</YourMuted>
      {s.message ? <YourBody>{s.message}</YourBody> : null}
      <YourRow>
        <YourLink onPress={() => void s.checkNow()} disabled={s.busy}>
          {s.busy || s.status === "checking" ? s.labels.checking : s.labels.checkForUpdates}
        </YourLink>
        {s.canOpenStore ? (
          <YourLink onPress={() => void s.openStore()}>{s.labels.openStore}</YourLink>
        ) : null}
      </YourRow>
    </YourCard>
  );
}
```

可选参考实现（无样式承诺）：`<AppVersionSettingsCard />`，或 render prop：

```tsx
<AppVersionSettingsCard>
  {(s) => <YourCard>{/* same fields as above */}</YourCard>}
</AppVersionSettingsCard>
```

| Env | 说明 |
|-----|------|
| `EXPO_PUBLIC_PUBLISHABLE_KEY` | Admin Access → Publishable keys（`pk_live_`） |
| `EXPO_PUBLIC_OAUTH_ISSUER` | Gateway 根 URL（与 OAuth issuer 同主机即可） |

可选：`labels` 覆盖弹窗文案；`onUpdateRequired` / `onUpdateRecommended` 自定义冷启动弹窗；`skipInDev` / `skipOnWeb`（默认 `__DEV__` 与 Web 不弹窗）。`required` 不可 dismiss；`recommended` 按 `latest_version` 持久化 dismiss（SecureStore）。

## Platform ads (UI components)

> **AI 接入指南**：[plan/product-ads-integration.md](../../plan/product-ads-integration.md)  
> **Public Ads（v0.4.0+）**：未登录展示用 `publishableKey`；Integration feed 将于 2026-12-31 下线。

### Public Ads（推荐 — 未登录可展示）

```tsx
import {
  AdsProvider,
  AdBanner,
  createLeisureSaasClient,
  useAuth,
} from "@leisuresaas/expo";

const client = createLeisureSaasClient({ bffBaseUrl: "https://api.myproduct.com" });

<AdsProvider
  client={client}
  publishableKey={process.env.EXPO_PUBLIC_PUBLISHABLE_KEY!}
  publicAdsGatewayUrl="https://gateway.example.com"
  resolveAccessToken={resolveAccessToken}
>
  <AdBanner />
</AdsProvider>
```

- `publishableKey`：Admin 创建的 `pk_live_...`（可打进 App）
- `publicAdsGatewayUrl`：gateway 根 URL（BFF 模式必填；gateway 模式可省略）
- `resolveAccessToken` 可选；登录后 impression 可附带 user_id
- `session_id` 由 SDK 自动生成并持久化（SecureStore）

Lower-level:

```ts
import { getPublicAdsFeed, recordPublicAdEvents, lineupIdFromSource, adsSurfaceKey, appBundleId } from "@leisuresaas/expo";

const ctx = {
  gatewayUrl: "https://gateway.example.com",
  publishableKey: "pk_live_...",
  surfaceKey: adsSurfaceKey(),
  bundleId: appBundleId(),
};
const feed = await getPublicAdsFeed(ctx, "home_banner");
await recordPublicAdEvents(ctx, sessionId, [{
  adId: feed.ads[0].id,
  eventType: "impression",
  placementKey: feed.placement,
  lineupId: lineupIdFromSource(feed.source),
}]);
```

### Integration Ads（deprecated — 需登录）

Feed returns `type` (`text` / `image`), type-specific `layout` (`text_*` / `image_*`), and `rotation` (none / fade / slide / stack). Each layout has a **dedicated renderer** (hero overlay, card shadow, footer pill, callout badge, etc.); customize via `AdsProvider theme` or per-`Ad` props.

```tsx
import {
  AdsProvider,
  AdBanner,
  defaultAdsTheme,
  createLeisureSaasClient,
  useAuth,
} from "@leisuresaas/expo";

const theme = {
  layouts: {
    image: { image_hero: { root: { borderRadius: 16 }, title: { color: "#111" } } },
    text: { text_callout: { root: { borderLeftColor: "#2563eb" } } },
  },
  rotation: { dotActive: { backgroundColor: "#2563eb" } },
};

<AdsProvider client={client} resolveAccessToken={resolveAccessToken} theme={theme}>
  <AdBanner contentStyle={{ marginVertical: 8 }} />
</AdsProvider>
```

Custom render (full control, SDK still tracks impression / click):

```tsx
<Ad placement="home_banner" renderAd={({ ad, onPress, theme }) => (...)} />
```

**Preview without network** (labs / Storybook):

```tsx
<AdPreview feed={mockFeed} trackImpressions={false} showIndicators />
```

`GET /ads/feed`（Integration，**deprecated**）returns **`click_url`**. Prefer Public Ads below. Legacy clients open `click_url` for navigation; impressions use `POST /ads/events`.

> **Deprecated (sunset 2026-12-31)** — use `AdsProvider publishableKey` + `getPublicAdsFeed` / `recordPublicAdEvents` instead.

```tsx
import {
  AdsProvider,
  AdBanner,
  createLeisureSaasClient,
  useAuth,
} from "@leisuresaas/expo";

const client = createLeisureSaasClient({ bffBaseUrl: "https://api.myproduct.com" });

function Home() {
  const { resolveAccessToken } = useAuth();

  return (
    <AdsProvider client={client} resolveAccessToken={resolveAccessToken}>
      <AdBanner />
    </AdsProvider>
  );
}
```

Lower-level API (legacy Integration):

```ts
const feed = await client.getAdsFeed(token, "home_banner");
await client.recordAdEvents(token, [{
  adId: feed.ads[0].id,
  eventType: "impression",
  placementKey: feed.placement,
  lineupId: lineupIdFromSource(feed.source),
}]);
// navigation: open feed.ads[0].click_url (no Bearer)
```

Plan permissions: **not required** for feed/events (Integration Auth only). Product backend manage APIs need Integration Key scope `ads:manage` (machine tokens OK).

## Upgrade `@leisuresaas/expo@0.5.0` (breaking — lineup_id)

Requires gateway **without** HTTP `group_id` alias (deploy gateway ≥ 2026-07 lineup_id-only).

| 变更 | 迁移 |
|------|------|
| `AdFeedSource.group_id` | 使用 `lineup_id`；`lineupIdFromSource(feed.source)` |
| `AdEventInput.groupId` | 改为 `lineupId` |
| Impression payload | 只发 `lineup_id`（SDK 内置；自定义 UI 勿再发 `group_id`） |

```bash
npm install @leisuresaas/expo@0.5.0
```

Go 后端配套：`go get github.com/leisuresaas/go@v0.1.45`（`platform.LineupIDFromSource`、`AdEventInput.LineupID`）。

## Upgrade `@leisuresaas/expo@0.5.4` (feat — headless App version Settings)

设置页改为 **headless-first**：产品自绘 UI，不再依赖默认卡片样式。

| 新增 | 用法 |
|------|------|
| `useAppVersionSettings` | 设置页主路径：`displayVersion` / `checkNow` / `openStore` / `message` / `canOpenStore` |
| `AppVersionSettingsCard` children render prop | `(state) => ReactNode`；无 children 时仍为参考布局 |

```bash
npm install @leisuresaas/expo@0.5.4
```

## Upgrade `@leisuresaas/expo@0.5.2` (feat — App version updates)

Public App Config：冷启动 / 设置页版本检查（服务端 semver）。

| 新增 | 用法 |
|------|------|
| `AppUpdateProvider` / `useAppUpdate` / `AppVersionSettingsCard` | 见上文 [App version updates](#app-version-updates-public-app-config)；Settings 推荐 `useAppVersionSettings`（0.5.4+） |
| `EXPO_PUBLIC_PUBLISHABLE_KEY` | Admin Access → Publishable keys（`pk_live_`） |

```bash
npm install @leisuresaas/expo@0.5.2
```

## Upgrade `@leisuresaas/expo@0.5.1` (fix — surface_key header)

Gateway Public / Integration ads 已改用 **`X-Ads-Surface-Key`**（`0.5.0` 仍发 `X-Ads-Platform` 会导致 feed 失败）。

| 变更 | 迁移 |
|------|------|
| Public Ads 请求头 | `X-Ads-Platform` → **`X-Ads-Surface-Key`** |
| `PublicAdsRequestContext.platform` | 改为 **`surfaceKey`**（`platform` 仍可读作 fallback） |
| Integration `getAdsFeed` / `recordAdEvents` | SDK 自动附带 `X-Ads-Surface-Key: ios\|android` |

```bash
npm install @leisuresaas/expo@0.5.1
```

```ts
import { adsSurfaceKey } from "@leisuresaas/expo";

// PublicAdsRequestContext
{ surfaceKey: adsSurfaceKey(), publishableKey: "pk_live_...", gatewayUrl: "..." }
```

## Reference

- [PUBLIC_PUBLISHING.md](./PUBLIC_PUBLISHING.md) — 公开发布到 npmjs.com
- [plan/product-app-config-integration.md](../../plan/product-app-config-integration.md) — App 版本更新
- [plan/product-ads-integration.md](../../plan/product-ads-integration.md) — 运营广告
- [PUBLISHING.md](./PUBLISHING.md) — 私有发布（Git tag / GitHub Packages）
- [demo/mobile](../../demo/mobile) — sample Expo app
- [plan/openapi/integration-quota.yaml](../../plan/openapi/integration-quota.yaml)
- [sdk/go](../go) — Go backend SDK
