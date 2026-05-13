# e2e-test-architecture 设计

## 1. 对应需求

本设计对应 [REQUIREMENTS.md](./REQUIREMENTS.md)。

## 2. 当前状态

阶段 0 前的 E2E 结构：

```text
e2e/
  basic.test.ts
  chat-flow.test.ts
  knowledge.test.ts
  site-separation.test.ts
  helpers.ts
  global-setup.ts
  fixtures/
    auth.ts
    documents.ts
    sample.txt
  multi-user/
    admin-navigation.test.ts
    admin-operations.test.ts
    auth-fixtures.test.ts
    document-isolation.test.ts
    public-doc-selection.test.ts
    session-isolation.test.ts
```

当前问题：

- `playwright.config.ts` 只有一个 `chromium` project。
- `globalSetup` 总是生成三个账号 storageState，即使 smoke 测试不需要三账号。
- 默认 `pnpm e2e` 会运行所有测试，包括真实 upload/index/retrieval。
- 没有测试标签约定。
- `multi-user/` 是按历史 feature 组织，不是长期产品流程结构。

## 3. 分层策略

### 3.1 默认层：Fast Local E2E

默认层目标：

- 使用本地真实 DB/Auth/Storage。
- 不触发真实 LLM provider。
- 不触发真实 embedding provider。
- 不运行明显慢的真实 embedding/retrieval 场景。
- 覆盖 UI、路由、权限、基础数据隔离。

默认命令：

```bash
pnpm e2e
```

语义：

```bash
playwright test --grep-invert "@real-api|@embed|@slow|@prod-smoke"
```

### 3.2 Smoke 层

用于 PR 前和本地快速确认：

```bash
pnpm e2e:smoke
```

语义：

```bash
playwright test --grep @smoke --grep-invert "@real-api|@embed|@slow|@prod-smoke"
```

覆盖建议：

- public about/sign-in 页面。
- 登录默认账号可见。
- user/admin 基础路由跳转。
- Knowledge 页面基础渲染。

### 3.3 Real API / Embed 层

`real-api` 在本项目中专指真实 LLM provider 或真实 embedding provider。

真实 upload/index/retrieval 测试建议标记：

```ts
test("public document selection affects retrieval @real-api @embed @slow", ...)
```

命令：

```bash
pnpm e2e:real-api
pnpm e2e:embed
```

说明：

- 可以真实调用 embedding provider。
- 可以依赖 Storage、DB、pgvector。
- 不应默认运行。

### 3.4 Remote / Prod 层

`remote` 表示测试 `E2E_BASE_URL` 指向的部署环境，不自动等于生产。

推荐命令：

```bash
pnpm e2e:remote
pnpm e2e:prod:smoke
```

约束：

- remote 模式不启动本地 webServer。
- prod 只能跑 `@prod-smoke`。
- prod smoke 必须只读，不允许写入、删除或修改真实业务数据。
- `E2E_BASE_URL` 在 prod 模式必须匹配 allowlist。

## 4. 目录重组方案

目标结构保持精简：

```text
e2e/
  fixtures/
    auth.ts
    documents.ts
  mocks/
    chat.ts
  specs/
    smoke/
      public-pages.test.ts
      signin.test.ts
    auth/
      route-access.test.ts
      admin-navigation.test.ts
      auth-fixtures.test.ts
    chat/
      chat-ui.mock.test.ts
      chat-real-api.test.ts
    knowledge/
      upload-real-embed.test.ts
      public-doc-selection.test.ts
    admin/
      users.test.ts
      documents.test.ts
    isolation/
      session-isolation.test.ts
      document-isolation.test.ts
```

暂不新增 `support/`、`mocks/retrieval.ts`、`mocks/upload.ts`。只有实际需要时再增加。

迁移映射：

| 当前文件 | 目标文件 |
| --- | --- |
| `basic.test.ts` | `specs/smoke/public-pages.test.ts` + `specs/smoke/signin.test.ts` |
| `site-separation.test.ts` | `specs/auth/route-access.test.ts` |
| `multi-user/admin-navigation.test.ts` | `specs/auth/admin-navigation.test.ts` |
| `multi-user/auth-fixtures.test.ts` | `specs/auth/auth-fixtures.test.ts` |
| `multi-user/session-isolation.test.ts` | `specs/isolation/session-isolation.test.ts` |
| `multi-user/document-isolation.test.ts` | `specs/isolation/document-isolation.test.ts` |
| `multi-user/admin-operations.test.ts` | `specs/admin/users.test.ts` + `specs/admin/documents.test.ts` |
| `knowledge.test.ts` | `specs/knowledge/upload-real-embed.test.ts` |
| `multi-user/public-doc-selection.test.ts` | `specs/knowledge/public-doc-selection.test.ts` |
| `chat-flow.test.ts` | `specs/chat/chat-real-api.test.ts`，后续 mock 化后补 `chat-ui.mock.test.ts` |

## 5. Mock 方案

### 5.1 第一版只 mock `/api/chat`

为默认 E2E 提供 `/api/chat` route mock：

- 返回 citations event。
- 返回 token event。
- 返回 done event。
- 不调用真实 LLM provider。

可放在：

```text
e2e/mocks/chat.ts
```

### 5.2 第一版不 mock upload/index

当前上传走 signed URL + Supabase Storage，mock 成本较高。第一版策略：

- `knowledge.test.ts` 迁移为 `upload-real-embed.test.ts`。
- 标记 `@real-api @embed @slow` 或至少 `@embed @slow`。
- 默认 `pnpm e2e` 排除该测试。

如未来需要进一步加速，再单独设计 upload/index mock。

### 5.3 Public retrieval 拆层

公开文档选择的权限边界可以拆成两层：

- 默认层：验证 selection API/UI 行为，不做真实 retrieval。
- real-api/embed 层：验证真实 retrieval citations 是否受 selection 控制。

## 6. globalSetup 调整

当前 `globalSetup` 总是登录 admin、user1、user2。阶段 1 需要处理：

- 短期：保留三账号登录，但在文档和进度中记录这是固定成本。
- 优先改进：根据命令或环境变量决定是否生成三账号 storageState。
- smoke/default 如果只需要单账号，应避免三账号重复登录。

可选环境变量：

```bash
E2E_AUTH_ACCOUNTS=admin,user1,user2
```

默认值可先保持 `admin,user1,user2`，后续根据测试标签收窄。

## 7. Playwright 配置调整

建议：

- 保持 `playwright.config.ts` 一个主配置。
- 通过 env 控制 `baseURL` 和 webServer。
- 当 `E2E_BASE_URL` 存在时，不启动本地 webServer。
- 默认 project 仍为 Chromium。

示意：

```ts
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isRemote = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e/specs",
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL },
  webServer: isRemote ? undefined : { command: "pnpm dev", url: baseURL, reuseExistingServer: true },
});
```

prod 保护建议放在 `globalSetup` 或独立 `e2e/support/env.ts` 中：

- `E2E_ENV=prod` 时必须有 `E2E_BASE_URL`。
- `E2E_BASE_URL` 必须匹配 allowlist。
- 非 `@prod-smoke` 测试不得在 prod 命令中运行。

## 8. package.json scripts

建议：

```json
{
  "e2e": "playwright test --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:ui": "playwright test --ui --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:smoke": "playwright test --grep @smoke --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:full": "playwright test --grep-invert \"@real-api|@embed|@slow|@prod-smoke\"",
  "e2e:real-api": "REAL_API=1 playwright test --grep \"@real-api|@embed\"",
  "e2e:embed": "REAL_API=1 playwright test --grep @embed",
  "e2e:remote": "playwright test --grep @smoke",
  "e2e:prod:smoke": "E2E_ENV=prod REAL_API=1 playwright test --grep @prod-smoke"
}
```

`e2e:remote` 需要调用者提供：

```bash
E2E_BASE_URL=https://example.com pnpm e2e:remote
```

## 9. 实施阶段

### 阶段 1：MVP 命令和标签基础

- 增加 package scripts。
- 给现有测试打标签。
- 将真实 chat、upload、retrieval 标记为 `@real-api` / `@embed` / `@slow`。
- 默认 `pnpm e2e` 排除 `@real-api|@embed|@slow|@prod-smoke`。
- 保持目录结构不动或只做必要的小移动。
- 记录或优化 `globalSetup` 三账号登录成本。

### 阶段 2：目录迁移

- 新建 `e2e/specs/*`。
- 移动现有测试文件到目标目录。
- 更新相对 import。
- 保持测试行为不变。
- 保证覆盖不降低。

### 阶段 3：Chat mock

- 新增 `e2e/mocks/chat.ts`。
- 将 chat UI 默认测试改为 mock `/api/chat` SSE。
- 保留真实 chat provider 测试为 `@real-api @slow`。
- 不在本阶段 mock upload/index。

### 阶段 4：Remote/Prod 入口

- 支持 `E2E_BASE_URL`。
- remote 模式不启动本地 webServer。
- prod smoke 加 allowlist 和只读保护。

### 阶段 5：验证与收口

- `pnpm e2e:smoke`
- `pnpm e2e`
- `pnpm e2e:real-api`
- `pnpm e2e:embed`
- 根据可用环境验证 `pnpm e2e:remote` / `pnpm e2e:prod:smoke`。

## 10. 风险

- 默认排除 `@embed` 后，真实上传/检索回归不会在默认 E2E 中暴露，需要定期运行 `e2e:embed`。
- Mock `/api/chat` 可以降低成本，但可能掩盖 provider 集成问题，因此保留真实 chat 测试。
- `globalSetup` 三账号登录会拖慢 smoke，阶段 1 至少要记录成本，最好支持按需账号。
- 重组目录时容易漏改相对 import，需要全量 Playwright 验证。
