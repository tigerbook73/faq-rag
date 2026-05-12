# e2e-test-architecture 实施进度

## 当前状态

- 当前阶段：阶段 1 完成，待阶段 2 目录迁移
- 状态：MVP 命令和标签基础已实施；默认 E2E 已排除真实 provider、embedding、slow、prod smoke 测试
- 最后确认的实现提交：无
- 下一步入口：阶段 2 — 目录迁移

## 文档结构

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`（本文件）

## 阶段清单

- [x] 阶段 1：MVP 命令和标签基础
- [ ] 阶段 2：目录迁移
- [ ] 阶段 3：Chat mock
- [ ] 阶段 4：Remote/Prod 入口
- [ ] 阶段 5：验证与收口

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
- 备注：当前执行环境的 Node 本地网络访问在默认沙箱下会被拦截，Playwright webServer 探测需要在允许 localhost 访问的环境中运行；用户手工启动 `pnpm dev` 后已完成验证。

## 下一步

启动阶段 2：

1. 将现有 E2E 文件迁移到精简目标目录：`fixtures/`、`mocks/`、`specs/{smoke,auth,chat,knowledge,admin,isolation}`。
2. 更新相对 imports 和 Playwright test discovery。
3. 保持阶段 1 标签和命令行为不变。
4. 验证默认、smoke、real-api/embed 测试集合不变。
