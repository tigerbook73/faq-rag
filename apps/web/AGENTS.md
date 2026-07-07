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

| 层次         | 选型                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 框架         | Next.js 16(App Router)+ React 19 + TypeScript                                                                                                    |
| UI           | Tailwind CSS + shadcn/ui(组件位于 `src/components/ui/`)                                                                                          |
| 数据库       | PostgreSQL 16 + pgvector,本地经 Docker,远程用 Supabase Cloud                                                                                     |
| ORM          | Prisma(`prisma/schema.prisma`)                                                                                                                   |
| Embedding    | `Xenova/bge-m3`(本地,1024 维)**或** `text-embedding-3-small`(OpenAI)— 通过 `EMBEDDING_PROVIDER` 环境变量切换,经 `embeddings/router.ts` 分发      |
| LLM provider | Claude `claude-sonnet-4-6`(默认)· DeepSeek `deepseek-chat` · OpenAI `gpt-4o-mini` — UI 中均可选,默认值由 `NEXT_PUBLIC_DEFAULT_PROVIDER` 决定     |
| 存储         | Supabase Storage — 上传文件存于 `documents` bucket,经 `src/lib/server/storage/index.ts`                                                          |
| 文本切分     | 固定长度切分(`RecursiveCharacterTextSplitter`,md 用 `MarkdownTextSplitter`)—— `@langchain/textsplitters`,chunk size/overlap 见 `config.chunking` |
| 重排         | `Xenova/bge-reranker-base` cross-encoder — 实现于 `cross-encoder.ts`,由 `ENABLE_RERANKER` 环境变量开关(`.env.example` 默认 `false`)              |
| 语言检测     | `franc-min`                                                                                                                                      |
| 文件解析     | pdf-parse v2(`PDFParse` 类)、mammoth(docx)、原生 fs(md/txt)                                                                                      |
| 测试         | Jest + ts-jest + Playwright                                                                                                                      |

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
  ├── GET /api/documents                      ← 分页列表
  ├── GET/PATCH/DELETE /api/documents/[id]
  ├── POST /api/documents/prepare             ← 创建 pending 文档 + Supabase 签名上传 URL(唯一上传入口)
  ├── POST /api/documents/[id]/index          ← 确认上传完成,解析 + 切分,写入无 embedding 的 chunks(status → indexing)
  ├── POST /api/documents/[id]/embed          ← 客户端循环调用,按批补齐 chunk embedding,remaining=0 时 status → indexed
  ├── POST /api/documents/[id]/reindex        ← 与 index 相同的解析 + 切分,用于重新索引
  ├── POST /api/ingest-hook                   ← Supabase Storage webhook(pg_net 触发,与 /index 幂等竞争同一次解析+切分,兜底客户端未确认的情况)
  ├── GET/POST /api/sessions                  ← 会话列表 CRUD
  ├── GET/PATCH/DELETE /api/sessions/[id]     ← 单个会话 CRUD
  └── GET /api/health

Service Layer(src/lib/)
  server/
  ├── data/            documents.ts, sessions.ts — 数据库查询辅助函数
  ├── services/        delete-document.ts
  ├── db/              client.ts — Prisma 单例
  ├── ingest/          解析 → 固定长度切分 → 写入无 embedding 的 chunks;embedding 由客户端循环调用 /api/documents/[id]/embed 批量补齐
  ├── retrieval/       检测语言 → 翻译 + HyDE → embedding → 向量检索 → 重排
  ├── llm/             provider 抽象(claude.ts, deepseek.ts, openai.ts, router.ts, truncate.ts, prompts.ts)
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
  ├── config.ts        核心常量(TOP_K、CHUNK_SIZE 等;chat/document/session schema 已迁至 @faq-rag/shared,见下方"与 packages/shared 的关系")
  ├── form-utils.ts    表单相关辅助函数
  └── utils.ts         通用工具函数

PostgreSQL + pgvector
```

---

## 与 packages/shared 的关系

`apps/web` 直接引用 `@faq-rag/shared`(chat/document/session 的 Zod schema、`ChatSession`/`toSession()`、`PROVIDER`/`PROVIDER_LABEL`/`DEFAULT_PROVIDER`、数值常量、`STORAGE_KEYS` 均来自该包),不再维护本地拷贝。`provider` 的默认值分两层(API 校验兜底 vs. UI 初始选中,互不影响),完整说明见 `../../packages/shared/AGENTS.md`。

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
6. `ENABLE_RERANKER` 开启时,Cross-encoder 重排(`bge-reranker-base`)→ 取 top-N chunks;否则直接按余弦分数截断 top-N
7. 将 chunks 作为 `<context>` 注入 LLM prompt

---

## 摄取(Ingestion)流水线

上传统一走 `POST /api/documents/prepare` → Supabase 签名 URL 上传 → `POST /api/documents/[id]/index`(或 `/reindex`)两段式,详见下方"上传流程"约定。

`parseAndSplitDocument`(`ingest/pipeline.ts`)— `/index`、`/reindex`、`ingest-hook` 三个入口共用:解析 → 检测语言 → 固定长度切分(`splitText`/`splitTextMarkdown`)→ 写入 `chunks` 表(不含 embedding)→ `status: "indexing"`。

embedding 由**客户端**驱动补齐:`EmbedServiceProvider`(`src/context/embed-service-context.tsx`)对处于 `indexing` 状态的文档循环调用 `POST /api/documents/[id]/embed`(每次一批,默认 20 条),直到 `remaining === 0` 才把 `status` 置为 `indexed`。该 context 挂载时还会扫描 `GET /api/documents`,对任何仍卡在 `indexing` 的文档自动续跑 —— 这是当前的"断点续传"机制,取代了旧版依赖服务端 worker 线程 + `instrumentation.ts` 的启动时恢复。

`ingestFile`(`scripts/ingest.ts` 的 CLI 路径,唯一使用方)— 同步端到端执行:SHA-256 去重 → 解析 → 检测语言 → 固定长度切分 → 逐 chunk embedding(`embedBatchForIndexing`)→ `$executeRaw` INSERT(带 `::vector`)→ 更新 `status`。

---

## LLM Provider 抽象

`LLMProvider` 接口(`name` + `chat()`)定义在 `src/lib/server/llm/types.ts`;`PROVIDER`/`PROVIDER_LABEL`/`DEFAULT_PROVIDER` 定义在 `packages/shared/src/constants/providers.ts`。`router.ts` 中的 `getProvider(name)` 在 name 无法识别或为 undefined 时返回 `claudeProvider`。`provider` 默认值的两层逻辑(API 校验兜底 vs. UI 初始选中)见上方"与 packages/shared 的关系"。

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
- **摄取是异步的**:`/index`(或 `/reindex`)只做解析+切分就返回,`status` 先到 `indexing`;真正补齐 embedding 由客户端循环调用 `/embed` 完成,`status` 才变 `indexed`。知识库列表需要轮询/SWR 刷新 `status` 才能反映进度。
- **System prompt**:用英文书写,避免让 LLM 偏向某种特定的回复语言。
- **localStorage 仅限客户端**:`chat-storage.ts` 只用 localStorage 存 `chat:last`,完整会话数据在 PostgreSQL(mobile 端用 `AsyncStorage` 存等价 key,见 `../mobile/AGENTS.md`)。
- **会话同步**:任何会话写操作之后,调用 `swrMutate("/api/sessions")`(列表)**并且** `swrMutate(\`/api/sessions/${id}\`, updated, { revalidate: false })`(单会话缓存)—— 不要派发自定义事件。漏更新单会话 key 会导致返回某个会话时读到旧数据。
- **校验错误**:`ZodError` 使用 `validationErrorResponse(error)` —— 返回 `{ error: "Validation failed", fieldErrors: ... }`,状态码 400。
- **批量 embedding**:多文本场景用 `getEmbeddingsBatch(texts[])`(`/api/documents/[id]/embed` 补齐 chunk embedding 时使用);CLI 摄取(`ingestFile`)走 `embedBatchForIndexing`(本地 ONNX 分批 + event-loop yield);单文本场景(检索时的查询 embedding)用 `getEmbedding(text)`。
- **限流**:`src/lib/rate-limit.ts` 中的 `checkRateLimit(key, limit, windowMs)` —— 仅内存实现,非分布式。
- **Embedding 路由**:`embeddings/router.ts` 中的 `getEmbedding()` / `getEmbeddingsBatch()` 根据 `config.embedding.useOpenAI`(即 `EMBEDDING_PROVIDER === "openai"`)分发到 bge-m3 或 OpenAI。始终从 `router.ts` 导入,不要直接导入 `bge.ts`。
- **上传大小上限**:同样由 `config.embedding.useOpenAI` 决定 —— true 时用 `MAX_UPLOAD_BYTES_CLOUD`(50 KB),否则 `MAX_UPLOAD_BYTES_LOCAL`(1 MB),常量来自 `@faq-rag/shared`,在 `/api/documents/prepare` 中校验。
- **Cross-encoder 由环境变量开关**:`retrieval/query.ts` 中 `config.retrieval.enableReranker`(即 `ENABLE_RERANKER`,`.env.example` 默认 `false`)为 true 时才动态 `import("./cross-encoder")` 调用 `rerankChunks`;否则直接用 `deduplicateAndSort` 的余弦排序截断。启用需注意 ONNX 模型的冷启动延迟。
- **`fileRef` 字段**:Prisma 字段 `fileRef` 映射到数据库列 `file_path`,存 Supabase Storage 对象路径(`embed/{docId}/{sanitizedFilename}`)。`storage/index.ts` 中的 `readUploadedFile` / `saveUploadedFile` 均直接操作 Supabase Storage(无本地文件系统分支)。CLI 摄取(`ingestFile`)例外 —— 它把本地磁盘路径写入 `fileRef`,该路径不会被 `readUploadedFile` 读取,仅用于一次性建库。
- **上传流程**:客户端(web 或 mobile)调用 `POST /api/documents/prepare` → 得到 `{ docId, signedUrl, token }` → PUT 到 Supabase Storage → `POST /api/documents/{docId}/index` 触发解析+切分(`status → indexing`)→ 客户端循环调用 `POST /api/documents/{docId}/embed` 直到补齐全部 embedding(`status → indexed`)。这是当前唯一的上传路径,不再区分本地/云端。
