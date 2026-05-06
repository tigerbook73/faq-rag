# Multi-user 实施进度

## 当前状态

- 当前阶段：`2.14.4` 文档归属和私有隔离
- 状态：未开始 / 下一步
- 最后确认的实现提交：`80e4ce7`（`feat: isolate chat sessions by user`）
- 最后确认的设计提交：`d072122`（`docs: phase multi-user implementation plan`）
- 进度文档状态：已迁移到轻量三文档结构，等待提交成为新的恢复基线
- 下一步入口：统一文档 API 与当前用户归属

当前 feature 文档结构为：

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`

当前工作区应保持干净后再进入阶段 `2.14.4` 实施。

## 历史提交映射

- `e1f82da` `docs: add multi-user feature requirements`
  - 新增产品需求来源：`Docs/FEATURE-multi-user.md`，现已迁移为 `Docs/features/multi-user/REQUIREMENTS.md`。
- `8d1d620` `docs: add multi-user design`
  - 新增初版技术设计：`Docs/DESIGN-multi-user.md`，现已迁移为 `Docs/features/multi-user/DESIGN.md`。
- `d072122` `docs: phase multi-user implementation plan`
  - 增加分阶段实施、迁移、测试、风险和发布策略。
- `97a561f` `feat: add multi-user data foundation`
  - 实施阶段 `2.14.1` 基础：Prisma schema 变更、多用户 migration、seed 脚本，以及 session 创建路径的临时默认 admin 兼容。
- `a134f03` `feat: add auth and data access foundations`
  - 实施阶段 `2.14.2` 基础：auth helpers、初始数据访问层，以及 chat/knowledge 页面数据访问收敛。
- `80e4ce7` `feat: isolate chat sessions by user`
  - 实施阶段 `2.14.3`：session API 用户隔离，并增加 session API 测试。

历史 commit message 不做 rewrite。本映射作为既往 multi-user 工作的恢复来源。

## 阶段清单

- [x] `2.14.1` 数据模型和默认用户基础
- [x] `2.14.2` 认证授权和数据访问层
- [x] `2.14.3` 聊天记录隔离
- [ ] `2.14.4` 文档归属和私有隔离
- [ ] `2.14.5` 问答检索权限过滤
- [ ] `2.14.6` 公开文档选择
- [ ] `2.14.7` 管理员能力和清理流程
- [ ] `2.14.8` UI 整合和端到端验收

## 已实施内容

- 在 Prisma model 中增加 `UserProfile`、`UserRole`、`DocumentVisibility` 和 `PublicDocumentSelection`。
- 增加多用户基础 migration 和默认演示用户 seed 脚本。
- 增加 `requireUser()`、`requireAdmin()`，并通过 Supabase Auth 和 `UserProfile` 获取当前业务用户。
- 增加 `src/lib/data/sessions.ts` 和 `src/lib/data/documents.ts`。
- 更新 chat 和 knowledge server page，改为使用当前用户的数据访问 helper。
- 更新 session API routes，要求当前用户，并按 `userId` 隔离 list/get/create/update/delete。
- 增加 session API 隔离测试。

## 已知不一致

- 文档上传准备接口仍把新文档写到 `DEFAULT_ADMIN_USER_ID`，而不是当前用户。
- CLI/API ingest helper 路径仍使用 `DEFAULT_ADMIN_USER_ID`。
- `GET /api/documents` 仍然全局列出文档。
- 文档删除、index、reindex API 还没有强制 owner/admin 授权。
- Knowledge UI 还没有暴露 visibility 选择和公开文档选择。
- Retrieval 仍然全局搜索所有 indexed 文档，且没有接收 `userId`。
- 公开文档选择 API 和管理员 API 尚未实现。

## 下一步

继续阶段 `2.14.4`：

1. 将 `/api/documents/prepare` 的文档归属从默认 admin 改为当前认证用户。
2. 让 `/api/documents` 默认只列出当前用户自己的文档。
3. 为文档 delete、index、reindex 增加 owner/admin 权限检查。
4. 上传 visibility 先保持默认 `private`；显式 UI 控件可在同阶段后续补齐。
5. 增加聚焦测试，覆盖文档归属和重复 hash 行为。

## 验证状态

- `pnpm exec tsc --noEmit`：本次重建进度文档未运行。
- `pnpm test`：本次重建进度文档未运行。
- E2E：未运行。

继续阶段 `2.14.4` 前，如需确认实现基线，应从相关提交恢复验证结果，或重新运行必要测试。

## 恢复协议

恢复此 feature 时：

1. 从最新提交读取本文件。
2. 检查 `git status`。
3. 检查 `Last confirmed implementation commit` 之后的提交。
4. 检查 `DESIGN.md` 或 `REQUIREMENTS.md` 是否在最后确认进度之后发生变化。
5. 如果影响流程的文档变化没有反映到本文件，暂停实施，先刷新 feature 文档。
6. 只检查当前阶段或不一致点所必需的代码路径。
7. 每次阶段或子阶段提交前更新本文件。

## 更新规则

以下情况需要更新本文件：

- 阶段或子阶段开始、完成或有意跳过。
- 下一步实施入口发生变化。
- 测试或验证状态发生变化。
- 发现或解决已知不一致、阻塞问题。
- 需求或设计变化影响实施流程。

无关变更不更新本文件。只有技术设计变化时才更新设计文档，只有产品需求变化时才更新需求文档。
