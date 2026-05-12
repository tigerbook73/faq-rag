# e2e-test-architecture 实施进度

## 当前状态

- 当前阶段：规划完成，待实施
- 状态：需求和设计文档已按用户确认的取舍更新，尚未实施
- 最后确认的实现提交：无
- 下一步入口：阶段 1 — MVP 命令和标签基础

## 文档结构

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`（本文件）

## 阶段清单

- [ ] 阶段 1：MVP 命令和标签基础
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

- 文档阶段，无代码验证。

## 下一步

启动阶段 1：

1. 更新 `package.json` scripts。
2. 给现有测试添加标签。
3. 调整默认 `pnpm e2e` 排除 `@real-api|@embed|@slow|@prod-smoke`。
4. 记录或优化 `globalSetup` 三账号登录成本。
5. 验证默认 E2E 不运行真实 provider / embedding / prod smoke 测试。
