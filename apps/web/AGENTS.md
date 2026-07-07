# apps/web — @faq-rag/web

Next.js 16 应用,承载 FAQ RAG 的全部 UI 和后端 API 路由(数据库、检索、LLM、文件摄取)。`apps/mobile` 通过 HTTP 调用这里暴露的 `/api/*` 路由,自身不含服务端代码。仓库整体结构见 `../../AGENTS.md`。

以下所有路径均相对于本目录(`apps/web/`),除非另有前缀说明。

---

## 命令

```bash
pnpm dev                     # next dev -H 0.0.0.0,http://localhost:3000
pnpm build                   # prisma generate && next build
pnpm lint                    # tsc --noEmit && eslint --fix
pnpm typecheck
pnpm format
pnpm test                    # Jest(ts-jest,testMatch: **/*.test.ts)
pnpm verify                  # lint && format && build && test && e2e:full
```

单测运行单个文件:

```bash
npx jest path/to/file.test.ts
```

Playwright e2e:

```bash
pnpm e2e            # 默认排除 @real-api|@embed|@slow|@prod-smoke 标签
pnpm e2e:ui          # 同上,带 UI 界面
pnpm e2e:smoke       # 仅 @smoke 标签
pnpm e2e:full        # 与 e2e 相同(用于 verify 组合)
pnpm e2e:real-api    # opt-in:命中真实 provider API(@real-api|@embed)
pnpm e2e:embed       # opt-in:命中真实 embedding 模型(@embed)
pnpm e2e:remote      # 针对已部署环境,需设置 E2E_BASE_URL
pnpm e2e:prod:smoke  # 针对生产环境冒烟测试,E2E_ENV=prod REAL_API=1

npx playwright test e2e/specs/some.spec.ts   # 单个 spec 文件
pnpm e2e --grep "@smoke"                      # 按标签过滤
```

本地 Supabase + 数据库:

```bash
pnpm sb:start / sb:stop / sb:restart / sb:status   # 本地 Supabase(Postgres :54322,API :54321),依赖 Docker
pnpm db:migrate                                     # supabase migration up && prisma migrate deploy
pnpm db:reset                                       # supabase db reset && migrate && hook:set
pnpm db:studio                                      # Prisma Studio
```

Webhook / 部署(详见根 `README.md` 的 Remote Deployment 章节):

```bash
pnpm hook:set / hook:query                # 本地 ingest webhook 配置读写
pnpm hook:set:prod / hook:query:prod      # 远程(NODE_ENV=production)
pnpm deploy:remote                        # supabase db push + prisma migrate deploy + hook:set:prod
pnpm vercel:env:push / vercel:env:pull    # 与 Vercel 同步环境变量
```

---

## 技术栈

| 层次         | 选型                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 框架         | Next.js 16(App Router)+ React 19 + TypeScript                                                                                                |
| UI           | Tailwind CSS + shadcn/ui(组件位于 `src/components/ui/`)                                                                                      |
| 数据库       | PostgreSQL 16 + pgvector,本地经 Docker,远程用 Supabase Cloud                                                                                 |
| ORM          | Prisma(`prisma/schema.prisma`)                                                                                                               |
| Embedding    | `Xenova/bge-m3`(本地,1024 维)**或** `text-embedding-3-small`(OpenAI)— 通过 `EMBEDDING_PROVIDER` 环境变量切换,经 `embeddings/router.ts` 分发  |
| LLM provider | Claude `claude-sonnet-4-6`(默认)· DeepSeek `deepseek-chat` · OpenAI `gpt-4o-mini` — UI 中均可选,默认值由 `NEXT_PUBLIC_DEFAULT_PROVIDER` 决定 |
| 存储         | Supabase Storage — 上传文件存于 `documents` bucket,经 `src/lib/server/storage/index.ts`                                                      |
| 文本切分     | 语义分块(embedding 余弦边界检测)+ `@langchain/textsplitters` 兜底                                                                            |
| 重排         | `Xenova/bge-reranker-base` cross-encoder — 实现于 `cross-encoder.ts`,**目前在 `query.ts` 中被注释禁用**(延迟成本过高)                        |
| 语言检测     | `franc-min`                                                                                                                                  |
| 文件解析     | pdf-parse v2(`PDFParse` 类)、mammoth(docx)、原生 fs(md/txt)                                                                                  |
| 测试         | Jest + ts-jest + Playwright                                                                                                                  |

---

## 架构

```
Browser
  └── / → 由 proxy.ts 中间件重定向(→ /chat/last)
  └── /chat/layout       ← 异步 Server Component:预取会话列表,通过 SWRBootstrap 注入 SWR fallback
      ├── /chat/new      ← ChatWindow,chatId=null(新的临时会话)
      ├── /chat/[id]     ← ChatWindow,chatId 来自 URL(客户端经 SWR 水合)
      └── /chat/last     ← 客户端重定向到最近一次活跃会话
  └── /knowledge         ← 上传 / 列表 / 删除 / 重新索引
  └── /about             ← 关于页

Next.js Route Handlers(src/app/api/)— web 与 mobile 客户端共用
  ├── POST /api/chat                          ← 检索 → LLM → SSE 流式返回
  ├── GET/POST /api/documents                 ← 列表 / 上传 + 异步索引
  ├── GET/PATCH/DELETE /api/documents/[id]
  ├── POST /api/documents/[id]/index          ← 确认上传完成,加入索引队列
  ├── POST /api/documents/[id]/reindex
  ├── POST /api/documents/prepare             ← 创建 pending 文档 + Supabase 签名上传 URL
  ├── POST /api/ingest-hook                   ← Supabase Storage webhook(pg_net 触发 → 索引文档)
  ├── GET/POST /api/sessions                  ← 会话列表 CRUD
  ├── GET/PATCH/DELETE /api/sessions/[id]     ← 单个会话 CRUD
  └── GET /api/health

Service Layer(src/lib/)
  server/
  ├── data/            documents.ts, sessions.ts — 数据库查询辅助函数
  ├── services/        delete-document.ts
  ├── db/              client.ts — Prisma 单例
  ├── ingest/          解析 → 语义切分 → embedding → pgvector($executeRaw);索引在独立 worker 线程中执行
  ├── retrieval/       检测语言 → 翻译 + HyDE → embedding → 向量检索 → 重排
  ├── llm/             provider 抽象(claude.ts, deepseek.ts, router.ts, providers.ts, truncate.ts, prompts.ts)
  ├── embeddings/      bge.ts — 本地 bge-m3 单例 + getEmbeddingsBatch()
  ├── lang/            detect.ts — franc-min 封装
  ├── storage/         index.ts — Supabase Storage 辅助函数
  ├── supabase/        server.ts(service-role client)
  ├── route-policy.ts  侧边栏可见性分类
  └── logger.ts        服务端 logger
  client/
  ├── session-api.ts   会话 API 封装 + ChatSession / Message 类型
  ├── documents-api.ts 文档 API 封装
  ├── last-chat.ts     sessionStorage 辅助(last-chat-id,LAST_CHAT key)
  ├── swr.ts           共用 SWR fetcher
  └── constants.ts     客户端常量(STORAGE_KEYS 等)
  shared/
  ├── schemas/         Zod schema:chat.ts, document.ts, session.ts(web 自己的一份拷贝 — 见下方"与 packages/shared 的关系")
  ├── config.ts        核心常量(TOP_K、CHUNK_SIZE、POLL_INTERVAL_MS 等)
  ├── form-utils.ts    表单相关辅助函数
  └── utils.ts         通用工具函数

PostgreSQL + pgvector
```

---

## 与 packages/shared 的关系

`apps/web` **不**引用 `@faq-rag/shared`,而是在 `src/lib/shared/schemas/` 保留了同一套 schema 的独立拷贝。原因:web 版的 schema 需要引入 server-only 的值(例如 `src/lib/server/llm/providers.ts` 的 `PROVIDER` 常量作为默认值),而 `packages/shared` 是给 `apps/mobile` 用的纯前端包,不能依赖任何 app 的代码。

**改动 chat/document/session 的 schema 形状时,必须同时更新两处**:本目录的 `src/lib/shared/schemas/*` 和 `../../packages/shared/src/schemas/*`,并保持枚举值、默认值一致 —— 目前没有类型层面的机制强制这一点。完整背景见 `../../packages/shared/AGENTS.md`。

---

## 数据模型

```
Document        id (uuid), name, mime, content_hash, lang, size_bytes,
                status (pending|uploaded|indexing|indexed|failed), error_msg, total_chunks,
                file_path (Prisma 字段名: fileRef), created_at
                @@unique([contentHash])
                @@index([createdAt])  @@index([status])

Chunk           id (uuid), document_id → Document(级联删除), ord,
                content, embedding vector(1024), lang, created_at
                @@index([documentId])
                embedding 上有 HNSW 索引(通过原生迁移添加,m=16, ef_construction=64)

Session         id (uuid), title, created_at, updated_at
                @@index([updatedAt])

SessionMessage  id (uuid), session_id → Session(级联删除), role (user|assistant),
                content, citations (Json?), created_at
```

`embedding` 在 Prisma 中是 `Unsupported("vector(1024)")`。所有向量写入都用 `prisma.$executeRaw` 配合 `::vector` 类型转换。向量检索使用余弦距离(`<=>`),范围覆盖所有已索引文档。Schema 文件位于 `prisma/schema.prisma`。

---

## 会话持久化

会话数据存储在 **PostgreSQL**(`Session` + `SessionMessage` 表),web 与 mobile 共用同一套 `/api/sessions` 接口。

```ts
interface ChatSession {
  id: string;
  title: string; // 从首条用户消息自动生成(60 字符)
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}
```

- localStorage 只存 `chat:last`(最近访问的会话 ID);`src/lib/chat-storage.ts` 封装了会话 API。
- 超过 2 天的会话会在 layout mount 时清理(`pruneOldSessions` 调用 `DELETE /api/sessions/[id]`)。
- `ChatSidebar` 通过 SWR 拉取 `GET /api/sessions` 的会话列表;任何写操作之后通过 SWR `mutate()` 触发刷新 —— 不使用自定义事件。
- 在 `/chat/new` 页面,`chatId` prop 为 `null`;发送首条消息时生成 UUID,并将 URL 替换为 `/chat/<id>`。
- `ChatWindow` 通过 SWR 拉取会话(`/api/sessions/${chatId}`,`revalidateIfStale: false`);导航时读缓存,重新进入某个会话不会触发网络请求。
- `ChatSidebar` 的会话列表在 `chat/layout.tsx` 中做服务端预取,并通过 `SWRBootstrap.tsx` 注入为 SWR 的 `fallback` —— 水合后立即可见,无 loading 闪烁。

---

## 跨语言检索流程

1. 检测用户提问的语言(`franc-min`)
2. 通过 DeepSeek 将提问翻译为另一种语言(失败则优雅降级 → 使用原始提问)
3. 通过 DeepSeek 生成假设性答案(HyDE,失败则优雅降级 → null)
4. 用 bge-m3 并行 embedding 三个变体 → 最多三个 1024 维向量
5. 对每个向量并行执行 `vectorSearch` → 合并、去重、按余弦分数排序
6. Cross-encoder 重排(`bge-reranker-base`)→ 取 top-N chunks
7. 将 chunks 作为 `<context>` 注入 LLM prompt

---

## 摄取(Ingestion)流水线

`ingestBuffer`(API 上传路径)— 先写文件到磁盘并立即返回,再异步经 `processDocument` 索引。

`ingestFile`(CLI 路径)— 同步端到端执行。

两者都遵循:SHA-256 去重 → 解析 → 检测语言 → 语义切分(余弦边界;失败时降级到 `RecursiveCharacterTextSplitter`)→ 逐 chunk embedding → `$executeRaw` INSERT(带 `::vector`)→ 更新 `status`。

索引在服务启动时创建的持久化 **worker 线程**(`src/lib/server/ingest/indexing-worker.ts`)中执行。主线程通过 `indexing-queue.ts` 里的 `enqueueIndexing()` 派发任务。服务启动钩子(`instrumentation.ts`)会恢复上次重启前遗留的 `pending` 文档。云端模式(`IS_CLOUD`)下改为在请求处理函数内联执行索引 —— 详见"关键约定"。

---

## LLM Provider 抽象

```ts
// src/lib/server/llm/types.ts
interface LLMProvider {
  name: "claude" | "deepseek";
  chat(params: { system: string; messages: Msg[] }): AsyncIterable<string>;
}
```

```ts
// src/lib/server/llm/providers.ts
export const PROVIDER = { CLAUDE: "claude", DEEPSEEK: "deepseek", OPENAI: "openai" } as const;
export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];
export const PROVIDER_LABEL: Record<Provider, string> = {
  claude: "Claude",
  deepseek: "DeepSeek",
  openai: "OpenAI",
};
```

`router.ts` 中的 `getProvider(name)` 在 name 无法识别或为 undefined 时返回 `claudeProvider`。Web UI 的默认值由 `NEXT_PUBLIC_DEFAULT_PROVIDER` 决定(`.env.example` 默认 `claude`)。`/api/chat` 的 `bodySchema` 在未传 provider 时降级为 `PROVIDER.DEEPSEEK`。

`/api/chat` 用 SSE 流式返回 `provider.chat(...)` 的 token,web 端用基于 `fetch` 的 reader 消费,mobile 端用 `apps/mobile/src/lib/api/chat.ts`(同样依赖 `eventsource-parser`)消费,两端解析逻辑一致。`retrieval/query.ts` 中的查询扩展(翻译 + HyDE)独立使用 DeepSeek 或 OpenAI client,与聊天所用的 provider 无关。

LLM 调用前会通过 `truncate.ts` 截断历史 —— 在 token 预算内(估算为 `length / 4`)保留最近的对话轮次,并去掉开头残留的 assistant 轮次。

三个 provider 均支持环境变量覆盖模型:`ANTHROPIC_MODEL`、`DEEPSEEK_MODEL`、`OPENAI_MODEL`。默认值分别为 `claude-sonnet-4-6`、`deepseek-chat`、`gpt-4o-mini`。

**Web UI**:Claude、DeepSeek、OpenAI 均可在 `ProviderSelect` 中选择。

---

## UI 尺寸体系(web 端落地)

修改排版、间距、布局宽度、移动端侧边栏/头部行为或 shadcn 组件尺寸之前,先读 `../../docs/ui-system.md`(仓库根目录)。Tailwind v4 的 UI token 保持在 `src/app/globals.css`,通用控件尺寸放在 `src/components/ui/*`,产品特定的尺寸放到对应的 feature 组件里。不要为了尺寸 token 单独添加传统的 `tailwind.config.ts`(本项目使用 Tailwind v4 的 CSS-first 配置)。

---

## 关键约定

- **pgvector 写入**:始终使用 `prisma.$executeRaw` 配合 `${vec}::vector`。不要直接用 Prisma Client 操作 `embedding` 列。
- **pdf-parse v2 API**:`new PDFParse({ data: buffer })` 然后 `.getText()` —— 不是 v1 那种默认导出函数。
- **mammoth import**:`const { default: mammoth } = await import("mammoth")` —— Jest mock 需要带 `__esModule: true`。
- **测试中的动态 import**:mock factory 必须包含 `__esModule: true`,以配合 `esModuleInterop` 正确 interop。
- **摄取是异步的**:`POST /api/documents` 立即返回文档 ID;索引在后台 worker 线程执行,需轮询 `status` 字段。
- **System prompt**:用英文书写,避免让 LLM 偏向某种特定的回复语言。
- **localStorage 仅限客户端**:`chat-storage.ts` 只用 localStorage 存 `chat:last`,完整会话数据在 PostgreSQL(mobile 端用 `AsyncStorage` 存等价 key,见 `../mobile/AGENTS.md`)。
- **会话同步**:任何会话写操作之后,调用 `swrMutate("/api/sessions")`(列表)**并且** `swrMutate(\`/api/sessions/${id}\`, updated, { revalidate: false })`(单会话缓存)—— 不要派发自定义事件。漏更新单会话 key 会导致返回某个会话时读到旧数据。
- **校验错误**:`ZodError` 使用 `validationErrorResponse(error)` —— 返回 `{ error: "Validation failed", fieldErrors: ... }`,状态码 400。
- **批量 embedding**:多文本场景用 `getEmbeddingsBatch(texts[])`(语义切分器中使用);单文本场景用 `getEmbedding(text)`。
- **限流**:`src/lib/rate-limit.ts` 中的 `checkRateLimit(key, limit, windowMs)` —— 仅内存实现,非分布式。
- **Embedding 路由**:`embeddings/router.ts` 中的 `getEmbedding()` / `getEmbeddingsBatch()` 根据 `IS_CLOUD`(即 `EMBEDDING_PROVIDER === "openai"`)分发到 bge-m3 或 OpenAI。始终从 `router.ts` 导入,不要直接导入 `bge.ts`。
- **云端模式(`IS_CLOUD`)**:为 true 时,`instrumentation.ts` 跳过 worker 线程(索引改为在请求处理函数内联执行),并限制上传文件不超过 50 KB。
- **Cross-encoder 已禁用**:`retrieval/query.ts` 中的 `rerankChunks` 被注释掉,改用 `deduplicateAndSort` 的余弦排序。如需启用需取消注释,并注意 ONNX 模型的冷启动延迟。
- **`fileRef` 字段的双重语义**:Prisma 字段 `fileRef` 映射到数据库列 `file_path`。本地模式下存本地文件系统路径;云端模式(Supabase Storage)下存 storage 对象路径(`embed/{docId}/{sanitizedFilename}`)。`storage/index.ts` 中的 `readUploadedFile` / `saveUploadedFile` 封装了这层差异。
- **云端上传流程**:客户端(web 或 mobile)调用 `POST /api/documents/prepare` → 得到 `{ docId, signedUrl, token }` → PUT 到 Supabase Storage → `POST /api/documents/{docId}/index` 确认并加入索引队列。
- **Schema 重复维护**:见上方"与 packages/shared 的关系" —— `src/lib/shared/schemas/*` 与 `../../packages/shared/src/schemas/*` 需手动保持同步,无构建期检查。

---

## 重要文件位置

| 路径                                             | 说明                                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `proxy.ts`                                       | Next.js 16 中间件 —— 将 `/` 重定向到 `/chat/last`,其余路由放行                      |
| `src/app/layout.tsx`                             | 根布局 —— 不传递任何鉴权状态,渲染 `<Providers>`                                     |
| `src/app/providers.tsx`                          | 客户端外壳 —— `AppLayout` 渲染侧边栏/顶栏                                           |
| `src/app/api/chat/route.ts`                      | 聊天接口 —— 检索 + LLM 流式返回(SSE)                                                |
| `src/app/api/documents/prepare/route.ts`         | POST:校验文件、创建 pending 文档、返回 Supabase 签名上传 URL                        |
| `src/app/api/documents/[id]/index/route.ts`      | POST:确认上传完成,加入索引队列                                                      |
| `src/app/api/sessions/route.ts`                  | 会话列表 —— GET(列表)/ POST(创建)                                                   |
| `src/app/api/sessions/[id]/route.ts`             | 单个会话 —— GET / PATCH(标题 + 消息)/ DELETE                                        |
| `src/app/chat/layout.tsx`                        | 聊天布局 —— 异步 SC,经 `listSessions` 预取会话列表,子组件包裹在 `<SWRBootstrap>` 中 |
| `src/components/chat/SWRBootstrap.tsx`           | 客户端组件,用 `<SWRConfig fallback>` 将服务端预取的会话列表水合进 SWR               |
| `src/app/chat/[id]/page.tsx`                     | 渲染 ChatWindow,chatId 来自 URL(无服务端水合)                                       |
| `src/app/chat/new/page.tsx`                      | 渲染 ChatWindow,chatId=null                                                         |
| `src/app/chat/last/page.tsx`                     | 客户端重定向到最近一次活跃会话                                                      |
| `src/app/knowledge/page.tsx`                     | 知识库页 —— 上传 + 文档列表                                                         |
| `src/app/about/page.tsx`                         | 关于页                                                                              |
| `src/components/layout/TopBar.tsx`               | 全局顶栏 —— 品牌、导航、provider 选择、主题切换                                     |
| `src/components/layout/AppSidebar.tsx`           | 全局侧边栏 —— `/chat/*` 下展示会话列表,其它页面展示 About 链接                      |
| `src/context/page-title-context.tsx`             | 聊天页副标题 context(ChatWindow → TopBar)                                           |
| `src/context/provider-context.tsx`               | LLM provider context(从 ChatWindow 中提升上来)                                      |
| `src/lib/chat-storage.ts`                        | 会话 API 封装(upsertSession、deleteSession、pruneOld…)                              |
| `src/lib/shared/config.ts`                       | 核心常量(TOP_K、CHUNK_SIZE、POLL_INTERVAL_MS 等)                                    |
| `src/lib/rate-limit.ts`                          | 基于内存的按 IP 限流                                                                |
| `src/lib/server/llm/providers.ts`                | PROVIDER 常量 + PROVIDER_LABEL                                                      |
| `src/lib/server/llm/router.ts`                   | LLM provider 选择逻辑(默认 Claude)                                                  |
| `src/lib/server/llm/truncate.ts`                 | 基于 token 预算的历史截断(保留最近对话,估算 ≤6000)                                  |
| `src/lib/server/llm/openai.ts`                   | OpenAI GPT provider(默认 `gpt-4o-mini`)                                             |
| `src/lib/server/llm/clients.ts`                  | 共用 LLM client 单例(deepseekClient、openaiClient)                                  |
| `src/lib/server/embeddings/router.ts`            | Embedding 分发:本地 bge-m3 vs OpenAI,依据 `IS_CLOUD`                                |
| `src/lib/server/embeddings/openai-embed.ts`      | OpenAI `text-embedding-3-small` —— 单条 + 批量                                      |
| `src/lib/server/storage/index.ts`                | Supabase Storage 辅助函数:保存 / 读取 / 删除上传的文件                              |
| `src/lib/server/supabase/server.ts`              | Supabase service-role client                                                        |
| `src/lib/server/retrieval/query.ts`              | 检索编排:翻译 + HyDE + embedding +(重排)                                            |
| `src/lib/server/retrieval/vector-search.ts`      | pgvector 余弦检索(`<=>`)                                                            |
| `src/lib/server/retrieval/rerank.ts`             | 候选 chunks 去重 + 按分数排序                                                       |
| `src/lib/server/retrieval/cross-encoder.ts`      | Cross-encoder 重排(bge-reranker-base,sigmoid/softmax)                               |
| `src/lib/server/ingest/pipeline.ts`              | 摄取流水线(解析 → 分块 → embedding → 存储)                                          |
| `src/lib/server/ingest/parse.ts`                 | 文件解析器(md/txt/pdf/docx)                                                         |
| `src/lib/server/ingest/split.ts`                 | 分块入口 —— 语义切分器,带固定长度兜底                                               |
| `src/lib/server/ingest/semantic-splitter.ts`     | 基于 embedding 余弦边界检测的语义分块                                               |
| `src/lib/server/ingest/indexing-worker.ts`       | Worker 线程入口 —— 只加载一次模型,通过 IPC 处理文档                                 |
| `src/lib/server/ingest/indexing-queue.ts`        | 主线程接口:`enqueueIndexing(docId, filePath)`                                       |
| `src/lib/server/embeddings/bge.ts`               | bge-m3 单例 —— `getEmbedding()` + `getEmbeddingsBatch()`                            |
| `instrumentation.ts` / `instrumentation.node.ts` | 服务启动钩子 —— 恢复 pending 文档、预热 worker 线程                                 |
| `src/components/chat/ChatWindow.tsx`             | 主聊天 UI —— SSE 流式接收、会话水合、发送逻辑                                       |
| `src/components/chat/ChatSidebar.tsx`            | 会话列表 —— 新建/重命名/删除/导出/导航                                              |
| `src/components/chat/CitationDrawer.tsx`         | 底部抽屉,展示引用来源详情                                                           |
| `src/components/chat/MessageBubble.tsx`          | 消息渲染 —— Markdown、可折叠的引用来源列表                                          |
| `src/components/chat/ProviderSelect.tsx`         | Provider 下拉选择(Claude / DeepSeek / OpenAI)                                       |
| `src/app/api/ingest-hook/route.ts`               | Supabase Storage webhook —— 校验密钥,触发索引                                       |
| `scripts/setup-webhook.ts`                       | CLI:读写 `app.ingest_config`(hook_url、hook_secret)                                 |
| `prisma/schema.prisma`                           | 数据库 schema(Document、Chunk、Session、SessionMessage)                             |
| `jest.config.ts`                                 | Jest + ts-jest 配置(CJS 模式,`types: ["jest","node"]`)                              |
