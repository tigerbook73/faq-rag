# 基于知识库的 FAQ 问答系统 — Claude Code 项目生成计划（PostgreSQL + Prisma 版）

本文档是提交给 Claude Code 的完整项目需求与实施规范。请按"项目结构 → 阶段任务"顺序逐步生成代码。

---

## 1. 项目目标

构建一个本地运行的 FAQ RAG（Retrieval-Augmented Generation）问答系统：

- 用户将中/英文知识文档（Markdown、TXT、PDF、DOCX）导入系统。
- 用户可以用中文或英文提问，系统从知识库中检索相关片段并生成带引用来源的回答。
- 知识库源文档可以是单一语言（中或英），提问语言不一定与源一致，系统需在跨语言场景下仍能准确检索。
- 提供知识库管理 UI（上传 / 列表 / 删除 / 重新索引）。
- LLM 默认使用 Claude，用户可在 UI 上切换到 DeepSeek。

**非目标：** 生产级部署、多用户鉴权、SaaS 化、移动端、流媒体附件。

---

## 2. 运行环境

| 项       | 约定                                                                    |
| -------- | ----------------------------------------------------------------------- |
| 操作系统 | Windows 11 + WSL2 (Ubuntu)                                              |
| 编辑器   | VSCode (Remote - WSL 扩展)                                              |
| Node.js  | ≥ 20 LTS                                                                |
| Python   | 3.11+（仅用于 PDF/DOCX 解析脚本，可选）                                 |
| 数据库   | PostgreSQL 16，启用 pgvector 扩展                                       |
| 容器     | 使用 `docker compose` 启动 Postgres（不容器化 Node 进程，方便本地调试） |
| 包管理   | pnpm                                                                    |

所有命令都假设在 WSL 终端中执行；项目仓库路径建议放在 WSL 原生文件系统（如 `~/projects/faq-rag`）以避免跨 FS 性能问题。

---

## 3. 技术栈

### 3.1 前端

- **Next.js 15**（App Router）+ React 19 + TypeScript
- **Tailwind CSS** + **shadcn/ui**（组件库）
- **TanStack Query**（前端数据获取、缓存）
- **react-markdown** + **rehype-highlight**（渲染回答与引用片段）
- **react-dropzone**（文件上传）

### 3.2 后端

- Next.js Route Handlers（`app/api/*`）统一承载 API，不另起服务
- **Prisma ORM**（schema 定义、迁移、类型安全查询）
- **Zod** 做请求/响应校验

### 3.3 数据层

- **PostgreSQL 16** + **pgvector**（向量检索）
- **pg_trgm**（可选，关键词辅助检索，用于混合检索）
- Prisma Client 通过 `$queryRaw` / `$executeRaw` 处理 pgvector 的向量列及相似度查询

> **pgvector 与 Prisma 的协作方式**
> Prisma 目前不原生支持 `vector` 类型，采用以下约定：
>
> - `prisma/schema.prisma` 中将 `embedding` 列声明为 `Unsupported("vector(1024)")`
> - 向量写入（INSERT/UPDATE）通过 `prisma.$executeRaw` + `::vector` 类型转换完成
> - 向量检索（SELECT + cosine distance）通过 `prisma.$queryRaw` 返回 typed 结果
> - 其余所有 CRUD 操作（documents 表、chunks 的非向量字段）均使用 Prisma Client 标准 API

### 3.4 LLM / Embedding

- **Claude**（默认）：`claude-sonnet-4-6` via `@anthropic-ai/sdk`
- **DeepSeek**（可切换）：`deepseek-chat` via `openai` SDK（`baseURL: https://api.deepseek.com`）
- **Embedding 模型**：`BAAI/bge-m3`（多语言，支持中英文跨语言检索）
  - 本地通过 `@xenova/transformers` 运行，避免调用外部 API
  - 向量维度 **1024**
- **分词/切片**：`langchain/text_splitter` 的 `RecursiveCharacterTextSplitter`

### 3.5 文档解析

- **Markdown / TXT**：原生字符串读取
- **PDF**：`pdf-parse`（Node）
- **DOCX**：`mammoth`（Node，提取纯文本）

---

## 4. 系统架构

```
┌────────────────────────────────────────────────────────┐
│                   Next.js (App Router)                 │
│                                                        │
│  ┌──────────────────┐          ┌──────────────────┐    │
│  │  前端 UI         │◀────────▶│  Route Handlers  │    │
│  │  - Chat 页       │  fetch   │  - /api/chat     │    │
│  │  - KB 管理页     │          │  - /api/documents│    │
│  └──────────────────┘          └────────┬─────────┘    │
│                                         │              │
│                                         ▼              │
│                          ┌──────────────────────────┐  │
│                          │      Service Layer       │  │
│                          │  - Ingestion Pipeline    │  │
│                          │  - Retriever             │  │
│                          │  - LLM Router            │  │
│                          └──────┬──────────┬────────┘  │
└─────────────────────────────────┼──────────┼───────────┘
                                  ▼          ▼
                        ┌──────────────┐  ┌────────────────┐
                        │ Postgres 16  │  │ LLM Providers  │
                        │ + pgvector   │  │ Claude /       │
                        │ (Prisma ORM) │  │ DeepSeek       │
                        └──────────────┘  └────────────────┘
```

---

## 5. 核心模块设计

### 5.1 文档摄取 Pipeline（Ingestion）

触发时机：用户在 UI 上传文件后，或命令行 `pnpm ingest <path>`。

流程：

1. **上传**：文件保存到 `./data/uploads/<documentId>/<filename>`
2. **解析**：按扩展名调用对应解析器，得到纯文本
3. **语言检测**：用 `franc` 判断源文档主语言（zh/en），存入 `documents.lang`
4. **切片**：`RecursiveCharacterTextSplitter`，`chunk_size=800`，`overlap=120`
5. **向量化**：调用本地 bge-m3 获取 embedding
6. **入库**：写入 `documents` 与 `chunks` 表
7. **幂等性**：以 `sha256(fileContent)` 作为 `documents.content_hash`，同 hash 不重复入库

### 5.2 跨语言检索策略（关键）

由于源文档可能是中或英，而提问也可能是中或英，采用 **Query 改写 + bge-m3 多语言向量** 的组合：

1. **Query 多语言扩展**：将原始问题用轻量 LLM（DeepSeek）翻译成另一种语言，得到 `queryZh` 和 `queryEn`
2. **双向量召回**：对两个 query 分别求 embedding，各自在 pgvector 中取 top-K（K=8），合并去重
3. **Rerank**：按 cosine distance 排序，取 top-6（一期跳过专用 reranker）
4. **上下文拼接**：top-6 片段作为 context 注入 LLM prompt

```ts
// src/lib/retrieval/query.ts 核心逻辑
const [embZh, embEn] = await Promise.all([getEmbedding(queryZh), getEmbedding(queryEn)]);
const [resZh, resEn] = await Promise.all([vectorSearch(embZh, 8), vectorSearch(embEn, 8)]);
const merged = deduplicateAndSort([...resZh, ...resEn]).slice(0, 6);
```

向量检索使用 `$queryRaw`：

```ts
// src/lib/retrieval/vector-search.ts
export async function vectorSearch(embedding: number[], topK: number) {
  const vec = `[${embedding.join(",")}]`;
  return prisma.$queryRaw<ChunkRow[]>`
    SELECT
      id, document_id, ord, content, lang,
      1 - (embedding <=> ${vec}::vector) AS score
    FROM chunks
    ORDER BY embedding <=> ${vec}::vector
    LIMIT ${topK}
  `;
}
```

### 5.3 LLM 路由层（Provider 抽象）

```ts
// src/lib/llm/types.ts
interface LLMProvider {
  name: "claude" | "deepseek";
  chat(params: { system: string; messages: Msg[]; stream?: boolean }): AsyncIterable<string>;
}
```

- `src/lib/llm/claude.ts` — 基于 `@anthropic-ai/sdk`
- `src/lib/llm/deepseek.ts` — 基于 `openai` SDK（`baseURL: https://api.deepseek.com`）
- `src/lib/llm/router.ts` — 根据 UI 传入的 `provider` 字段选择实现，默认 `claude`

**回答 Prompt 模板（system）：**

```
你是一个严格基于提供的知识片段回答问题的 FAQ 助手。
- 只使用 <context> 中的信息作答，不要编造。
- 如果 context 中没有足够信息，请明确回答「知识库中未找到相关信息」。
- 回答使用用户提问的语言。
- 每个关键论点后用 [^n] 标注引用编号，n 对应 context 中片段的编号。
```

**User 消息中以 XML 包裹 context：**

```
<context>
[1] (source: handbook.md) ...文本...
[2] (source: policy.pdf#p3) ...文本...
</context>

问题: {{userQuestion}}
```

### 5.4 引用来源（Citations）

- LLM 回答中 `[^n]` 标注由前端解析并在回答末尾渲染 footnotes
- 每个 citation 展示：文件名、片段预览（前 200 字）、点击弹出引用片段抽屉

后端响应结构：

```ts
{
  answer: string,
  citations: [
    {
      id: number,
      documentId: string,
      documentName: string,
      chunkId: string,
      preview: string,
      score: number
    }
  ],
  provider: 'claude' | 'deepseek'
}
```

---

## 6. 数据库设计

### 6.1 启用扩展（`prisma/migrations/0_init/migration.sql` 手动前置）

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 6.2 Prisma Schema（`prisma/schema.prisma`）

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector, pg_trgm]
}

model Document {
  id           String   @id @default(uuid())
  name         String
  mime         String
  contentHash  String   @unique @map("content_hash")
  lang         String   @default("unknown")
  sizeBytes    Int      @map("size_bytes")
  status       String   @default("pending") // pending | indexed | failed
  errorMsg     String?  @map("error_msg")
  createdAt    DateTime @default(now()) @map("created_at")
  chunks       Chunk[]

  @@map("documents")
}

model Chunk {
  id         String                      @id @default(uuid())
  documentId String                      @map("document_id")
  ord        Int
  content    String
  // vector(1024) — Prisma Unsupported，写入/读取均用 $queryRaw / $executeRaw
  embedding  Unsupported("vector(1024)")?
  lang       String                      @default("unknown")
  createdAt  DateTime                    @default(now()) @map("created_at")
  document   Document                    @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@map("chunks")
}
```

### 6.3 索引（迁移 SQL 中手动追加）

```sql
-- HNSW 向量索引（cosine）
CREATE INDEX chunks_embedding_idx ON chunks
  USING hnsw (embedding vector_cosine_ops);

-- 全文模糊检索（可选，混合召回用）
CREATE INDEX chunks_content_trgm_idx ON chunks
  USING gin (content gin_trgm_ops);
```

> **注意**：Prisma 迁移不会自动生成 `Unsupported` 列的索引，需在迁移 SQL 文件中手动补充上述两条 `CREATE INDEX`。

### 6.4 向量写入方式

由于 `embedding` 是 `Unsupported` 类型，插入 chunk 需拆分为两步：

```ts
// 1. 先用 Prisma Client 创建 chunk（不含 embedding）
const chunk = await prisma.chunk.create({
  data: { id, documentId, ord, content, lang },
});

// 2. 再用 $executeRaw 写入 embedding
const vec = `[${embedding.join(",")}]`;
await prisma.$executeRaw`
  UPDATE chunks SET embedding = ${vec}::vector WHERE id = ${chunk.id}
`;
```

或者使用单条 `$executeRaw` 批量 INSERT（性能更佳，推荐用于摄取 pipeline）：

```ts
await prisma.$executeRaw`
  INSERT INTO chunks (id, document_id, ord, content, lang, embedding)
  VALUES (
    ${id}::uuid, ${documentId}::uuid, ${ord}, ${content}, ${lang},
    ${vec}::vector
  )
`;
```

---

## 7. API 设计

所有 API 在 `app/api/*/route.ts`，使用 Zod 校验。

| 方法     | 路径                         | 说明                                              |
| -------- | ---------------------------- | ------------------------------------------------- |
| `POST`   | `/api/documents`             | 上传并异步索引文档（multipart）                   |
| `GET`    | `/api/documents`             | 分页列出文档（Prisma findMany + count）           |
| `DELETE` | `/api/documents/:id`         | 删除文档及 chunks（Cascade 自动处理）             |
| `POST`   | `/api/documents/:id/reindex` | 重新切片并向量化                                  |
| `POST`   | `/api/chat`                  | 提问，SSE 流式返回 answer + citations             |
| `GET`    | `/api/health`                | 检查 DB 连通性（`prisma.$queryRaw\`SELECT 1\`` ） |

---

## 8. 前端页面

### 8.1 `/`（Chat 页）

- **顶部**：Provider 切换下拉（Claude / DeepSeek）
- **中部**：对话流，AI 回答中 `[^n]` 渲染为可点击角标，点击弹出引用片段抽屉
- **底部**：输入框 + 发送按钮，支持 `Cmd/Ctrl+Enter`

### 8.2 `/knowledge`（知识库管理页）

- 文件拖拽上传区（react-dropzone，支持 `.md .txt .pdf .docx`）
- 文档表格：名称、语言、chunks 数、状态、上传时间、操作（重新索引 / 删除）
- 状态实时刷新（TanStack Query polling，每 3 秒刷新 `pending` 文档）
- 右上角：全局「重建索引」按钮

---

## 9. 项目结构

```
faq-rag/
├─ app/
│  ├─ (chat)/page.tsx
│  ├─ knowledge/page.tsx
│  ├─ api/
│  │  ├─ chat/route.ts
│  │  ├─ documents/route.ts
│  │  ├─ documents/[id]/route.ts
│  │  └─ documents/[id]/reindex/route.ts
│  ├─ layout.tsx
│  └─ globals.css
├─ src/
│  ├─ components/
│  │  ├─ chat/ChatWindow.tsx
│  │  ├─ chat/MessageBubble.tsx
│  │  ├─ chat/CitationDrawer.tsx
│  │  ├─ chat/ProviderSelect.tsx
│  │  ├─ knowledge/UploadZone.tsx
│  │  └─ knowledge/DocumentTable.tsx
│  ├─ lib/
│  │  ├─ db/
│  │  │  └─ client.ts          # Prisma Client 单例（防止 dev 热重载重复实例化）
│  │  ├─ llm/
│  │  │  ├─ claude.ts
│  │  │  ├─ deepseek.ts
│  │  │  ├─ router.ts
│  │  │  └─ types.ts
│  │  ├─ embeddings/
│  │  │  └─ bge.ts             # @xenova/transformers 本地 bge-m3 封装
│  │  ├─ ingest/
│  │  │  ├─ parse.ts           # pdf/docx/md/txt 解析
│  │  │  ├─ split.ts           # RecursiveCharacterTextSplitter
│  │  │  └─ pipeline.ts        # 摄取编排（解析→切片→向量化→入库）
│  │  ├─ retrieval/
│  │  │  ├─ vector-search.ts   # $queryRaw 向量相似度检索
│  │  │  ├─ query.ts           # Query 改写 + 双路召回
│  │  │  └─ rerank.ts          # top-k 合并去重
│  │  └─ lang/
│  │     └─ detect.ts          # franc 语言检测
│  └─ server/
│     └─ actions.ts
├─ prisma/
│  ├─ schema.prisma            # 数据模型定义
│  └─ migrations/              # prisma migrate dev 自动生成
│     └─ 0_init/
│        └─ migration.sql      # 手动追加 pgvector 扩展 + HNSW 索引
├─ scripts/
│  └─ ingest.ts                # CLI: pnpm ingest ./docs
├─ docker-compose.yml          # postgres + pgvector
├─ .env.example
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
└─ README.md
```

> **与 Drizzle 版的结构差异**：
>
> - 删除 `drizzle.config.ts`、`src/lib/db/schema.ts`
> - 新增 `prisma/schema.prisma`（统一承载 schema + 迁移）
> - `src/lib/db/client.ts` 改为 Prisma Client 单例

---

## 10. Prisma Client 单例（防热重载泄漏）

```ts
// src/lib/db/client.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## 11. 环境变量（`.env.example`）

```env
# 数据库（Prisma 使用 DATABASE_URL）
DATABASE_URL=postgresql://faq:faq@localhost:5432/faq

# LLM
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-6
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_MODEL=deepseek-chat

# Embedding
EMBEDDING_MODEL=Xenova/bge-m3
EMBEDDING_DIM=1024

# 文件上传
UPLOAD_DIR=./data/uploads
```

---

## 12. `docker-compose.yml`

```yaml
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: faq
      POSTGRES_PASSWORD: faq
      POSTGRES_DB: faq
    ports:
      - "5432:5432"
    volumes:
      - ./data/pg:/var/lib/postgresql/data
    restart: unless-stopped
```

> 不再需要 `init-db.sql` 初始化脚本——pgvector 扩展和 pg_trgm 扩展通过 Prisma 迁移文件（`migration.sql` 手动追加）或 `schema.prisma` 的 `extensions` 字段启用，Docker 只负责启动干净的 Postgres 实例。

---

## 13. 常用 Prisma 命令速查

```bash
# 生成 Prisma Client（schema 变更后执行）
pnpm prisma generate

# 创建并应用新迁移（开发环境）
pnpm prisma migrate dev --name <migration-name>

# 仅应用已有迁移（CI / 生产）
pnpm prisma migrate deploy

# 打开 Prisma Studio（可视化查看数据）
pnpm prisma studio

# 重置数据库（危险！开发用）
pnpm prisma migrate reset
```

---

## 14. 实施阶段（建议 Claude Code 按此顺序生成）

### 阶段 0 — 脚手架

- 初始化 Next.js 15 + TS + Tailwind + shadcn/ui
- 配置 pnpm / eslint / prettier
- 启动 `docker compose up -d`，验证 Postgres 可连接

### 阶段 1 — 数据层

- 编写 `prisma/schema.prisma`（Document + Chunk，含 `Unsupported("vector(1024)")` ）
- 手动编写初始迁移 SQL：`CREATE EXTENSION IF NOT EXISTS vector`、`CREATE EXTENSION IF NOT EXISTS pg_trgm`、HNSW 索引
- 运行 `pnpm prisma migrate dev --name init`，验证表结构
- 实现 Prisma Client 单例 `src/lib/db/client.ts`
- 健康检查接口 `/api/health` 跑通（`prisma.$queryRaw\`SELECT 1\``）

**Smoke test：**

```bash
pnpm prisma studio   # 打开浏览器，确认 documents / chunks 表存在
```

### 阶段 2 — Embedding 与摄取

- 实现本地 bge-m3 封装（`@xenova/transformers`）
- 实现 parse / split / pipeline（含 `$executeRaw` 批量写入向量）
- CLI `pnpm ingest ./sample-docs` 跑通，数据入库

**Smoke test：**

```bash
pnpm ingest ./sample-docs
pnpm prisma studio   # 确认 chunks 表有数据且 embedding 列非 null
```

### 阶段 3 — 检索

- 实现 `vectorSearch`（`$queryRaw` cosine distance）
- Query 改写（调用 DeepSeek 翻译）
- 双路召回 + top-k 合并去重
- **单元测试**：给中文问题，检索英文源文档，top-k 覆盖预期片段

### 阶段 4 — LLM 路由 + `/api/chat`

- Claude / DeepSeek provider 实现
- SSE 流式返回
- 引用解析（`[^n]` → citations 数组）

### 阶段 5 — 前端 Chat 页

- ChatWindow + MessageBubble + CitationDrawer
- Provider 切换

### 阶段 6 — 知识库管理页

- 上传（multipart → pipeline）
- 文档列表（`prisma.document.findMany` + count）
- 删除（`prisma.document.delete`，Cascade 自动清理 chunks）
- 重索引

### 阶段 7 — 打磨

- 空态、错误态、loading skeleton
- README 写清楚完整启动步骤

---

## 15. 关键决策说明（给 Claude Code 的澄清）

1. **为什么用 Prisma 而非 Drizzle？** Prisma 的 `schema.prisma` 是单一可信数据源，迁移工具链成熟，Studio 可视化调试体验好，类型安全层更完整；Drizzle 更灵活但配置分散，对 pgvector `Unsupported` 类型的处理方式与 Prisma 类似，没有明显优势。

2. **pgvector 与 Prisma 的兼容方式**：`Unsupported("vector(1024)")` + `$queryRaw` / `$executeRaw` 是当前社区推荐的标准做法，无需引入额外 Prisma 插件。

3. **为什么用 bge-m3 而不是 OpenAI embedding**：多语言（中英）表现显著更好，且本地运行零成本、零外部依赖，契合"本地探索"目标。

4. **为什么用 pgvector 而不是独立向量库（Pinecone/Weaviate）**：单库即可，简化部署，Prisma + pgvector 的组合在开发体验上与纯关系型操作几乎无缝。

5. **为什么 Next.js Route Handlers 而非独立 Nest/Express**：单体前后端，减少进程与端口管理，更符合本地探索场景。

6. **流式**：`/api/chat` 返回 SSE，前端用 `fetch` ReadableStream 消费（不用 `EventSource`，因为需要 POST body）。

7. **HNSW 索引**：Prisma 迁移不会自动为 `Unsupported` 列生成索引，需在初始 `migration.sql` 中手动追加 `CREATE INDEX ... USING hnsw`，这是必须步骤，否则向量检索会走全表扫描。

---

## 16. 验收标准（DoD）

- [ ] `docker compose up -d && pnpm dev` 一键启动，浏览器打开 `http://localhost:3000` 可用
- [ ] `pnpm prisma studio` 可看到 `documents` / `chunks` 表结构
- [ ] 在 `/knowledge` 上传 1 份中文 PDF + 1 份英文 Markdown，状态变为 `indexed`
- [ ] 用英文问中文文档里的问题、用中文问英文文档里的问题，均能返回相关答案并带引用
- [ ] 切换 Provider 后，回答由不同模型产生（response 的 `provider` 字段正确）
- [ ] 删除文档后，Cascade 自动清理 chunks，再次提问时该来源不再出现在引用中

---

## 17. 给 Claude Code 的起手提示词

```
按 `FAQ-RAG-Project-Plan-Prisma.md` 的"阶段 0"开始。
先在当前目录创建 `faq-rag/` 子目录并初始化脚手架；
每完成一个阶段，运行对应的 smoke test 并在终端里汇报结果后再进入下一阶段。
遇到需要我决策的技术选型请停下来问我，不要自作主张替换文档中指定的库。

数据库：PostgreSQL 16 + pgvector（Docker）
ORM：Prisma（schema.prisma + prisma migrate）
向量列处理：Unsupported("vector(1024)") + $queryRaw / $executeRaw
Embedding：@xenova/transformers bge-m3（本地，1024 维）
LLM：Claude（默认）/ DeepSeek（可切换）
```
