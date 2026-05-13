# e2e-test-architecture 实施进度

## 当前状态

- 当前阶段：阶段 5 完成，特性已收口
- 状态：全部阶段完成，验证通过
- 最后确认的实现提交：`37e115d e2e-test-architecture phase 3+4: chat mock and remote/prod entry points`
- 下一步入口：无（特性完成）

## 文档结构

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`（本文件）

## 阶段清单

- [x] 阶段 1：MVP 命令和标签基础
- [x] 阶段 2：目录迁移
- [x] 阶段 3：Chat mock
- [x] 阶段 4：Remote/Prod 入口
- [x] 阶段 5：验证与收口

## 已完成工作

- 梳理当前 `package.json` E2E scripts。
- 梳理当前 `playwright.config.ts`。
- 梳理当前 `e2e/` 文件结构。
- 形成默认排除 `@real-api|@embed|@slow|@prod-smoke`、real-api 显式 opt-in、remote/prod 分离的规划。
- 根据用户确认收窄范围：`real-api` 只指 LLM provider / embedding provider；默认使用本地真实 DB/Auth/Storage；第一版只 mock `/api/chat`。
- 更新 `package.json` E2E scripts：默认、UI、smoke、full 都排除 `@real-api|@embed|@slow|@prod-smoke`，`e2e:real-api` 和 `e2e:embed` 显式 opt-in。
- 给现有 smoke、real provider、embedding/slow 测试补充 Playwright grep 标签。
- 为 `globalSetup` 增加 `E2E_AUTH_ACCOUNTS`，默认仍生成三个账号的 storage state，后续命令可按需收窄账号集合。
- 将 Playwright webServer readiness URL 调整为 `/about`，避免根路径重定向影响服务就绪判断。
- 将 E2E spec 迁移到 `e2e/specs/{smoke,auth,chat,knowledge,admin,isolation}`。
- 拆分 `basic.test.ts` 为 `smoke/public-pages.test.ts` 和 `smoke/signin.test.ts`。
- 拆分 `admin-operations.test.ts` 为 `admin/users.test.ts` 和 `admin/documents.test.ts`。
- 更新 `playwright.config.ts` 的 `testDir` 为 `./e2e/specs`。
- 新增 `e2e/mocks/chat.ts`：SSE mock，返回 citations、token、done 三个事件，answer 包含 `[1]` 引用。
- 新增 `e2e/specs/chat/chat-ui.mock.test.ts`：2 个 mock 测试（基础响应 `@smoke` + citation 渲染）。
- 真实 chat provider 测试保留在 `chat-real-api.test.ts`，已标记 `@real-api @slow`。
- `playwright.config.ts` 支持 `E2E_BASE_URL`：remote 时跳过 webServer，baseURL 从环境变量读取。
- `e2e/global-setup.ts` 增加 `validateProdEnv`：E2E_ENV=prod 时强制要求 E2E_BASE_URL、禁止 localhost、可选 E2E_PROD_URL_ALLOWLIST。
- `package.json` 新增 `e2e:remote`（grep @smoke）和 `e2e:prod:smoke`（E2E_ENV=prod grep @prod-smoke）。

## 已确认决策

- 命令保留 `real-api` 命名。
- `real-api` 只包括真实 LLM provider 和 embedding provider。
- 去掉 `@real-backend` 概念；默认使用真实本地 DB/Auth/Storage，除非某个场景特意 mock。
- 默认 `pnpm e2e` 排除 `@real-api|@embed|@slow|@prod-smoke`。
- 阶段 2 采用精简目标目录：`fixtures/`、`mocks/`、`specs/{smoke,auth,chat,knowledge,admin,isolation}`。
- 第一版不 mock upload/index；现有真实 upload/retrieval 测试标记为 `@embed @slow` 并默认排除。
- 第一版只 mock `/api/chat` SSE。
- `globalSetup` 三账号登录成本纳入阶段 1 处理。
- remote/prod 必须有更硬保护，prod smoke 只读且需要 allowlist。

## 验证状态

- `pnpm lint`：通过。
- `pnpm exec tsc --noEmit`：通过。
- `git diff --check`：通过。
- `pnpm e2e --list`：列出 16 个默认测试，未包含 `@real-api`、`@embed`、`@slow`、`@prod-smoke`。
- `pnpm e2e:smoke --list`：列出 8 个 smoke 测试。
- `pnpm e2e:real-api --list`：列出 5 个真实 provider / embedding opt-in 测试。
- `pnpm e2e`：通过，16 passed。
- 阶段 2 迁移后复验：`pnpm e2e --list` 仍列出 16 个默认测试；`pnpm e2e:smoke --list` 仍列出 8 个 smoke 测试；`pnpm e2e:real-api --list` 仍列出 5 个 opt-in 测试；`pnpm e2e` 通过，16 passed。
- 阶段 3 新增后：`pnpm e2e --list` 列出 18 个默认测试；`pnpm e2e:smoke --list` 列出 9 个 smoke 测试；tsc、lint 通过。
- 阶段 4 实施后：默认列表仍为 18 个测试；`pnpm e2e:prod:smoke --list` 列出 0 个（无 @prod-smoke 测试属预期）；prod 保护逻辑（无 E2E_BASE_URL、localhost、allowlist 不匹配）均正确抛错；tsc、lint 通过。
- 备注：当前执行环境的 Node 本地网络访问在默认沙箱下会被拦截，Playwright webServer 探测需要在允许 localhost 访问的环境中运行；用户手工启动 `pnpm dev` 后已完成验证。
- 阶段 5 验证：`pnpm e2e` 18 passed；`pnpm e2e:smoke` 9 passed；`pnpm e2e:real-api` 5 passed。特性全部通过。

## 下一步

无。特性已完成，目录已重命名为 `-e2e-test-architecture/`。
