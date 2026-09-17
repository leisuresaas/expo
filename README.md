# @leisuresaas/expo

Expo / React Native SDK for LeisureSaas **frontend-only** surfaces:

- OAuth / Hosted UI / Magic login  
- Public Ads & App Config (`pk_live_` → `/v1/public/*`)  
- Drive User Plane (`pk_live_` + Bearer → `/v1/user/storage/*`)  
- Local push helpers (`buildEnablePushRegistration` — **no HTTP**)

**Does not** ship Integration Key (`ik_`) clients or product BFF path constants.  
Business APIs (billing, entitlement, device-token register) → **your BFF** + [`sdk/go`](../go).

**AI**：见 **[AGENTS.md](AGENTS.md)** · 变更 SSOT：[plan/changelog/2026-09-expo-frontend-only-v1.md](../../plan/changelog/2026-09-expo-frontend-only-v1.md)

## Install

```bash
npm install @leisuresaas/expo
```

`metro.config.js`：`transpilePackages: ["@leisuresaas/expo"]`。  
Peers：`expo`, `expo-auth-session`, `expo-secure-store`, `expo-web-browser`, `react`, `react-native`；Push 可选 `expo-notifications`。

## Quick start

```tsx
import {
  AuthProvider,
  AdsProvider,
  AppUpdateProvider,
  buildEnablePushRegistration,
  useAuth,
} from "@leisuresaas/expo";

<AuthProvider config={{ issuer, clientId, redirectScheme: "myapp", terminal: "mobile" }}>
  <AdsProvider
    publishableKey={process.env.EXPO_PUBLIC_PUBLISHABLE_KEY!}
    gatewayUrl={process.env.EXPO_PUBLIC_GATEWAY_URL!}
  >
    <AppUpdateProvider
      publishableKey={process.env.EXPO_PUBLIC_PUBLISHABLE_KEY!}
      gatewayUrl={process.env.EXPO_PUBLIC_GATEWAY_URL!}
    >
      <App />
    </AppUpdateProvider>
  </AdsProvider>
</AuthProvider>
```

### Push（产品 BFF 登记）

```ts
const reg = await buildEnablePushRegistration();
await apiFetch(accessToken, "/v1/notifications/device-tokens", {
  method: "POST",
  body: JSON.stringify({
    platform: reg.platform,
    token: reg.token,
    android_package: reg.androidPackage,
    bundle_id: reg.bundleId,
    environment: reg.environment,
  }),
});
// 注销：DELETE /v1/notifications/device-tokens/{token}（产品路径）
```

需要 Dev Client / Store build + 原生 FCM/APNs（不要 Expo Go / `ExponentPushToken`）。

## Env

| Variable | Use |
|----------|-----|
| `EXPO_PUBLIC_OAUTH_ISSUER` | OAuth / Hosted UI only |
| `EXPO_PUBLIC_GATEWAY_URL` | Public Ads / App Config / Drive |
| `EXPO_PUBLIC_PUBLISHABLE_KEY` | `pk_live_` |

**Never** put Integration Keys in `EXPO_PUBLIC_*`.

## Breaking 0.5 → 0.6

- Removed `LeisureSaasClient` / `createLeisureSaasClient` (bff + gateway/`ik_` modes)  
- `AdsProvider` no longer takes `client`  
- No SDK HTTP for push register — use `buildEnablePushRegistration` + product API  
- Platform paths: `/v1/public/*`, `/v1/user/*` (not `/api/v1/…`)

## License

MIT
