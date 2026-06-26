# 公开发布 @leisuresaas/expo

将 SDK 发布到 **public npm**（`registry.npmjs.org`）和/或 **公开 GitHub 仓**。  
SDK 源码公开是安全的；**Integration API Key 仍只能放在接入方 BFF 服务端**（见 [README.md](./README.md)）。

---

## 前置条件

| 项 | 说明 |
|----|------|
| npm 账号 | [npmjs.com](https://www.npmjs.com/) 注册 |
| 组织 `@leisuresaas` | [npm 创建 org](https://www.npmjs.com/org/create)（scoped 包 `@leisuresaas/expo` 需 org 或用户名一致） |
| 公开 Git 仓（推荐） | 如 `https://github.com/leisuresaas/expo` |
| 2FA | npm 发布建议开启双因素认证 |

若 `@leisuresaas` 已被占用，可改用 `@你的org/expo` 并改 `package.json` 的 `name`。

---

## 一、发布到 public npm

### 1. 检查 `package.json`

公开发布需满足：

- **无** `"private": true`
- `"publishConfig": { "access": "public" }`（scoped 包默认私有，必须显式 public）
- `repository` / `license` / `files` 已配置（本仓已备好）

### 2. 登录 npm

```bash
npm login
npm whoami
```

### 3. 干跑（不实际上传）

```bash
cd sdk/expo
npm pack
# 生成 leisuresaas-expo-0.1.0.tgz，可 tar -tzf 查看包含文件
```

### 4. 发布

```bash
npm publish --access public
```

仅 `@leisuresaas` org 的 owner/member 可发布该 scope。

### 5. 发新版本

```bash
# 修 bug：patch
npm version patch   # 0.1.0 → 0.1.1
git add package.json && git commit -m "chore: release v0.1.1"
git tag v0.1.1 && git push origin main --tags
npm publish --access public
```

`major` / `minor` 同理。

### 6. 接入方安装

```bash
npm install @leisuresaas/expo
```

`package.json`：

```json
"@leisuresaas/expo": "^0.1.0"
```

**Expo Metro**（SDK 为 TypeScript 源码）：

```js
// metro.config.js
config.transpilePackages = ["@leisuresaas/expo"];
```

无需 `.npmrc`、无需 GitHub Token。

---

## 二、同步公开 GitHub 仓

与 npm 包同源，便于 issue / 文档 / CI：

```bash
cd sdk/expo
git remote add origin git@github.com:leisuresaas/expo.git
git push -u origin main
git tag v0.1.0 && git push origin v0.1.0
```

`package.json` 的 `repository.url` 应指向该仓。

---

## 三、GitHub Actions 自动发布（可选）

仓库根目录 `.github/workflows/publish-npm.yml`：

```yaml
name: publish-npm
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          registry-url: https://registry.npmjs.org
      - run: npm ci
      - run: npm run typecheck
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

在 npm 生成 **Automation** 或 **Publish** 类型 token，存入 GitHub `NPM_TOKEN`。  
发版流程：合并 main → `npm version patch` → push + push tag → Action 自动 `npm publish`。

---

## 四、公开发布检查清单

- [ ] `npm run typecheck` 通过
- [ ] README 含 BFF 模式说明与「禁止生产环境使用 gateway + Integration Key」
- [ ] `LICENSE` 存在（MIT）
- [ ] `files` 未包含 `.env`、密钥、内网 URL
- [ ] 版本号与 git tag 一致（`v0.1.0` ↔ `0.1.0`）
- [ ] npm 上包名可访问：`https://www.npmjs.com/package/@leisuresaas/expo`

---

## 五、公开 vs 私有对照

| | 公开 npm | 私有（见 [PUBLISHING.md](./PUBLISHING.md)） |
|--|----------|---------------------------------------------|
| 安装 | `npm i @leisuresaas/expo` | PAT + GitHub Packages 或 `git+ssh` |
| 谁可下载 | 任何人 | 授权成员 |
| SDK 安全 | 安全（无密钥） | 同样安全 |
| 平台 API | 仍须 OAuth + BFF/Key | 相同 |

---

## 六、撤销误发版本

```bash
# 72 小时内可 unpublish 单版本（npm 政策有限制）
npm unpublish @leisuresaas/expo@0.1.0

# 已广泛使用的版本应发 patch 修复，而非 unpublish
npm deprecate @leisuresaas/expo@0.1.0 "use >=0.1.1"
```
