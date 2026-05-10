# knowledge-ui-layout 实施进度

## 当前状态

- 当前阶段：规划草稿，未开始
- 状态：需求与设计文档已创建，待用户确认和修改
- 最后确认的实现提交：无
- 下一步入口：用户确认文档后，读取 `src/app/knowledge/page.tsx`、`src/components/knowledge/DocumentTable/index.tsx`、`src/components/knowledge/DocumentRow.tsx`、`src/components/knowledge/PublicDocumentTable.tsx`、`src/components/knowledge/UploadZone.tsx`

## 文档结构

- `REQUIREMENTS.md`（未提交）
- `DESIGN.md`（未提交）
- `PROGRESS.md`（未提交，即本文件）

## 文档一致性检查

- 2026-05-10 创建 feature 文档，尚无实现提交，无一致性冲突。
- 本 feature 独立于 `knowledge-upload`；不要修改 `docs/features/knowledge-upload/*` 来记录本 feature 的 UI layout 规划。
- 实施前需确认 tabs 和 switch 组件是否已存在；若不存在，按 `src/components/ui/*` 现有风格新增。
- 2026-05-10 用户已确认关键取舍：
  - tabs 刷新后默认打开 My documents，不记住上次 tab。
  - My documents 和 Public documents 的 search 桌面保留、移动端隐藏。
  - My documents 行操作在桌面和移动端都统一收进 Actions 菜单。
  - `Rebuild All` 统一放入 My documents header More 菜单。
  - 本 feature 包含 UploadZone 紧凑化。
  - `md` 以下使用 stacked row，`md` 及以上保留 table。

## 阶段清单

- [ ] 阶段 1：Knowledge workspace tabs 和 UploadZone 分区
- [ ] 阶段 2：My documents 工具栏与 Actions 菜单
- [ ] 阶段 3：Public documents status 移除和 selection switch
- [ ] 阶段 4：移动端 stacked rows 和视口验证

## 阶段 1 计划：Knowledge workspace tabs 和 UploadZone 分区

1. 检查项目是否已有 tabs 组件。
2. 新增 `KnowledgeWorkspace` 或在页面内接入 tabs。
3. 将 `UploadZone` 只放入 `My documents` tab。
4. 默认打开 `My documents`，刷新后不记住上次 tab。
5. 确认桌面和移动端切换 tabs 后布局稳定。

## 阶段 2 计划：My documents 工具栏与 Actions 菜单

1. 移除 My documents subtitle。
2. My documents search 桌面保留、移动端隐藏。
3. 保留 refresh icon button。
4. 将 `Rebuild All` 移到 header More 菜单。
5. 将 visibility、reindex、delete 在桌面和移动端都收进每行 Actions 菜单。

## 阶段 3 计划：Public documents selection 优化

1. 移除 Public documents subtitle。
2. Public documents search 桌面保留、移动端隐藏。
3. 移除 status 列。
4. 将 selection button 改为 switch/toggle。
5. 保持现有 optimistic update 和失败回滚行为。

## 阶段 4 计划：移动端 stacked rows

1. 为 My documents 添加 `md` 以下 stacked row。
2. 为 Public documents 添加 `md` 以下 stacked row。
3. `md` 及以上保留 table。
4. 验证移动端无明显文本挤压、换行错位或操作目标过小。
5. 紧凑化 `UploadZone`，尤其是移动端和已有文档场景。

## 验证状态

- `pnpm exec tsc --noEmit`：待执行。
- `pnpm exec jest`：待执行，如改动触达测试覆盖路径。
- 人工验证：待执行。

## 验收清单

- [ ] 移动端 `/knowledge` 首屏展示 My documents / Public documents tabs。
- [ ] `UploadZone` 只在 My documents tab 出现。
- [ ] `UploadZone` 在移动端和已有文档场景下完成紧凑化。
- [ ] My documents 和 Public documents 的 subtitle 被移除或替换为紧凑数量信息。
- [ ] My documents 和 Public documents 的 search 桌面保留、移动端隐藏。
- [ ] My documents 行操作统一进入 Actions 菜单。
- [ ] `Rebuild All` 统一位于 My documents header More 菜单。
- [ ] Public documents 不展示 status 列。
- [ ] Public documents 使用 switch/toggle 管理 selection。
- [ ] `md` 以下使用 stacked row，`md` 及以上保留 table；移动端文档行信息可读，不依赖缩小字体来塞下所有表格列。

## 恢复协议

恢复此 feature 时：

1. 先读取本文件（PROGRESS.md）。
2. 再读取 [DESIGN.md](./DESIGN.md)。
3. 最后读取 [REQUIREMENTS.md](./REQUIREMENTS.md)。
4. 检查 `git status` 和 `git log`，确认是否有相关实现提交。
5. 如果有实现提交，以实际代码为准，更新本文件的已完成工作。
