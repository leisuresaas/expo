# 私有发布 @leisuresaas/expo

与 Go SDK（`github.com/leisuresaas/go` + `v0.1.x` tag）对齐：单独 Git 仓 + 版本 tag，接入方凭组织权限拉取，**不上 public npm**。

若要 **公开发布到 npmjs.com**，见 [PUBLIC_PUBLISHING.md](./PUBLIC_PUBLISHING.md)。

推荐三种方式（按运维成本排序）。

---

## 方式 A — Git 依赖 + tag（最快落地）

无需 npm 私服，与当前 `demo/mobile` 的 `file:../../sdk/expo` 类似，但指向远程私有仓。

### 1. 发布方

```bash
# 在 GitHub 创建私有仓，例如 github.com/leisuresaas/expo
cd sdk/expo
git init && git remote add origin git@github.com:leisuresaas/expo.git

# 提交后打 semver tag
git add . && git commit -m "feat: initial expo sdk"
git push -u origin main
git tag v0.1.0 && git push origin v0.1.0
```

后续发版：改 `package.json` 的 `version` → commit → `git tag v0.1.1` → push tag。

### 2. 接入方 `package.json`

**SSH（本机已配 GitHub SSH key）：**

```json
{
  "dependencies": {
    "@leisuresaas/expo": "git+ssh://git@github.com/leisuresaas/expo.git#v0.1.0"
  }
}
```

**HTTPS + PAT（CI 常用）：**

```json
"@leisuresaas/expo": "git+https://github.com/leisuresaas/expo.git#v0.1.0"
```

CI 中设置 `GIT_ASKPASS` 或 `.netrc` / `GITHUB_TOKEN` 读私有仓（见下方 CI 小节）。

### 3. Expo Metro

SDK 源码为 TypeScript，接入方 `metro.config.js` 需转译：

```js
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
config.resolver.unstable_enablePackageExports = true;
config.transpilePackages = ["@leisuresaas/expo"];
module.exports = config;
```

---

## 方式 B — GitHub Packages npm（推荐长期）

私有 npm registry，语义与 `go get github.com/leisuresaas/go@v0.1.10` 接近：`npm install @leisuresaas/expo@0.1.0`。

### 1. 准备 `package.json`

发布前去掉 `"private": true`，并增加：

```json
{
  "name": "@leisuresaas/expo",
  "version": "0.1.0",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/leisuresaas/expo.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

包名 **`@leisuresaas/*`** 必须与 GitHub 组织/用户名一致。

可选：发布编译产物（接入方无需 Metro 转译 TS）：

```json
"main": "dist/index.js",
"types": "dist/index.d.ts",
"files": ["dist"],
"scripts": {
  "build": "tsc -p tsconfig.build.json",
  "prepublishOnly": "npm run build"
}
```

### 2. 发布方 `.npmrc`（勿提交含 token 的文件）

`~/.npmrc` 或 CI secret：

```ini
@leisuresaas:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=ghp_xxxxxxxx
```

Token 权限：`read:packages` + `write:packages`（classic PAT）或 fine-grained 对该仓的 Packages 读写。

```bash
npm publish
```

### 3. 接入方

项目根目录 `.npmrc`（可提交 registry 行，**token 仅放本地/CI**）：

```ini
@leisuresaas:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

```bash
export NPM_TOKEN=ghp_xxx   # 或 GITHUB_TOKEN（需 read:packages）
npm install @leisuresaas/expo@0.1.0
```

`package.json`：

```json
"@leisuresaas/expo": "0.1.0"
```

### 4. GitHub Actions 自动发布（tag 触发）

`.github/workflows/publish.yml`：

```yaml
name: publish-npm
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-registry-url: https://npm.pkg.github.com
          scope: "@leisuresaas"
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`GITHUB_TOKEN` 默认可写本仓 Packages；跨仓发布需 `NPM_TOKEN` PAT。

---

## 方式 C — 自建 Verdaccio / Artifactory

适合已有私有 npm 镜像的团队：

```bash
npm publish --registry https://npm.internal.example.com
```

接入方 `.npmrc` 指向同一 registry + auth。与 GitHub 解耦，需自行做备份与高可用。

---

## CI 拉取私有 Git 依赖

Jenkins / GitHub Actions 安装前：

```bash
# SSH
mkdir -p ~/.ssh && ssh-keyscan github.com >> ~/.ssh/known_hosts
# 部署只读 deploy key 到 secrets

# 或 HTTPS
git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"
npm ci
```

EAS Build：在 [expo.dev](https://expo.dev) 项目 Secrets 里配置 `NPM_TOKEN` 或 `GITHUB_TOKEN`，并在 `eas.json` 构建 profile 里注入环境变量。

---

## 版本与兼容

| 约定 | 说明 |
|------|------|
| Tag | `v0.1.0` ↔ `package.json` `0.1.0` |
| 破坏性变更 | major bump；文档写清最低 gateway / billing API 版本 |
| peerDependencies | 接入方自行满足 `expo` / `expo-auth-session` 等版本 |

---

## 与 monorepo 的关系

meta-repo 中 `/sdk/` 被 ignore，**发布源以独立仓 `github.com/leisuresaas/expo` 为准**。本地开发可继续：

```json
"@leisuresaas/expo": "file:../../sdk/expo"
```

发版时从 `sdk/expo` 目录 push 到独立仓（或 subtree split），再打 tag / `npm publish`。

---

## 快速对照

| 方式 | 接入方安装 | 优点 | 缺点 |
|------|------------|------|------|
| **A Git tag** | `git+ssh://...#v0.1.0` | 零基础设施 | Metro 需 transpile；CI 要配 Git 权限 |
| **B GitHub Packages** | `npm i @leisuresaas/expo@0.1.0` | 标准 npm 流；可 CI 自动发 | 需 PAT / `.npmrc` |
| **C 私服** | 内网 registry | 企业统一 | 运维成本高 |

**建议**：先 **A** 验证接入链路，稳定后迁 **B** 与 `sdk/go` 发版节奏统一。
