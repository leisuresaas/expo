# @leisuresaas/expo — AI Agent Reference

> **受众**：为 LeisureSaas 接入 **独立产品 App（Expo / RN）** 的 AI coding agent。  
> **npm**：`@leisuresaas/expo@0.6.0+`（**frontend-only**；无 Integration Key）  
> **SSOT 变更**：[plan/changelog/2026-09-expo-frontend-only-v1.md](../../plan/changelog/2026-09-expo-frontend-only-v1.md)  
> **可拷贝全栈手册**：[plan/ai-product-dev-kit.md](../../plan/ai-product-dev-kit.md)  
> **后端配对**：产品 BFF 用 [sdk/go/AGENTS.md](../go/AGENTS.md)（**仅后端**持 `ik_`）

---

## 0. 硬边界

| 允许 | 禁止 |
|------|------|
| OAuth / Hosted UI / Magic | `ik_` / `X-Integration-Key` / `EXPO_PUBLIC_*` 塞 Integration Key |
| `/v1/public/*`、`/v1/user/*`（`pk_live_` ± Bearer） | 硬编码产品 BFF 路径；`LeisureSaasClient`（已删除） |
| `buildEnablePushRegistration`（本地） | SDK 内发 Push 注册 HTTP |
| AdsProvider / AppUpdate / Drive | gateway「直连 Integration」模式 |

产品业务（计费、entitlement、device-tokens 登记…）→ **产品自写** `apiFetch` → 产品 BFF → Go SDK。

平台接入方前缀：**`/v1`**（无 `/api`、无 `/integration`）。

---

## 1. 任务速查

| 你想做什么 | 用什么 |
|-----------|--------|
| OAuth 登录 | `AuthProvider` + `useAuth().login` |
| Magic 登录 | `magicTokenFromURL` + `exchangeMagicToken` |
| Public 广告 | `AdsProvider`（`publishableKey` + `gatewayUrl`）+ `AdBanner` 等 |
| 版本检查 | `AppUpdateProvider` |
| Drive | `listFsNodes` / `uploadFsFile` … + `pk` capability `drive` |
| Push 注册 | `buildEnablePushRegistration()` → **产品** `POST {bff}/v1/notifications/device-tokens` |
| 计费 / 套餐 / entitlement | **产品** `apiFetch`，勿用 expo 调 Integration |

---

## 2. 环境变量

| 变量 | 用途 |
|------|------|
| `EXPO_PUBLIC_OAUTH_ISSUER` | 仅 OAuth / Hosted UI |
| `EXPO_PUBLIC_GATEWAY_URL` | Public Ads / App Config / Drive |
| `EXPO_PUBLIC_PUBLISHABLE_KEY` | `pk_live_` |

**禁止** `EXPO_PUBLIC_INTEGRATION_KEY`。

---

## 3. 最小脚手架

```tsx
import {
  AuthProvider,
  AdsProvider,
  AppUpdateProvider,
  buildEnablePushRegistration,
} from "@leisuresaas/expo";

// Push：本地取 token，产品 BFF 登记
const reg = await buildEnablePushRegistration();
await apiFetch(token, "/v1/notifications/device-tokens", {
  method: "POST",
  body: JSON.stringify({
    platform: reg.platform,
    token: reg.token,
    android_package: reg.androidPackage,
    bundle_id: reg.bundleId,
    environment: reg.environment,
  }),
});

<AdsProvider
  publishableKey={process.env.EXPO_PUBLIC_PUBLISHABLE_KEY!}
  gatewayUrl={process.env.EXPO_PUBLIC_GATEWAY_URL!}
  onInAppNavigate={(path) => {
    // path is "/billing" or "/promo?code=1" when creative link_url is app:/...
  }}
/>
```

---

## 4. Breaking（0.5 → 0.6）

- 删除 `createLeisureSaasClient` / `LeisureSaasClient` / bff+gateway 模式  
- `AdsProvider` 不再接收 `client`；只要 `publishableKey` + `gatewayUrl`  
- `enablePush` / `disablePush` HTTP 移除；改用 `buildEnablePushRegistration` + 产品 API  
- Public/Drive 路径：`/v1/public|user/…`（不再 `/api/v1/…`）
