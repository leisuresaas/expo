# @leisuresaas/expo — AI Agent Reference

> **受众**：为 LeisureSaas 接入 **独立产品 App（Expo / RN）** 的 AI coding agent。  
> **npm**：`@leisuresaas/expo@0.5.26+`（含 `exchangeMagicToken`）  
> **可拷贝全栈手册**：[plan/ai-product-dev-kit.md](../../plan/ai-product-dev-kit.md)  
> **全能力入口**：[plan/ai-integration-guide.md](../../plan/ai-integration-guide.md)  
> **人类 README**：[README.md](README.md)  
> **参考实现**：monorepo `demo/mobile/`  
> **后端配对**：产品 BFF 用 [sdk/go/AGENTS.md](../go/AGENTS.md)

---

## 0. 任务速查

| 你想做什么 | 用什么 | 配置 / 注意 |
|-----------|--------|-------------|
| OAuth 登录 | `AuthProvider` + `useAuth().login` | `issuer` / `clientId` / `redirectScheme`；`terminal: "mobile"` |
| Magic 登录换票（家庭开通） | `magicTokenFromURL` + `exchangeMagicToken` | grant `urn:leisuresaas:oauth:magic-token`；client 须允许该 grant；见 [household-provision.md](../../plan/household-provision.md) |
| 处理取消登录 | `AuthLoginError` `code === "cancelled"` | try/catch `login()` |
| 调产品 BFF | `createLeisureSaasClient({ bffBaseUrl })` | **生产推荐**；Key 在 BFF |
| 本地直连 Gateway | `createLeisureSaasClient({ gatewayUrl, integrationApiKey })` | **仅开发**；禁止进生产包 |
| 列套餐 | `client.listPlans(token, mobilePlatform())` | platform: ios/android |
| Apple 确认 | `client.confirmApplePurchase` | 经 BFF |
| Google 确认 | `client.confirmGooglePurchase` | 经 BFF |
| 恢复购买 | `client.restoreApplePurchases` | 经 BFF |
| Public 广告 | `AdsProvider` + `AdBanner` 等 | `EXPO_PUBLIC_PUBLISHABLE_KEY` + `EXPO_PUBLIC_GATEWAY_URL` |
| 上报曝光 | SDK / provider 内建 | 勿 POST click；点 `click_url` |
| 版本检查 | `AppUpdateProvider` | 同 publishable；**勿**用 issuer 当 gateway |
| Settings 自绘 | `useAppVersionSettings` | `checkNow` / `openStore` / `message` |
| 解析 API base | `resolvePlatformApiBase` | prop → `EXPO_PUBLIC_GATEWAY_URL` → discovery |
| Push 注册 | `client.enablePush(accessToken)` | 原生 token；需 Dev Client + Vault |
| Push 注销 | `client.disablePush(accessToken)` | 登出时调用 |
| Drive 文件柜（User Plane） | `listFsNodes` / `uploadFsFile` / `createFsContentURL` 等 | PK 含 `drive` + `useAuth().accessToken`；PUT 进度用 `onProgress`（客户端观测，body 不经 storage） |

**关键词**：`AuthProvider`, `useAuth`, `AuthLoginError`, `exchangeMagicToken`, `magicTokenFromURL`, `refreshOAuthTokens`, `createLeisureSaasClient`, `AdsProvider`, `AppUpdateProvider`, `useAppVersionSettings`, `resolvePlatformApiBase`, `resolveGatewayUrlFromEnv`, `enablePush`, `listFsNodes`, `uploadFsFile`, `onProgress`, `EXPO_PUBLIC_OAUTH_ISSUER`, `EXPO_PUBLIC_GATEWAY_URL`, `EXPO_PUBLIC_PUBLISHABLE_KEY`

---

## 1. 环境变量（硬边界）

| 变量 | 用途 | 禁止 |
|------|------|------|
| `EXPO_PUBLIC_OAUTH_ISSUER` | 仅 OAuth / Hosted UI | 当 Public API base |
| `EXPO_PUBLIC_GATEWAY_URL` | Public Ads / App Config / Drive User Plane（及 gateway 模式） | 用登录品牌域顶替 |
| `EXPO_PUBLIC_PUBLISHABLE_KEY` | `pk_live_`（ads / app_config / drive） | 再发明 `*_pk_` / 第二套 Drive env；**禁止**新建独立前端库 |
| （无）Integration Key | — | **生产 App 不得** `EXPO_PUBLIC_*` 携带 `ik_` |

`AdsProvider` / `AppUpdateProvider` 未传 URL prop 时读 `EXPO_PUBLIC_GATEWAY_URL`（`resolveGatewayUrlFromEnv`），**永不**回退 issuer。

品牌登录域说明：[plan/branded-oauth-issuer.md](../../plan/branded-oauth-issuer.md) · [plan/branded-issuer-partner-feedback.md](../../plan/branded-issuer-partner-feedback.md)

---

## 2. 最小脚手架（BFF）

```tsx
import {
  AuthProvider,
  AdsProvider,
  AppUpdateProvider,
  createLeisureSaasClient,
  useAuth,
  AuthLoginError,
} from "@leisuresaas/expo";

const client = createLeisureSaasClient({
  bffBaseUrl: "https://api.myproduct.com",
});

export function Root() {
  return (
    <AuthProvider
      config={{
        issuer: process.env.EXPO_PUBLIC_OAUTH_ISSUER!,
        clientId: "my-app-mobile",
        redirectScheme: "myapp",
        terminal: "mobile",
      }}
    >
      <AppUpdateProvider
        publishableKey={process.env.EXPO_PUBLIC_PUBLISHABLE_KEY!}
        checkOnMount
      >
        <AdsProvider
          client={client}
          publishableKey={process.env.EXPO_PUBLIC_PUBLISHABLE_KEY!}
        >
          <App />
        </AdsProvider>
      </AppUpdateProvider>
    </AuthProvider>
  );
}
```

`metro.config.js`：`transpilePackages: ["@leisuresaas/expo"]`。

---

## 3. 反模式

| ❌ | ✅ |
|----|----|
| App 打包 Integration Key | BFF 持有 |
| `gatewayUrl={issuer}` | `EXPO_PUBLIC_GATEWAY_URL` |
| 客户端自算 semver | `AppUpdateProvider` / `useAppVersionSettings` |
| Expo Go + Expo Push Token | Dev Client + `enablePush` 原生 token |
| 自拼广告 click / POST click | feed `click_url` + impression only |

---

## 4. 深文档

| 主题 | 文档 |
|------|------|
| 产品开发套件 | [plan/ai-product-dev-kit.md](../../plan/ai-product-dev-kit.md) |
| 广告 | [plan/product-ads-integration.md](../../plan/product-ads-integration.md) |
| App Config | [plan/product-app-config-integration.md](../../plan/product-app-config-integration.md) |
| 通知 | [plan/services/notification-platform.md](../../plan/services/notification-platform.md) |
| Publishable Key | [plan/unified-publishable-keys.md](../../plan/unified-publishable-keys.md) |
| Drive User Plane | [plan/storage-user-plane.md](../../plan/storage-user-plane.md) · OpenAPI [user-storage-fs.yaml](../../plan/openapi/user-storage-fs.yaml) |
| Drive FsNode | [plan/storage-drive.md](../../plan/storage-drive.md) |
| 完整 README | [README.md](README.md) |
