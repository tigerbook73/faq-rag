# knowledge-upload 实施进度

## 当前状态

- 当前阶段：阶段 1 已完成
- 状态：实现完成，类型检查、相关 Jest 和 Knowledge 上传 E2E 均通过，待提交
- 最后确认的实现提交：待提交
- 下一步入口：提交本 feature；后续改动从新的产品或回归项开始

## 文档结构

- `REQUIREMENTS.md`
- `DESIGN.md`
- `PROGRESS.md`（本文件）

## 文档一致性检查

- 需求与设计文档同日创建（2026-05-07）。
- 2026-05-12 检查：历史提交 `2bbea4e knowledge-upload: compact mobile upload zone` 只修改 `UploadZone` UI 紧凑度，未实现本 feature 的 optimistic insert / 活跃轮询目标；该 UI 工作已由 `knowledge-ui-layout` 后续 feature 接管。
- `src/lib/ingest/pipeline.ts` 已确认会将文档状态更新为 `indexing`，schema 也包含 `pending` / `uploaded` / `indexing` / `indexed` / `failed`。

## 阶段清单

- [x] 阶段 1：Knowledge 页面分析与轮询改造

## 阶段 1 计划：Knowledge 页面分析与轮询改造

1. 读取 `src/app/knowledge/page.tsx` 及其相关 client 组件，确认：
   - 文档列表的 state 管理位置（useState / server component SSR）
   - 现有轮询代码（`POLL_INTERVAL_MS` 如何使用）
   - 上传成功后的当前处理方式
2. 检查 `src/lib/ingest/pipeline.ts`，确认 `status` 字段是否有 `indexing` 中间态。
3. 按 DESIGN.md Section 3 实施：
   - 上传后 optimistic insert
   - `hasActiveDoc` flag 驱动的轮询启停
4. `pnpm exec tsc --noEmit`
5. 人工验证上传流程

## 已完成工作

- `createPendingDocumentForOwner()` 返回包含 `_count.chunks` 的 document DTO，便于前端立即渲染 pending 行。
- `POST /api/documents/prepare` 响应新增 `document` 字段，同时保留 `docId`、`signedUrl`、`token`。
- `UploadZone` 在每个文件上传到 storage 成功后，立即将 `document` prepend 到 `/api/documents` 的 SWR cache，不再等待下一次列表 revalidate 才显示。
- `UploadZone` 保留最终 `mutate("/api/documents")`，用于和服务端状态收敛。
- `useDocumentManagement` 的 active polling 判断改为基于全部文档 `baseDocuments`，避免搜索过滤隐藏 active 文档后停止轮询。

## 验证状态

- `pnpm exec tsc --noEmit`：通过。
- `pnpm exec jest src/app/api/documents/prepare/route.test.ts src/app/api/documents/route.test.ts --runInBand`：通过，2 个测试套件 / 3 个测试。
- `pnpm exec playwright test e2e/knowledge.test.ts --project=chromium`：通过，1 个测试。
- 人工验证：由 Playwright 上传流程覆盖基础验收；未额外执行手动浏览器验证。

## 验收清单

- [x] 上传文件后，文档立即出现在列表中（status: `pending`）
- [x] 索引过程中，列表行实时更新 chunk 数量和状态
- [x] 索引完成后，显示 `indexed` 状态，轮询停止
- [x] 索引失败时，显示 `failed` 状态
- [x] 非活跃文档不触发额外轮询

## 恢复协议

恢复此 feature 时：

1. 先读取本文件（PROGRESS.md）。
2. 再读取 [DESIGN.md](./DESIGN.md)。
3. 最后读取 [REQUIREMENTS.md](./REQUIREMENTS.md)。
4. 检查 `git status` 和 `git log`，确认是否有相关实现提交。
5. 如果有实现提交，以实际代码为准，更新本文件的已完成工作。
