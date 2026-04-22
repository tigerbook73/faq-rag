@AGENTS.md

# Project: FAQ RAG

A local FAQ question-answering system. Users upload documents (Chinese or English), ask questions in either language, and receive streamed answers with cited source chunks.

---

## Tech Stack

| Layer           | Choice                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Framework       | Next.js 16 (App Router) + React 19 + TypeScript                                                              |
| UI              | Tailwind CSS + shadcn/ui (components in `components/ui/`)                                                    |
| Database        | PostgreSQL 16 + pgvector via Docker                                                                          |
| ORM             | Prisma (`prisma/schema.prisma`)                                                                              |
| Embedding       | `Xenova/bge-m3` via `@huggingface/transformers` — local, multilingual, 1024-dim                              |
| LLM default     | DeepSeek `deepseek-chat` via `openai` SDK (`baseURL: https://api.deepseek.com`)                              |
| LLM alternate   | Claude `claude-sonnet-4-6` via `@anthropic-ai/sdk` (currently disabled — commented out in the provider enum) |
| Text splitting  | `@langchain/textsplitters` RecursiveCharacterTextSplitter                                                    |
| Package manager | pnpm                                                                                                         |
| Language detect | `franc-min`                                                                                                  |
| File parsing    | pdf-parse v2 (`PDFParse` class), mammoth (docx), native fs (md/txt)                                          |
| Testing         | Jest + ts-jest                                                                                               |

---

## Architecture

```
Browser
  └── / (ChatWindow)          ← SSE streaming, citation markers
  └── /knowledge (KB page)    ← upload / list / delete / reindex

Next.js Route Handlers (app/api/)
  ├── POST /api/chat           ← retrieve → LLM → SSE stream
  ├── GET/POST /api/documents  ← list, upload + async index
  ├── GET/DELETE /api/documents/[id]
  ├── POST /api/documents/[id]/reindex
  └── GET /api/health

Service Layer (src/lib/)
  ├── ingest/     parse → split → embed → pgvector ($executeRaw)
  ├── retrieval/  detect lang → translate query → dual embed → vector search → rerank
  ├── llm/        provider abstraction (claude.ts, deepseek.ts, router.ts)
  ├── embeddings/ bge.ts — local bge-m3 singleton
  └── lang/       detect.ts — franc-min wrapper

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

`getProvider(name)` in `router.ts` returns the right implementation. `/api/chat` uses SSE to stream tokens from `provider.chat(...)`.

---

## Key Conventions

- **pgvector writes**: always use `prisma.$executeRaw` with `${vec}::vector`. Never use Prisma Client directly for the `embedding` column.
- **pdf-parse v2 API**: `new PDFParse({ data: buffer })` then `.getText()` — NOT a default-export function like v1.
- **mammoth import**: `const { default: mammoth } = await import("mammoth")` — needs `__esModule: true` in Jest mocks.
- **Dynamic imports in tests**: mock factories must include `__esModule: true` for correct `esModuleInterop` interop.
- **Ingestion is async**: `POST /api/documents` returns the document ID immediately; indexing runs in the background. Poll `status` field.
- **System prompt**: written in English to avoid biasing the LLM toward any specific response language.

---

## Important File Locations

| Path                                    | Purpose                                                    |
| --------------------------------------- | ---------------------------------------------------------- |
| `app/api/chat/route.ts`                 | Chat endpoint — retrieval + LLM streaming                  |
| `src/lib/retrieval/query.ts`            | Cross-language retrieval orchestration                     |
| `src/lib/ingest/pipeline.ts`            | Ingestion pipeline (parse → chunk → embed → store)         |
| `src/lib/ingest/parse.ts`               | File parser (md/txt/pdf/docx)                              |
| `src/lib/embeddings/bge.ts`             | Local bge-m3 embedding (singleton)                         |
| `src/lib/llm/router.ts`                 | LLM provider selection                                     |
| `src/components/chat/MessageBubble.tsx` | Citation marker rendering                                  |
| `prisma/schema.prisma`                  | DB schema                                                  |
| `jest.config.ts`                        | Jest + ts-jest config (CJS mode, `types: ["jest","node"]`) |
