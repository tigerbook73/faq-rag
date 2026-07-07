# apps/web — @faq-rag/web

Next.js 16 应用,同时提供 Web UI 和所有后端 API route。`apps/mobile` 依赖这里的 `/api/*`;改 API 合同时必须同步检查 mobile 与 `packages/shared`。

以下路径相对于 `apps/web/`。

## 必读约束

- Next.js 16 不是训练数据里的旧 Next。写 Next 代码前读 `node_modules/next/dist/docs/` 中对应主题,不要凭记忆使用旧 API。
- Route Handlers、Server Components、middleware/proxy 相关改动要按当前版本文档实现。
- 共享 schema/常量从 `@faq-rag/shared` 导入;不要在 web 内重新手写 chat/document/session schema。

## 命令

```bash
pnpm dev        # next dev -H 0.0.0.0
pnpm lint       # tsc --noEmit && eslint --fix
pnpm typecheck
pnpm test       # Jest/ts-jest, **/*.test.ts
pnpm e2e        # Playwright,默认排除真实 API/慢测/生产冒烟
pnpm verify     # lint + format + build + test + e2e:full
```

常用专项:

```bash
npx jest path/to/file.test.ts
npx playwright test e2e/specs/some.spec.ts
pnpm sb:start | pnpm sb:stop | pnpm sb:status
pnpm db:migrate | pnpm db:reset | pnpm db:studio
```

## 架构定位

- `src/app/api/*`: web 与 mobile 共用的 HTTP API。
- `src/lib/server/*`: 数据库、摄取、检索、embedding、LLM、Storage 等服务端逻辑。
- `src/lib/client/*`: 浏览器端 API 封装、SWR fetcher、会话/草稿相关客户端状态。
- `src/context/embed-service-context.tsx`: 客户端驱动 indexing 文档继续调用 `/embed` 的断点续跑入口。
- `prisma/schema.prisma`: PostgreSQL + pgvector 数据模型;向量列是 `Unsupported("vector(1024)")`。

## 会话与客户端状态

完整会话数据在 PostgreSQL(`Session` + `SessionMessage`),web/mobile 共用 `/api/sessions`。

- `last-chat.ts`: 用 `sessionStorage` 存 `chat:last`。
- `useChatWindow.ts`: 用 `localStorage` 存 `chat:draft:<id>`,用 `sessionStorage` 存 `chat:scroll:<id>`。
- 写会话后同时更新 SWR 列表 key `/api/sessions` 和单会话 key `/api/sessions/${id}`;不要派发自定义事件。
- `/chat/new` 不提前创建 session;发送第一条消息后生成 UUID 并替换到 `/chat/<id>`。

## 摄取与上传

当前唯一上传路径:

1. `POST /api/documents/prepare` 创建 pending 文档并返回 Supabase signed URL。
2. 客户端 PUT 到 Supabase Storage。
3. `POST /api/documents/{id}/index` 只解析+切分,写入无 embedding chunks,状态到 `indexing`。
4. 客户端循环 `POST /api/documents/{id}/embed`,直到 `remaining === 0` 后状态到 `indexed`。

不要恢复旧的服务端 worker / `instrumentation.ts` 启动续跑模型。`ingest-hook` 只作为 Storage webhook 兜底入口。

## 检索、Embedding、LLM

- Embedding 统一从 `src/lib/server/embeddings/router.ts` 导入,不要直接用 `bge.ts`。
- 批量文本用 `getEmbeddingsBatch`;单个查询用 `getEmbedding`。
- pgvector 写入必须用 `prisma.$executeRaw` + `::vector`,不要用 Prisma Client 直接写 `embedding`。
- Reranker 由 `ENABLE_RERANKER` 控制,开启会动态加载 cross-encoder,注意冷启动成本。
- System prompt 用英文,避免让模型偏向某种回答语言。
- Provider 默认值分两层:shared schema 兜底与 UI 初始选择互不影响,详见 `../../packages/shared/AGENTS.md`。

## 文件解析与测试坑点

- `pdf-parse` v2 用 `new PDFParse({ data: buffer }).getText()`,不是 v1 默认导出函数。
- `mammoth` 动态 import 用 `const { default: mammoth } = await import("mammoth")`;Jest mock 需 `__esModule: true`。
- Zod 校验错误统一走 `validationErrorResponse(error)`。
- 真实 provider/embedding 的 Playwright 测试是 opt-in;普通 `pnpm e2e` 不应命中真实 API。

## UI

改尺寸、布局或 shadcn 组件前先读 `../../docs/ui-system.md`。Tailwind v4 token 在 `src/app/globals.css`;不要为 web 添加传统 `tailwind.config.ts`。
