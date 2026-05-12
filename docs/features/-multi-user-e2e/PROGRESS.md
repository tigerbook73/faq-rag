# multi-user-e2e 实施进度

## 当前状态

- 当前阶段：阶段 1–4 全部完成
- 状态：实现完成，类型检查、multi-user E2E 和全量 Chromium E2E 均通过，待提交
- 最后确认的实现提交：待提交
- 最后确认的设计提交：无
- 进度文档状态：需求和设计已完成，待启动实施
- 下一步入口：阶段 1 — globalSetup 和 auth fixtures（见 DESIGN.md 第 8 节）

当前 feature 文档结构为：

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`

## 阶段清单

- [x] 阶段 1：globalSetup 和 auth fixtures
- [x] 阶段 2：会话隔离和文档隔离测试
- [x] 阶段 3：公开文档选择测试（含检索）
- [x] 阶段 4：Admin 操作测试

## 已实施内容

- 新增 `e2e/global-setup.ts`，为 admin、user1、user2 生成 `e2e/.auth/*.json` storageState。
- 新增 `e2e/fixtures/auth.ts`，暴露 `adminPage`、`user1Page`、`user2Page`。
- 新增 `e2e/multi-user/auth-fixtures.test.ts`，验证三个账号 storageState 可加载。
- `playwright.config.ts` 已接入 globalSetup。
- 新增 `e2e/fixtures/documents.ts`，提供 pending 文档创建、列表和删除 helper。
- 新增 `e2e/multi-user/session-isolation.test.ts`，覆盖 user2 不能列表/直接加载 user1 session。
- 新增 `e2e/multi-user/document-isolation.test.ts`，覆盖 user2 不能列表/删除 user1 private document。
- 扩展 `e2e/fixtures/documents.ts`，支持上传并等待 indexed、设置 visibility。
- 新增 `e2e/multi-user/public-doc-selection.test.ts`，覆盖 user2 勾选前/后/取消勾选后，`/api/chat` citations 是否包含 user1 public document。
- 新增 `e2e/multi-user/admin-operations.test.ts`，覆盖 Admin 用户列表、临时用户删除、自删保护、公开文档删除。
- 新增 `e2e/multi-user/admin-navigation.test.ts`，覆盖 Admin 默认登录、from 跳转、Admin/User shell 切换。

## 已知不一致

- `REQUIREMENTS.md` 3.5 包含管理员页面登录跳转和站点切换场景；2026-05-12 已同步补充到 `DESIGN.md` 阶段 4。

## 验证状态

- `pnpm exec tsc --noEmit`：通过。
- `pnpm lint`：通过。
- `pnpm exec playwright test e2e/multi-user/auth-fixtures.test.ts --project=chromium`：通过，3 个测试。
- `pnpm exec playwright test e2e/multi-user/session-isolation.test.ts e2e/multi-user/document-isolation.test.ts --project=chromium`：通过，2 个测试。
- `pnpm exec playwright test e2e/multi-user/public-doc-selection.test.ts --project=chromium`：通过，1 个测试。
- `pnpm exec playwright test e2e/multi-user/admin-operations.test.ts e2e/multi-user/admin-navigation.test.ts --project=chromium`：通过，4 个测试。
- `pnpm exec playwright test e2e/multi-user --project=chromium`：通过，10 个测试。
- `pnpm exec playwright test --project=chromium`：通过，21 个测试。

## 下一步

本 feature 已完成。后续维护入口：

1. 如要纳入 CI，确保 CI 具备 Supabase Auth、DB、Storage、embedding 和 retrieval 所需环境。
2. 如新增 multi-user 权限边界，补充 `e2e/multi-user/*` 聚焦测试。

## 恢复协议

恢复此 feature 时：

1. 从最新提交读取本文件。
2. 检查 `git status`。
3. 检查最后确认实现提交之后的新提交。
4. 检查 `DESIGN.md` 或 `REQUIREMENTS.md` 是否在最后确认进度之后发生变化。
5. 只检查当前阶段所必需的代码路径。
6. 每次阶段或子阶段提交前更新本文件。
