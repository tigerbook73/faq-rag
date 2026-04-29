# FAQ RAG — Roadmap

> 记录项目改进方向。待办项按**学习价值 × 实施成本**排序。
>
> **实施规则（使用 Claude Code 执行时）：**
>
> - 按顺序执行子项目，前一项未完成前不开始下一项
> - 不需要写计划，直接执行
> - 非危险操作无需确认，直接执行
> - 每个子项目完成后 `git add`，不主动commit

---

## 快速导航

| 类别                                              | 项目数 |
| ------------------------------------------------- | ------ |
| [一、代码结构优化](#一代码结构优化)               | 5 项   |
| [二、功能增强](#二功能增强)                       | 4 项   |
| [三、索引性能优化](#三索引性能优化)               | 1 项   |

---

## 一、代码结构优化

### 1-A 魔法字符串集中管理

| 难度     | ⭐ 简单            |
| -------- | ------------------ |
| 预计工时 | 1 小时             |
| 核心技能 | 常量管理、可维护性 |

**问题**：多个字符串 key 分散在多个文件中，重命名或拼写错误时无类型错误提示。

散落位置：

- `"chat:last"` / `"chat:draft:"` / `"chat:scroll:"` — `ChatWindow.tsx`、`chat-storage.ts`、`chat/last/page.tsx`
- `"chat-session-updated"` / `"chat-last-changed"` — `ChatWindow.tsx`、`ChatSidebar.tsx`、`chat-storage.ts`、`providers.tsx`

**方案**：新建 `src/lib/constants.ts`：

```ts
export const STORAGE_KEYS = {
  LAST_CHAT: "chat:last",
  DRAFT: (chatId: string) => `chat:draft:${chatId}`,
  SCROLL: (chatId: string) => `chat:scroll:${chatId}`,
} as const;

export const CHAT_EVENTS = {
  SESSION_UPDATED: "chat-session-updated",
  LAST_CHANGED: "chat-last-changed",
} as const;
```

---

### 1-B Supabase Browser Client 工厂

| 难度     | ⭐ 简单       |
| -------- | ------------- |
| 预计工时 | 30 分钟       |
| 核心技能 | DRY、可测试性 |

**问题**：`createBrowserClient(URL, KEY)` 含环境变量的调用在三处重复：

- `src/components/layout/TopBar.tsx`（sign-out）
- `src/app/auth/signin/page.tsx`（sign-in）
- `src/context/auth-context.tsx`（onAuthStateChange）

**方案**：新建 `src/lib/supabase/browser.ts`：

```ts
import { createBrowserClient } from "@supabase/ssr";
export const createSupabaseBrowserClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

三处调用统一改为 `createSupabaseBrowserClient()`。

---

### 1-C ChatWindow 自定义 Hook 拆解

| 难度     | ⭐⭐⭐ 中等偏高                         |
| -------- | --------------------------------------- |
| 预计工时 | 3–5 小时                                |
| 核心技能 | 自定义 Hook、关注点分离、React 状态设计 |

**问题**：`ChatWindow.tsx`（308 行）包含 5 个独立关注点，全部堆在一个组件里，难以单独测试和理解。

**目标拆分**：

| Hook                              | 职责                                 | 主要状态                          |
| --------------------------------- | ------------------------------------ | --------------------------------- |
| `useDraftPersistence(chatId)`     | localStorage draft 读写 + debounce   | `input`, `setInput`               |
| `useChatScroll(messages, chatId)` | scroll 位置保存/恢复、新消息时滚到底 | `bottomRef`, `scrollContainerRef` |
| `useStreamingChat(...)`           | fetch SSE、parse 事件、更新 messages | `loading`, `send`                 |

`ChatWindow` 只负责组合这些 hook 并渲染 JSX。

---

### 1-D ChatSidebar — SessionItem 组件提取

| 难度     | ⭐⭐ 中等           |
| -------- | ------------------- |
| 预计工时 | 1–2 小时            |
| 核心技能 | 组件拆分、prop 设计 |

**问题**：`ChatSidebar.tsx`（287 行）的 `sessions.map(...)` 块包含约 70 行的单个 session 渲染逻辑（含 inline edit 状态），大量嵌套难以阅读。

**方案**：提取同文件内的 `SessionItem` 组件：

```tsx
function SessionItem({
  session,
  isActive,
  isEditing,
  editValue,
  onNavigate,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onExport,
  onDelete,
}: SessionItemProps) { ... }
```

---

### 1-E DocumentTable — Dialog 组件提取

| 难度     | ⭐ 简单              |
| -------- | -------------------- |
| 预计工时 | 1 小时               |
| 核心技能 | 组件提取、JSX 可读性 |

**问题**：`DocumentTable.tsx`（262 行）末尾两个 `<Dialog>` 共约 65 行（DeleteDialog + RebuildDialog），与表格逻辑交织。

**方案**：提取为同文件内的 `DeleteDialog` / `RebuildDialog` 组件，各接受 `open`、`onConfirm`、`onClose` 等 props：

```tsx
function DeleteDialog({ open, onConfirm, onClose, disabled }: ...) { ... }
function RebuildDialog({ open, onConfirm, onClose, disabled }: ...) { ... }
```

主组件 return 部分减少约 60 行。

---

## 二、功能增强

### 2-A Cross-encoder 重排序运行时开关

| 难度     | ⭐ 简单                |
| -------- | ---------------------- |
| 预计工时 | 30 分钟                |
| 核心技能 | 特性开关、环境变量设计 |

**问题**：`query.ts` 中 `rerankChunks` 以注释方式禁用，切换需要修改代码。

**方案**：在 `config.ts` 加 `export const IS_RERANK = process.env.RERANK === "true"`，在 `query.ts` 改为：

```ts
return IS_RERANK
  ? rerankChunks(userQuery, candidates, RETRIEVAL_TOP_FINAL, traceId)
  : candidates.slice(0, RETRIEVAL_TOP_FINAL);
```

`.env.example` 加 `RERANK=false`，本地测试时设为 `true` 即可开启。

---

### 2-B LLM 生成会话标题

| 难度     | ⭐⭐ 中等                  |
| -------- | -------------------------- |
| 预计工时 | 2–3 小时                   |
| 核心技能 | 后台异步调用、乐观 UI 更新 |

**问题**：当前标题是首条用户消息的前 60 字符截断，长问题的标题往往不可读。

**方案**：在 `persistMessages` 首次保存后，用当前 LLM provider 异步生成一个简短标题（5–10 字）：

```ts
if (isFirstMessage) {
  generateTitle(question, provider).then((title) => upsertSession({ ...session, title }));
}
```

`generateTitle` 单独调用 LLM，不阻塞 SSE 流，用户体验不受影响。

---

### 2-C 上传接口速率限制

| 难度     | ⭐ 简单  |
| -------- | -------- |
| 预计工时 | 30 分钟  |
| 核心技能 | API 安全 |

**问题**：`/api/documents`（上传）和 `/api/documents/:id/reindex`（重索引）没有速率限制，但这两个接口会触发嵌入计算，成本较高。`/api/chat` 已有限制（10 次/分/IP）。

**方案**：复用 `checkRateLimit`：

- 上传：5 次/分/IP
- reindex：3 次/小时/IP（防止批量 rebuild 滥用）

---

### 2-D 索引进度实时推送（SSE）

| 难度     | ⭐⭐⭐ 中等偏高                        |
| -------- | -------------------------------------- |
| 预计工时 | 4–6 小时                               |
| 核心技能 | SSE、Worker 消息传递、前端轮询 vs 推送 |

**问题**：`DocumentTable` 通过 3 秒轮询 `GET /api/documents` 检测索引完成。大文件有明显延迟感，且每次都拉全量列表。

**方案**：新建 `GET /api/documents/:id/progress` SSE 端点，worker 每处理一批 chunk 后通知主线程，主线程通过 `TransformStream` 推送进度事件：

```
data: {"done": 12, "total": 47}
data: {"done": 47, "total": 47, "status": "indexed"}
```

前端改为连接 SSE（只在 `status === "pending"` 时），结束后自动关闭。

---

## 优先级建议

```
高价值低成本（先做）
  §1-B  Supabase Browser Client 工厂    → 30 分钟，消除重复代码
  §2-A  Cross-encoder 运行时开关        → 30 分钟，立刻能试效果
  §2-C  上传速率限制                    → 30 分钟，安全补漏

中等（按需）
  §1-A  魔法字符串                      → 1 小时，维护性提升
  §1-E  DocumentTable Dialog 提取      → 1 小时，JSX 清爽
  §1-D  SessionItem 组件               → 1–2 小时
  §2-B  LLM 生成会话标题               → 2–3 小时，UX 提升明显

较高成本（学习价值大）
  §1-C  ChatWindow Hook 拆解           → 3–5 小时，React 设计模式
  §2-D  索引进度 SSE                   → 4–6 小时，全栈 SSE 实践
```

---

## 三、索引性能优化

### 3-A 索引编排重构（embedding 批量化 + 并行化 + 批量 INSERT）

| 难度     | ⭐⭐⭐ 中等偏高                                           |
| -------- | -------------------------------------------------------- |
| 预计工时 | 2–3 小时                                                 |
| 核心技能 | Promise.all 依赖分析、批量 DB 操作、embedding 层抽象设计 |
| 详细设计 | `PLAN-optimize-indexing-orchestration.md`                |

**问题**：`embedAndStoreChunks` 逐条调用 embedding + 逐条 INSERT，API 模式下 73 chunks 需要 74 次 HTTP 调用，串行延迟可达 22 秒；`processDocument` 内所有步骤全串行，存在可并行的 DB 操作。

**三项改动，均在两个文件内完成**：

**① `embeddings/router.ts` — 新增 `embedBatchForIndexing(texts)`**

封装 IS_CLOUD 分批策略，`pipeline.ts` 不引入新的 IS_CLOUD 判断：
- API 模式：一次 HTTP 请求处理全部 chunk（N → 1）
- Local 模式：每 8 条批量 ONNX 推理，批次间 `setImmediate` yield（N 次独立 → ceil(N/8) 次批量）

**② `pipeline.ts` — 重构 `embedAndStoreChunks`**

```ts
const embeddings = await embedBatchForIndexing(chunks);      // 批量 embedding
await prisma.$transaction(chunks.map((text, i) => ...));     // 单次事务批量 INSERT
```

**③ `pipeline.ts` — 重构 `processDocument`（并行化）**

```
splitText ──────────────┐  并行（互不依赖）
chunk.deleteMany ───────┘
        ↓
update(totalChunks) ────┐  并行（互不依赖）
embedAndStoreChunks ────┘
        ↓
update(status: indexed)
```

**优化前后对比（50KB 文件，73 chunks）**：

| 指标 | 优化前 | 优化后 (Local) | 优化后 (API) |
|------|--------|---------------|-------------|
| Embedding 调用次数 | 73 次独立 | 10 次批量 ONNX | **1 次 HTTP** |
| DB INSERT 事务数 | 73 次 | **1 次** | **1 次** |
| splitText 与 deleteMany 并行 | ✗ | **✓** | **✓** |
| totalChunks 与 embedAndStore 并行 | ✗ | **✓** | **✓** |

---

_最后更新：2026-04-30_
