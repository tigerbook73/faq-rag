@AGENTS.md

# Project: FAQ RAG

A local FAQ question-answering system. Users upload documents (Chinese or English), ask questions in either language, and receive streamed answers with cited source chunks.

---

## Tech Stack

| Layer           | Choice                                                                                  |
| --------------- | --------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) + React 19 + TypeScript                                         |
| UI              | Tailwind CSS + shadcn/ui (components in `components/ui/`)                               |
| Database        | PostgreSQL 16 + pgvector via Docker                                                     |
| ORM             | Prisma (`prisma/schema.prisma`)                                                         |
| Embedding       | `Xenova/bge-m3` via `@huggingface/transformers` — local, multilingual, 1024-dim         |
| LLM default     | DeepSeek `deepseek-chat` via `openai` SDK (`baseURL: https://api.deepseek.com`)         |
| LLM alternate   | Claude `claude-sonnet-4-6` via `@anthropic-ai/sdk` (default when no provider specified) |
| Text splitting  | `@langchain/textsplitters` RecursiveCharacterTextSplitter                               |
| Package manager | pnpm                                                                                    |
| Language detect | `franc-min`                                                                             |
| File parsing    | pdf-parse v2 (`PDFParse` class), mammoth (docx), native fs (md/txt)                     |
| Testing         | Jest + ts-jest                                                                          |

---

## Architecture

```
Browser
  └── / → redirect to /chat/new
  └── /chat/layout       ← SidebarProvider + ChatSidebar + pruneOldSessions
      ├── /chat/new      ← ChatWindow with chatId=null (new ephemeral session)
      ├── /chat/[id]     ← ChatWindow with chatId from URL
      └── /chat/last     ← client redirect to last active chat
  └── /knowledge         ← upload / list / delete / reindex

Next.js Route Handlers (app/api/)
  ├── POST /api/chat           ← retrieve → LLM → SSE stream
  ├── GET/POST /api/documents  ← list, upload + async index
  ├── GET/DELETE /api/documents/[id]
  ├── POST /api/documents/[id]/reindex
  └── GET /api/health

Service Layer (src/lib/)
  ├── chat-storage.ts  localStorage session persistence (CRUD + prune)
  ├── ingest/          parse → split → embed → pgvector ($executeRaw)
  ├── retrieval/       detect lang → translate query → dual embed → vector search → rerank
  ├── llm/             provider abstraction (claude.ts, deepseek.ts, router.ts, providers.ts)
  ├── embeddings/      bge.ts — local bge-m3 singleton
  └── lang/            detect.ts — franc-min wrapper

PostgreSQL + pgvector
```

---

## Data Models

```
Document  id (uuid), name, mime, content_hash (unique SHA-256), lang,
          size_bytes, status (pending|indexed|failed), error_msg, created_at

Chunk     id (uuid), document_id → Document (cascade delete), ord,
          content, embedding vector(1024), lang, created_at
```

`embedding` is `Unsupported("vector(1024)")` in Prisma. All vector writes use `prisma.$executeRaw` with `::vector` cast. Vector search uses cosine distance (`<=>`).

---

## Chat Session Persistence

Sessions are stored in **localStorage** (client-side only). Key shape: `chat:<uuid>` per session, `chat:last` for the last-visited session ID.

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

- Sessions older than 2 days are pruned on layout mount (`pruneOldSessions`).
- `ChatSidebar` subscribes to session changes via `useSyncExternalStore` + a `chat-session-updated` custom event dispatched after every write.
- On `/chat/new`, `chatId` prop is `null`; a UUID is generated at send-time and the URL is replaced with `/chat/<id>` after the first message.

---

## Cross-language Retrieval Flow

1. Detect source language of the user query (`franc-min`)
2. Translate query to the other language via DeepSeek (fails gracefully)
3. Embed both queries with bge-m3 → two 1024-dim vectors
4. Run parallel `vectorSearch` → merge, deduplicate, sort by cosine score → take top-N chunks
5. Inject chunks as `<context>` into the LLM prompt

---

## Ingestion Pipeline

`ingestBuffer` (API upload path) — writes file to disk, returns immediately, indexes async via `processDocument`.

`ingestFile` (CLI path) — synchronous end-to-end.

Both: SHA-256 dedup → parse → detect lang → split → embed each chunk → `$executeRaw` INSERT with `::vector` → update `status`.

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

**UI note**: `ProviderSelect` currently renders the Claude option as `disabled` — DeepSeek is the only selectable provider in the UI even though the server-side router supports both.

---

## Key Conventions

- **pgvector writes**: always use `prisma.$executeRaw` with `${vec}::vector`. Never use Prisma Client directly for the `embedding` column.
- **pdf-parse v2 API**: `new PDFParse({ data: buffer })` then `.getText()` — NOT a default-export function like v1.
- **mammoth import**: `const { default: mammoth } = await import("mammoth")` — needs `__esModule: true` in Jest mocks.
- **Dynamic imports in tests**: mock factories must include `__esModule: true` for correct `esModuleInterop` interop.
- **Ingestion is async**: `POST /api/documents` returns the document ID immediately; indexing runs in the background. Poll `status` field.
- **System prompt**: written in English to avoid biasing the LLM toward any specific response language.
- **localStorage is client-only**: all `chat-storage` functions guard with `isClient()` check; never call them during SSR.
- **Session sync**: after any localStorage write, dispatch `new CustomEvent("chat-session-updated")` so `ChatSidebar` re-renders.

---

## Important File Locations

| Path                                     | Purpose                                                     |
| ---------------------------------------- | ----------------------------------------------------------- |
| `app/api/chat/route.ts`                  | Chat endpoint — retrieval + LLM streaming                   |
| `app/chat/layout.tsx`                    | Chat layout — SidebarProvider, ChatSidebar, session pruning |
| `app/chat/[id]/page.tsx`                 | Renders ChatWindow for a specific session                   |
| `app/chat/new/page.tsx`                  | Renders ChatWindow with chatId=null                         |
| `app/chat/last/page.tsx`                 | Client redirect to last active chat                         |
| `src/lib/chat-storage.ts`                | localStorage session CRUD + prune logic                     |
| `src/lib/llm/providers.ts`               | PROVIDER const + PROVIDER_LABEL                             |
| `src/lib/llm/router.ts`                  | LLM provider selection (Claude default)                     |
| `src/lib/retrieval/query.ts`             | Cross-language retrieval orchestration                      |
| `src/lib/ingest/pipeline.ts`             | Ingestion pipeline (parse → chunk → embed → store)          |
| `src/lib/ingest/parse.ts`                | File parser (md/txt/pdf/docx)                               |
| `src/lib/embeddings/bge.ts`              | Local bge-m3 embedding (singleton)                          |
| `src/components/chat/ChatWindow.tsx`     | Main chat UI — SSE streaming, session hydration, send logic |
| `src/components/chat/ChatSidebar.tsx`    | Session list sidebar with create/delete/navigate            |
| `src/components/chat/CitationDrawer.tsx` | Bottom drawer for citation detail view                      |
| `src/components/chat/MessageBubble.tsx`  | Message rendering — Markdown, inline citation superscripts  |
| `src/components/chat/ProviderSelect.tsx` | Provider dropdown (DeepSeek selectable, Claude disabled)    |
| `prisma/schema.prisma`                   | DB schema                                                   |
| `jest.config.ts`                         | Jest + ts-jest config (CJS mode, `types: ["jest","node"]`)  |
