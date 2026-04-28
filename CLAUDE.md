@AGENTS.md

# Project: FAQ RAG

A local FAQ question-answering system. Users upload documents (Chinese or English), ask questions in either language, and receive streamed answers with cited source chunks.

---

## Tech Stack

| Layer           | Choice                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) + React 19 + TypeScript                                               |
| UI              | Tailwind CSS + shadcn/ui (components in `components/ui/`)                                     |
| Database        | PostgreSQL 16 + pgvector via Docker                                                           |
| ORM             | Prisma (`prisma/schema.prisma`)                                                               |
| Embedding       | `Xenova/bge-m3` via `@huggingface/transformers` — local, multilingual, 1024-dim               |
| LLM default     | DeepSeek `deepseek-chat` via `openai` SDK (`baseURL: https://api.deepseek.com`)               |
| LLM alternate   | Claude `claude-sonnet-4-6` via `@anthropic-ai/sdk` (default when no provider specified)       |
| Text splitting  | Semantic chunking (embedding cosine boundary detection) + `@langchain/textsplitters` fallback |
| Reranking       | `Xenova/bge-reranker-base` cross-encoder via `@huggingface/transformers`                      |
| Package manager | pnpm                                                                                          |
| Language detect | `franc-min`                                                                                   |
| File parsing    | pdf-parse v2 (`PDFParse` class), mammoth (docx), native fs (md/txt)                           |
| Testing         | Jest + ts-jest                                                                                |

---

## Architecture

```
Browser
  └── / → redirect to /chat/new
  └── /chat/layout       ← passthrough (global layout lives in providers.tsx)
      ├── /chat/new      ← ChatWindow with chatId=null (new ephemeral session)
      ├── /chat/[id]     ← ChatWindow with chatId from URL
      └── /chat/last     ← client redirect to last active chat
  └── /knowledge         ← upload / list / delete / reindex
  └── /about             ← public info page (no auth required)

Next.js Route Handlers (src/app/api/)
  ├── POST /api/chat                        ← retrieve → LLM → SSE stream
  ├── GET/POST /api/documents               ← list, upload + async index
  ├── GET/DELETE /api/documents/[id]
  ├── POST /api/documents/[id]/reindex
  ├── GET/POST /api/sessions                ← session list CRUD
  ├── GET/PATCH/DELETE /api/sessions/[id]   ← single session CRUD
  └── GET /api/health

Service Layer (src/lib/)
  ├── chat-storage.ts  session CRUD (localStorage for last-chat-id only; full sessions stored in DB)
  ├── ingest/          parse → semantic split → embed → pgvector ($executeRaw); worker thread isolated
  ├── retrieval/       detect lang → translate + HyDE → embed → vector search → cross-encoder rerank
  ├── llm/             provider abstraction (claude.ts, deepseek.ts, router.ts, providers.ts, truncate.ts)
  ├── embeddings/      bge.ts — local bge-m3 singleton + getEmbeddingsBatch()
  └── lang/            detect.ts — franc-min wrapper

PostgreSQL + pgvector
```

---

## Data Models

```
Document  id (uuid), name, mime, content_hash (unique SHA-256), lang,
          size_bytes, status (pending|indexed|failed), error_msg, total_chunks, created_at
          @@index([status])

Chunk     id (uuid), document_id → Document (cascade delete), ord,
          content, embedding vector(1024), lang, created_at
          @@index([documentId])
          HNSW index on embedding (applied via raw migration, m=16, ef_construction=64)

Session        id (uuid), title, created_at, updated_at
               @@index([updatedAt])

SessionMessage id (uuid), session_id → Session (cascade delete), role (user|assistant),
               content, citations (Json?), created_at
```

`embedding` is `Unsupported("vector(1024)")` in Prisma. All vector writes use `prisma.$executeRaw` with `::vector` cast. Vector search uses cosine distance (`<=>`).

---

## Chat Session Persistence

Sessions are stored in **PostgreSQL** (`Session` + `SessionMessage` tables). `chat-storage.ts` wraps the session API (`GET/POST/PATCH/DELETE /api/sessions`).

localStorage stores only `chat:last` (the last-visited session ID) to restore state across page loads.

```ts
interface ChatSession {
  id: string;
  title: string; // auto-set from first user message (60 chars)
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

- Sessions older than 2 days are pruned on layout mount (`pruneOldSessions` calls `DELETE /api/sessions/[id]`).
- `ChatSidebar` fetches session list via `GET /api/sessions` and subscribes to `chat-session-updated` custom events dispatched after writes.
- On `/chat/new`, `chatId` prop is `null`; a UUID is generated at send-time and the URL is replaced with `/chat/<id>` after the first message.
- `ChatWindow` receives `initialSession` hydrated server-side via `GET /api/sessions/[id]`.

---

## Cross-language Retrieval Flow

1. Detect source language of the user query (`franc-min`)
2. Translate query to the other language via DeepSeek (fails gracefully → original query)
3. Generate a hypothetical answer (HyDE) via DeepSeek (fails gracefully → null)
4. Embed all three variants in parallel with bge-m3 → up to three 1024-dim vectors
5. Run parallel `vectorSearch` for each vector → merge, deduplicate, sort by cosine score
6. Cross-encoder rerank (`bge-reranker-base`) → top-N chunks
7. Inject chunks as `<context>` into the LLM prompt

---

## Ingestion Pipeline

`ingestBuffer` (API upload path) — writes file to disk, returns immediately, indexes async via `processDocument`.

`ingestFile` (CLI path) — synchronous end-to-end.

Both: SHA-256 dedup → parse → detect lang → semantic split (cosine boundary; falls back to `RecursiveCharacterTextSplitter`) → embed each chunk → `$executeRaw` INSERT with `::vector` → update `status`.

Indexing runs in a persistent **worker thread** (`src/lib/ingest/indexing-worker.ts`) spawned at server startup. Main thread dispatches via `enqueueIndexing()` in `indexing-queue.ts`. Server startup (`instrumentation.ts`) resumes any `pending` documents left over from prior restarts.

---

## LLM Provider Abstraction

```ts
// src/lib/llm/types.ts
interface LLMProvider {
  name: "claude" | "deepseek";
  chat(params: { system: string; messages: Msg[] }): AsyncIterable<string>;
}
```

```ts
// src/lib/llm/providers.ts
export const PROVIDER = { CLAUDE: "claude", DEEPSEEK: "deepseek" } as const;
export type Provider = (typeof PROVIDER)[keyof typeof PROVIDER];
export const PROVIDER_LABEL: Record<Provider, string> = { claude: "Claude", deepseek: "DeepSeek" };
```

`getProvider(name)` in `router.ts` returns `claudeProvider` by default; pass `"deepseek"` for DeepSeek. `/api/chat` uses SSE to stream tokens from `provider.chat(...)`.

History is truncated before the LLM call via `truncate.ts` — keeps the most recent turns within a token budget (estimated as `length / 4`), then drops any leading assistant turn.

Both providers respect `process.env.ANTHROPIC_MODEL` / `process.env.DEEPSEEK_MODEL` to override the model name. Defaults are `claude-sonnet-4-6` and `deepseek-chat` respectively.

**UI**: Both Claude and DeepSeek are selectable in `ProviderSelect`.

---

## Key Conventions

- **pgvector writes**: always use `prisma.$executeRaw` with `${vec}::vector`. Never use Prisma Client directly for the `embedding` column.
- **pdf-parse v2 API**: `new PDFParse({ data: buffer })` then `.getText()` — NOT a default-export function like v1.
- **mammoth import**: `const { default: mammoth } = await import("mammoth")` — needs `__esModule: true` in Jest mocks.
- **Dynamic imports in tests**: mock factories must include `__esModule: true` for correct `esModuleInterop` interop.
- **Ingestion is async**: `POST /api/documents` returns the document ID immediately; indexing runs in the background in a worker thread. Poll `status` field.
- **System prompt**: written in English to avoid biasing the LLM toward any specific response language.
- **localStorage is client-only**: `chat-storage.ts` uses localStorage only for `chat:last`. Full session data is in PostgreSQL.
- **Session sync**: after any session write (API call), dispatch `new CustomEvent("chat-session-updated")` so `ChatSidebar` re-renders.
- **Batch embedding**: use `getEmbeddingsBatch(texts[])` for multi-text embedding (used in semantic splitter). `getEmbedding(text)` is for single-text cases.
- **Rate limiting**: `checkRateLimit(key, limit, windowMs)` in `src/lib/rate-limit.ts` — in-memory only, not distributed.

---

## Important File Locations

| Path                                             | Purpose                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `proxy.ts`                                       | Next.js 16 middleware — auth guard (public: /auth/signin, /about) |
| `src/app/layout.tsx`                             | Root layout — async, reads session, passes isAuthenticated        |
| `src/app/providers.tsx`                          | Client shell — TopBar + AppSidebar + contexts + TooltipProvider   |
| `src/app/api/chat/route.ts`                      | Chat endpoint — retrieval + LLM streaming (SSE)                   |
| `src/app/api/sessions/route.ts`                  | Session list — GET (list) / POST (create)                         |
| `src/app/api/sessions/[id]/route.ts`             | Single session — GET / PATCH (title + messages) / DELETE          |
| `src/app/chat/layout.tsx`                        | Chat layout — passthrough `<>{children}</>`                       |
| `src/app/chat/[id]/page.tsx`                     | Renders ChatWindow for a specific session (server-hydrated)       |
| `src/app/chat/new/page.tsx`                      | Renders ChatWindow with chatId=null                               |
| `src/app/chat/last/page.tsx`                     | Client redirect to last active chat                               |
| `src/app/knowledge/page.tsx`                     | Knowledge base — upload + document list                           |
| `src/app/about/page.tsx`                         | Public about page — no auth required                              |
| `src/components/layout/TopBar.tsx`               | Global top bar — brand, nav, provider select, theme, auth         |
| `src/components/layout/AppSidebar.tsx`           | Global sidebar — chat sessions on /chat/\*, About link elsewhere  |
| `src/context/page-title-context.tsx`             | Chat subtitle context (ChatWindow → TopBar)                       |
| `src/context/provider-context.tsx`               | LLM provider context (lifted from ChatWindow)                     |
| `src/lib/chat-storage.ts`                        | Session API wrappers (upsertSession, deleteSession, pruneOld…)    |
| `src/lib/config.ts`                              | Central constants (TOP_K, CHUNK_SIZE, POLL_INTERVAL_MS, etc.)     |
| `src/lib/rate-limit.ts`                          | In-memory IP-based rate limiting                                  |
| `src/lib/llm/providers.ts`                       | PROVIDER const + PROVIDER_LABEL                                   |
| `src/lib/llm/router.ts`                          | LLM provider selection (Claude default)                           |
| `src/lib/llm/truncate.ts`                        | Token-budget history truncation (keeps recent turns, ≤6000 est.)  |
| `src/lib/llm/clients.ts`                         | Shared LLM client singletons (deepseekClient)                     |
| `src/lib/retrieval/query.ts`                     | Retrieval orchestration: translate + HyDE + embed + rerank        |
| `src/lib/retrieval/vector-search.ts`             | pgvector cosine search (`<=>`)                                    |
| `src/lib/retrieval/rerank.ts`                    | Deduplicate + sort candidate chunks by score                      |
| `src/lib/retrieval/cross-encoder.ts`             | Cross-encoder reranking (bge-reranker-base, sigmoid/softmax)      |
| `src/lib/ingest/pipeline.ts`                     | Ingestion pipeline (parse → chunk → embed → store)                |
| `src/lib/ingest/parse.ts`                        | File parser (md/txt/pdf/docx)                                     |
| `src/lib/ingest/split.ts`                        | Chunking entry point — semantic splitter with fixed fallback      |
| `src/lib/ingest/semantic-splitter.ts`            | Semantic chunking via embedding cosine boundary detection         |
| `src/lib/ingest/indexing-worker.ts`              | Worker thread entry — loads models once, processes docs via IPC   |
| `src/lib/ingest/indexing-queue.ts`               | Main-thread interface: `enqueueIndexing(docId, filePath)`         |
| `src/lib/embeddings/bge.ts`                      | bge-m3 singleton — `getEmbedding()` + `getEmbeddingsBatch()`      |
| `instrumentation.ts` / `instrumentation.node.ts` | Server startup hook — resume pending docs, warm worker thread     |
| `src/components/chat/ChatWindow.tsx`             | Main chat UI — SSE streaming, session hydration, send logic       |
| `src/components/chat/ChatSidebar.tsx`            | Session list — create/rename/delete/export/navigate               |
| `src/components/chat/CitationDrawer.tsx`         | Bottom drawer for citation detail view                            |
| `src/components/chat/MessageBubble.tsx`          | Message rendering — Markdown, inline citation superscripts        |
| `src/components/chat/ProviderSelect.tsx`         | Provider dropdown (Claude + DeepSeek both selectable)             |
| `prisma/schema.prisma`                           | DB schema (Document, Chunk, Session, SessionMessage)              |
| `jest.config.ts`                                 | Jest + ts-jest config (CJS mode, `types: ["jest","node"]`)        |
