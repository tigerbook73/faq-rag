# FAQ RAG — Improvement Roadmap

## 1. LLM 成本与质量

| ID  | 任务                        | 状态 |
| --- | --------------------------- | ---- |
| 1-A | DeepSeek Prefix Cache 验证  | ✅   |
| 1-B | Claude Prompt Caching       | ✅   |
| 1-C | 交叉编码器重排序 (Reranker) | 📋   |
| 1-D | HyDE 检索                   | 📋   |
| 1-E | 引用片段完整显示            | ✅   |

## 2. Next.js / React

| ID  | 任务                                            | 状态 |
| --- | ----------------------------------------------- | ---- |
| 2-A | Knowledge 页面改用 Server Components + Suspense | ✅   |
| 2-B | 上传改用 Server Actions + useActionState        | ✅   |
| 2-C | DocumentTable 乐观更新                          | ✅   |
| 2-D | 聊天会话迁移到 PostgreSQL                       | ✅   |

## 3. 用户体验

| ID  | 任务                | 状态 |
| --- | ------------------- | ---- |
| 3-A | 在 UI 中启用 Claude | ✅   |
| 3-B | 暗色模式切换        | ✅   |
| 3-C | 会话重命名          | 📋   |
| 3-D | 文档搜索/筛选       | 📋   |

## 4. 可靠性 / 生产就绪

| ID  | 任务                     | 状态 |
| --- | ------------------------ | ---- |
| 4-A | 并行文档块嵌入（层1完成）| ✅   |

---

图例：✅ 已完成 · 🚧 进行中 · 📋 待办

---

## 实施记录

### 1-A DeepSeek Prefix Cache 验证

- `stream_options: { include_usage: true }` 开启后，`prompt_cache_hit_tokens` 持续为 0
- **结论**：per-turn RAG 注入模式下，每次请求的 `messages[0].content` 不同（历史存裸问题，但 DeepSeek 实际看到的是 context+问题），前缀在第一条消息就分叉，自动前缀缓存无法命中
- DeepSeek prefix cache 适合消息数组开头稳定的场景，不适合本项目的动态 context 注入架构

### 1-B Claude Prompt Caching

- `system` 改为 `TextBlockParam[]` 并加 `cache_control: { type: "ephemeral" }`
- `cache_control` 标注在**最后一条 assistant 消息**（历史中稳定不变的前缀）和**最后一条 user 消息**（当前 context）
- usage 读取改为 `stream.on("message", ...)` 回调（在流结束后触发），比 `message_start` 事件更准确
- **实测发现**：`message_start` 里的 `cache_creation_input_tokens` 首次请求为 0（是 SDK 的时序问题，非缓存未生效），`finalMessage` 路径才是准确来源
- **与 1-A 相同的根本限制**：history 存的是裸问题，context 每轮重新注入在末尾，prefix 每轮不同，`cache_read` 依然为 0
- **真正能产生 read 的条件**：多轮对话中 assistant 消息积累到 ≥1024 tokens 后，`lastAssistantIdx` 的 cache_control 才能跨轮被命中

### 1-E 引用片段完整显示

- `app/api/chat/route.ts:39`：`c.content.slice(0, 200)` → `c.content`，取消截断
- `CitationDrawer.tsx:29`：`h-64` → `max-h-[60vh]`，自适应高度容纳完整块内容

### 4-A 并行文档块嵌入（层1 — 批量嵌入）

- `bge.ts`：新增 `getEmbeddings(texts[])` 批量函数，单次 ONNX 调用处理整批文本
- `pipeline.ts`：两处串行 `for` 循环替换为按 `BATCH_SIZE` 分批调用 `getEmbeddings`；DB INSERT 改为 `Promise.all` 并行写入
- `EMBED_BATCH=8`（默认），可通过环境变量调整
- 层2（worker_threads 多核分片）未实施，需额外 bundler 配置

### 2-B 上传改用 Server Actions + useActionState

- `app/knowledge/actions.ts`（新建）：`"use server"` Server Action，接收多文件 FormData，逐一调 `ingestBuffer`，最后 `revalidatePath("/knowledge")` 使 RSC 树失效
- `UploadZone.tsx`：`useActionState(uploadDocuments, null)` 替换手动 `fetch` + `uploading` state；`isPending` 驱动 disabled/opacity；`useEffect` 监听 `state.timestamp` 变化触发 toast；移除 `useRouter` 和 `router.refresh()`
- `/api/documents` POST 路由保留不动（用户决策）

### 2-D 聊天会话迁移到 PostgreSQL

- `prisma/schema.prisma`：新增 `Session`（id/title/createdAt/updatedAt）和 `SessionMessage`（id/sessionId/role/content/citations Json?/createdAt）两个 model，`migration: add_sessions`
- `app/api/sessions/route.ts`（新建）：`GET`（list，按 updatedAt desc）、`POST`（create with client-generated UUID）
- `app/api/sessions/[id]/route.ts`（新建）：`GET`、`PATCH`（事务内全量替换 messages）、`DELETE`
- `src/lib/chat-storage.ts`：删除全部 localStorage CRUD，保留 `getLastChatId` / `setLastChatId`（localStorage，仅存 ID）；新增 `fetchSessions`、`fetchSession`、`upsertSession`（PATCH 404 时自动 POST + PATCH）、`apiDeleteSession`
- `ChatWindow.tsx`：接收 `initialSession` prop（Server Component 传入，无客户端 loading 状态）；`persistMessages` 改为 async，`await upsertSession`
- `ChatSidebar.tsx`：移除 `useSyncExternalStore`，改为 `useState` + `useEffect` 拉取 + 监听 `chat-session-updated` 事件触发重新 fetch
- `app/chat/[id]/page.tsx`：直接 `prisma.session.findUnique` 查询，传 `initialSession` 给 `ChatWindow`
- `app/chat/layout.tsx`：移除 `pruneOldSessions`（DB 永久保存，无需过期清理）

### 2-C DocumentTable 乐观更新

- `handleDelete`：保存 `prev` 快照 → 立即 `filter` 移除条目 → `fetch DELETE` → 成功调 `router.refresh()`，失败还原 `prev`
- `handleReindex`：保存 `prev` 快照 → 立即将目标文档 `status` 改为 `"pending"` → `fetch POST reindex` → 成功调 `router.refresh()`，失败还原 `prev`
- 移除 `@tanstack/react-query` 依赖（代码中已零引用）

### 2-A 知识库页面改用 Server Components + Suspense

- `page.tsx` 改为 async Server Component，直接 `prisma.document.findMany()`，移除 `QueryClientProvider`
- `loading.tsx` 新建，Suspense fallback 骨架屏（Next.js 约定文件，自动生效）
- `DocumentTable.tsx` 接收 `initialDocuments` prop，移除 React Query，改用 `router.refresh()` 轮询
- `UploadZone.tsx` 移除 `onUploaded` prop，内部调 `router.refresh()`
- Rebuild All 按钮从 `page.tsx` 迁入 `DocumentTable.tsx`
