# FAQ RAG — Roadmap

> 记录项目改进方向。待办项按**学习价值 × 实施成本**排序。
>
> **实施规则（使用 Claude Code 执行时）：**
> - 按顺序执行子项目，前一项未完成前不开始下一项
> - 不需要写计划，直接执行
> - 非危险操作无需确认，直接执行
> - 每个子项目完成后 `git add`，等确认后再 commit

---

## 已完成项目总览

| # | 项目 | 分类 |
|---|------|------|
| 1-A | DeepSeek Prefix Cache 验证 | RAG |
| 1-B | Claude Prompt Caching | RAG |
| 1-C | 交叉编码器重排序（实现完成，运行时禁用） | RAG |
| 1-D | HyDE 检索 | RAG |
| 1-E | 引用片段完整显示 | RAG |
| 1-F | 语义分块 | RAG |
| 2-A | 知识库页改 Server Components + Suspense | Next.js |
| 2-B | 上传改 XHR + 进度条 | Next.js |
| 2-C | DocumentTable 乐观更新 | Next.js |
| 2-D | 会话持久化迁移至 PostgreSQL | Next.js |
| 2-E | 多轮对话上下文管理（truncate.ts） | Next.js |
| 3-A | 启用 Claude UI | UX |
| 3-B | 暗色模式切换 | UX |
| 3-C | 会话重命名（行内编辑） | UX |
| 3-D | 文档搜索 / 筛选 | UX |
| 3-E | 对话导出（Markdown） | UX |
| 3-F | 文档失败错误内联显示 | UX |
| 3-G | Rebuild All 进度反馈 | UX |
| 4-A | 批量嵌入（getEmbeddingsBatch） | 可靠性 |
| 4-B | API 层 Zod 输入验证 | 可靠性 |
| 4-C | DB 索引补全（status / updatedAt / documentId） | 可靠性 |
| 4-D | Sessions PATCH Zod 校验 | 可靠性 |
| 4-E | 速率限制（chat API） | 可靠性 |
| 4-F | SSE 流解析健壮化（eventsource-parser） | 可靠性 |
| 4-G | pgvector HNSW 索引 | 可靠性 |
| 4-H | Ingestion Worker Thread | 可靠性 |
| 4-I | 断点续传索引（Resume Indexing） | 可靠性 |
| 5-A | DeepSeek 客户端单例化 | 代码质量 |
| 5-B | 魔法数字提取到 config.ts | 代码质量 |
| 5-C | 文件扩展名改用 path.extname | 代码质量 |
| 5-D | Embedding 单例并发初始化锁 | 代码质量 |
| 6-A | 检索管道单元测试 | 测试 |
| 6-B | Playwright E2E 测试 | 测试 |
| 6-C | 嵌入质量对比实验 | 测试 |

---

## 待办项目

### 七、代码结构优化

#### 7-A 魔法字符串集中管理

| 难度 | ⭐ 简单 |
|------|---------|
| 预计工时 | 1 小时 |
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

#### 7-B Supabase Browser Client 工厂

| 难度 | ⭐ 简单 |
|------|---------|
| 预计工时 | 30 分钟 |
| 核心技能 | DRY、可测试性 |

**问题**：`createBrowserClient(URL, KEY)` 含环境变量的调用在三处重复：
- `src/components/layout/TopBar.tsx`（sign-out）
- `src/app/auth/signin/page.tsx`（sign-in）
- `src/context/auth-context.tsx`（onAuthStateChange）

**方案**：新建 `src/lib/supabase/browser.ts`：

```ts
import { createBrowserClient } from "@supabase/ssr";
export const createSupabaseBrowserClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
```

三处调用统一改为 `createSupabaseBrowserClient()`。

---

#### 7-C ChatWindow 自定义 Hook 拆解

| 难度 | ⭐⭐⭐ 中等偏高 |
|------|--------------|
| 预计工时 | 3–5 小时 |
| 核心技能 | 自定义 Hook、关注点分离、React 状态设计 |

**问题**：`ChatWindow.tsx`（308 行）包含 5 个独立关注点，全部堆在一个组件里，难以单独测试和理解。

**目标拆分**：

| Hook | 职责 | 主要状态 |
|------|------|----------|
| `useDraftPersistence(chatId)` | localStorage draft 读写 + debounce | `input`, `setInput` |
| `useChatScroll(messages, chatId)` | scroll 位置保存/恢复、新消息时滚到底 | `bottomRef`, `scrollContainerRef` |
| `useStreamingChat(...)` | fetch SSE、parse 事件、更新 messages | `loading`, `send` |

`ChatWindow` 只负责组合这些 hook 并渲染 JSX。

---

#### 7-D ChatSidebar — SessionItem 组件提取

| 难度 | ⭐⭐ 中等 |
|------|---------|
| 预计工时 | 1–2 小时 |
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

#### 7-E DocumentTable — Dialog 组件提取

| 难度 | ⭐ 简单 |
|------|---------|
| 预计工时 | 1 小时 |
| 核心技能 | 组件提取、JSX 可读性 |

**问题**：`DocumentTable.tsx`（262 行）末尾两个 `<Dialog>` 共约 65 行（DeleteDialog + RebuildDialog），与表格逻辑交织。

**方案**：提取为同文件内的 `DeleteDialog` / `RebuildDialog` 组件，各接受 `open`、`onConfirm`、`onClose` 等 props：

```tsx
function DeleteDialog({ open, onConfirm, onClose, disabled }: ...) { ... }
function RebuildDialog({ open, onConfirm, onClose, disabled }: ...) { ... }
```

主组件 return 部分减少约 60 行。

---

### 八、功能增强

#### 8-A Cross-encoder 重排序运行时开关

| 难度 | ⭐ 简单 |
|------|---------|
| 预计工时 | 30 分钟 |
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

#### 8-B LLM 生成会话标题

| 难度 | ⭐⭐ 中等 |
|------|---------|
| 预计工时 | 2–3 小时 |
| 核心技能 | 后台异步调用、乐观 UI 更新 |

**问题**：当前标题是首条用户消息的前 60 字符截断，长问题的标题往往不可读。

**方案**：在 `persistMessages` 首次保存后，用当前 LLM provider 异步生成一个简短标题（5–10 字）：

```ts
if (isFirstMessage) {
  generateTitle(question, provider).then((title) =>
    upsertSession({ ...session, title })
  );
}
```

`generateTitle` 单独调用 LLM，不阻塞 SSE 流，用户体验不受影响。

---

#### 8-C 上传接口速率限制

| 难度 | ⭐ 简单 |
|------|---------|
| 预计工时 | 30 分钟 |
| 核心技能 | API 安全 |

**问题**：`/api/documents`（上传）和 `/api/documents/:id/reindex`（重索引）没有速率限制，但这两个接口会触发嵌入计算，成本较高。`/api/chat` 已有限制（10 次/分/IP）。

**方案**：复用 `checkRateLimit`：
- 上传：5 次/分/IP
- reindex：3 次/小时/IP（防止批量 rebuild 滥用）

---

#### 8-D 索引进度实时推送（SSE）

| 难度 | ⭐⭐⭐ 中等偏高 |
|------|--------------|
| 预计工时 | 4–6 小时 |
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
  §7-B  Supabase Browser Client 工厂    → 30 分钟，消除重复代码
  §8-A  Cross-encoder 运行时开关        → 30 分钟，立刻能试效果
  §8-C  上传速率限制                    → 30 分钟，安全补漏

中等（按需）
  §7-A  魔法字符串                      → 1 小时，维护性提升
  §7-E  DocumentTable Dialog 提取      → 1 小时，JSX 清爽
  §7-D  SessionItem 组件               → 1–2 小时
  §8-B  LLM 生成会话标题               → 2–3 小时，UX 提升明显

较高成本（学习价值大）
  §7-C  ChatWindow Hook 拆解           → 3–5 小时，React 设计模式
  §8-D  索引进度 SSE                   → 4–6 小时，全栈 SSE 实践
```

---

_最后更新：2026-04-29_
