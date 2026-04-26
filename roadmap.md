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
| 2-A | Knowledge 页面改用 Server Components + Suspense | 📋   |
| 2-B | 上传改用 Server Actions + useActionState        | 📋   |
| 2-C | DocumentTable 乐观更新                          | 📋   |
| 2-D | 聊天会话迁移到 PostgreSQL                       | 📋   |

## 3. 用户体验

| ID  | 任务                | 状态 |
| --- | ------------------- | ---- |
| 3-A | 在 UI 中启用 Claude | ✅   |
| 3-B | 暗色模式切换        | ✅   |
| 3-C | 会话重命名          | 📋   |
| 3-D | 文档搜索/筛选       | 📋   |

## 4. 测试

| ID  | 任务                | 状态 |
| --- | ------------------- | ---- |
| 4-A | 检索管道单元测试    | 📋   |
| 4-B | Playwright E2E 测试 | 📋   |

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
