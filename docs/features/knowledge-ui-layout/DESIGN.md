# knowledge-ui-layout 设计

## 1. 对应需求

本设计对应 [REQUIREMENTS.md](./REQUIREMENTS.md)。

---

## 2. 现状分析

当前 `/knowledge` 页面由 `src/app/knowledge/page.tsx` 直接顺序渲染：

```text
UploadZone
DocumentTable
PublicDocumentTable
```

主要组件：

| 文件 | 当前责任 |
| --- | --- |
| `src/app/knowledge/page.tsx` | 渲染 Knowledge 页面结构 |
| `src/components/knowledge/UploadZone.tsx` | 上传入口和上传进度 |
| `src/components/knowledge/DocumentTable/index.tsx` | My documents 标题、搜索、刷新、Rebuild All、表格和 dialogs |
| `src/components/knowledge/DocumentRow.tsx` | My documents 单行，包含 status、visibility、reindex、delete |
| `src/components/knowledge/PublicDocumentTable.tsx` | Public documents 搜索、表格、selection button |

后端 `listSelectablePublicDocuments()` 已过滤：

```ts
visibility: "public"
status: "indexed"
```

因此 Public documents UI 中的 status 列不是必要信息。

---

## 3. 信息架构

将页面调整为 tab 工作区：

```text
Knowledge
[ My documents | Public documents ]

My documents:
  UploadZone
  Header actions
  My documents list/table

Public documents:
  Header actions
  Public documents list/table
```

默认打开 `My documents`。刷新页面后仍默认打开 `My documents`，不需要通过 URL、query string 或 localStorage 记住上次选择的 tab。

`UploadZone` 只在 `My documents` tab 内展示。

---

## 4. 组件边界

建议新增 workspace 组件承载 tab 状态：

| 文件 | 责任 |
| --- | --- |
| `src/app/knowledge/page.tsx` | 保持 server page，渲染 `PageShell` 和 workspace |
| `src/components/knowledge/KnowledgeWorkspace.tsx` | 管理 tabs，决定展示 `UploadZone`、`DocumentTable`、`PublicDocumentTable` |
| `src/components/knowledge/DocumentTable/index.tsx` | My documents 标题、工具栏、桌面表格、移动端 stacked rows |
| `src/components/knowledge/DocumentRow.tsx` | My documents 单行展示和 Actions 菜单 |
| `src/components/knowledge/PublicDocumentTable.tsx` | Public documents 标题、桌面表格、移动端 stacked rows、selection switch |

如项目尚无 tabs 或 switch 组件，按现有 `src/components/ui/*` 约定新增，不引入传统 `tailwind.config.ts`。

---

## 5. My documents 设计

### 5.1 工具栏

建议结构：

```text
My documents                         [refresh] [more]
12 documents
```

- 移除默认 search。
- search 在桌面端保留，在移动端隐藏。
- refresh 保留为 icon button，使用 `RefreshCw`。
- `Rebuild All` 统一放入 My documents header 的 More 菜单。
- rebuilding 期间在 header 中展示紧凑进度，例如 `Rebuilding 2/8`，不要撑开按钮文本。

### 5.2 行操作

将 visibility、reindex、delete 收进每行 Actions 菜单：

- `Make public`：当前为 private 时显示。
- `Make private`：当前为 public 时显示。
- `Reindex`：仅 `indexed` 或 `failed` 状态可用。
- `Delete`：destructive 样式，继续复用确认 dialog。

桌面端和移动端都统一使用 Actions 菜单。visibility、reindex、delete 都不是高频操作，不再作为行内直出控件展示。

### 5.3 桌面表格

建议列：

| 列 | 说明 |
| --- | --- |
| Name | 文件名，允许截断 |
| Status | status badge，failed 时展示错误摘要 |
| Visibility | badge 或菜单中状态摘要 |
| Chunks | chunk 数量；indexing 时显示 `done / total` |
| Uploaded | 桌面显示，移动端 metadata 显示 |
| Actions | 右对齐更多菜单 |

### 5.4 移动端 row

`md` 以下使用 stacked row，`md` 及以上保留 table。移动端 row：

```text
document-name.pdf                         [more]
[indexed] [private]
12 chunks · en · May 10
```

失败状态：

```text
document-name.pdf                         [more]
[failed] [public]
Embedding provider error...
```

---

## 6. Public documents 设计

### 6.1 桌面表格

桌面端保留 search，移动端隐藏 search。移除 status 列。建议列：

| 列 | 说明 |
| --- | --- |
| Name | 公有文档名 |
| Owner | owner email |
| Lang | 语言 |
| Chunks | chunk 数量 |
| Use | selection switch/toggle |

### 6.2 移动端 row

`md` 以下使用 stacked row，`md` 及以上保留 table。

```text
public-doc-name.pdf                       [switch]
owner@example.com
12 chunks · en
```

### 6.3 Selection 控件

将当前 `Selected` / `Select` button 改为 switch/toggle：

- on：当前用户选择该公有文档参与检索。
- off：当前用户未选择。
- optimistic update 逻辑沿用当前 `handleSelectionChange(id, selected)`。
- updating 时禁用 switch，并在失败时回滚 SWR 数据并 toast。

---

## 7. UploadZone 密度

`UploadZone` 移入 My documents tab 后，可按状态调整密度：

- 无文档时：保留较明显 dropzone，引导上传。
- 已有文档时：移动端使用更紧凑上传入口，桌面仍支持 drag and drop。
- 上传进度继续使用现有 progress bar。

本 feature 需要包含 UploadZone 紧凑化，不作为后续可选项。

---

## 8. 实施阶段

1. 新增/接入 tabs workspace，移动 `UploadZone` 到 `My documents` tab 内。
2. 移除两个列表 subtitle，添加紧凑标题和数量。
3. 调整 `PublicDocumentTable`：移除 status 列，selection 改 switch/toggle。
4. 调整 `DocumentRow`：visibility、reindex、delete 收进 Actions 菜单。
5. 为两张表添加移动端 stacked row 布局，桌面保留 table。
6. 紧凑化 `UploadZone`，尤其是移动端和已有文档场景。

---

## 9. 验证策略

- `pnpm exec tsc --noEmit`
- 组件交互人工验证：
  - 切换 tabs。
  - My documents 上传后列表更新。
  - My documents visibility 切换、reindex、delete。
  - Public documents switch 选择/取消选择。
- 移动端视口验证：
  - `375x667`
  - `390x844`
  - `768x1024`
- 桌面视口验证：
  - `1280x800`
  - `1440x900`
