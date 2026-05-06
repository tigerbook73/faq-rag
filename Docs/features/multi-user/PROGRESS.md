# Multi-user 实施进度

## 当前状态

- 当前阶段：`2.14.5` 问答检索权限过滤
- 状态：已完成
- 最后确认的实现提交：`6e084db`（`multi-user phase 2.14.5: filter retrieval by user`）
- 最后确认的设计提交：`d072122`（`docs: phase multi-user implementation plan`）
- 进度文档状态：阶段 `2.14.5` 已完成，当前文档已记录新的实现基线
- 下一步入口：阶段 `2.14.6` 公开文档选择

当前 feature 文档结构为：

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`

当前工作区应保持干净后再进入阶段 `2.14.6` 实施。

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
- `ca4bb90` `multi-user phase 2.14.4: isolate document owner APIs`
  - 实施阶段 `2.14.4`：文档上传、列表、删除、index、reindex API 按当前用户归属隔离，并允许管理员写入全站文档。
- `6e084db` `multi-user phase 2.14.5: filter retrieval by user`
  - 实施阶段 `2.14.5`：chat API 从当前用户推导 retrieval 权限上下文，vector search 只检索 owner 文档和已选择的 public 文档。

历史 commit message 不做 rewrite。本映射作为既往 multi-user 工作的恢复来源。

## 阶段清单

- [x] `2.14.1` 数据模型和默认用户基础
- [x] `2.14.2` 认证授权和数据访问层
- [x] `2.14.3` 聊天记录隔离
- [x] `2.14.4` 文档归属和私有隔离
- [x] `2.14.5` 问答检索权限过滤
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
- 更新文档上传准备接口，要求当前用户，并把新文档归属写入当前用户。
- 更新文档列表接口，默认只分页返回当前用户自己的文档。
- 为文档 delete、index、reindex API 增加 owner/admin 写权限检查。
- 增加文档 API 聚焦测试，覆盖当前用户归属、同用户重复 hash、列表隔离、删除和索引授权路径。
- 更新 `POST /api/chat`，要求当前用户，并把当前用户 `userId` 传入 retrieval。
- 更新 `retrieve()` / `vectorSearch()` 签名，强制接收当前用户上下文。
- 更新 vector search SQL，只允许当前用户自己的 indexed 文档，以及当前用户已选择且仍为 public 的 indexed 文档进入检索。
- 将 `src/lib/retrieval/*` 测试纳入 Jest，并增加 retrieval 权限传参和 SQL 过滤测试。
- 更新 retrieval eval 脚本，默认使用演示 admin 用户，也支持通过 `EVAL_USER_ID` 指定评测用户。

## 已知不一致

- CLI/API ingest helper 路径仍使用 `DEFAULT_ADMIN_USER_ID`。
- Knowledge UI 还没有暴露 visibility 选择和公开文档选择。
- 公开文档选择 API 和管理员 API 尚未实现。

## 下一步

继续阶段 `2.14.6`：

1. 增加公开文档列表 API，返回其他用户 public indexed 文档，并标记当前用户是否已选择。
2. 增加公开文档选择和取消选择 API。
3. 增加文档可见性更新 API，owner 可将自己的文档设为 private/public。
4. 处理 public 改 private 后的选择关系清理或失效。
5. 增加聚焦测试，覆盖不能选择自己的文档、不能选择 private/未 indexed 文档、选择后进入 retrieval 范围。

## 验证状态

- `pnpm exec tsc --noEmit`：通过。
- `pnpm exec jest --runInBand`：通过，15 个测试套件 / 47 个测试。
- `pnpm test -- --runInBand`：未执行测试；该项目脚本会把 `--runInBand` 当作 Jest pattern，返回 No tests found。
- E2E：未运行。

继续阶段 `2.14.6` 前，如需确认实现基线，应从相关提交恢复验证结果，或重新运行必要测试。

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
