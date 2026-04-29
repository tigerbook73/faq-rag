# FAQ RAG

A full-stack FAQ question-answering system built with Retrieval-Augmented Generation. Upload documents in Chinese or English, ask questions in either language, and get streamed answers with cited sources in real time.

## Features

- **Streaming chat** — SSE-based streaming with inline citation markers `[^n]`
- **Cross-language retrieval** — query expansion translates the question into both languages before vector search, so a Chinese question finds English documents and vice versa
- **HyDE retrieval** — generates a hypothetical answer to improve embedding alignment before vector search
- **Semantic chunking** — cosine-boundary splitting preserves paragraph coherence; falls back to `RecursiveCharacterTextSplitter`
- **Knowledge base management** — upload, list, delete, and re-index documents from the UI
- **Provider switching** — choose between Claude, DeepSeek, and OpenAI at query time
- **Supported formats** — `.md`, `.txt`, `.pdf`, `.docx`
- **Idempotent ingestion** — SHA-256 content hash prevents duplicate indexing
- **Auth** — Supabase email/password sign-in; all routes except `/about` and `/auth/signin` are protected

## Tech Stack

| Layer           | Technology                                                                             |
| --------------- | -------------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) + React 19 + TypeScript                                        |
| UI              | Tailwind CSS + shadcn/ui                                                               |
| Database        | PostgreSQL 16 + pgvector (via Supabase local CLI)                                      |
| ORM             | Prisma                                                                                 |
| Auth            | Supabase Auth — email/password, session cookies via `@supabase/ssr`                    |
| Storage         | Supabase Storage — uploaded files in `documents` bucket                                |
| Embedding       | `Xenova/bge-m3` (local, 1024-dim) **or** `text-embedding-3-small` (OpenAI) via `EMBEDDING_PROVIDER` |
| LLM             | Claude `claude-sonnet-4-6` / DeepSeek `deepseek-chat` / OpenAI `gpt-4o-mini` — selectable |
| Text splitting  | Semantic chunking (cosine boundary) + `@langchain/textsplitters` fallback              |
| Reranking       | `Xenova/bge-reranker-base` cross-encoder (available, disabled by default)             |
| Language detect | `franc-min`                                                                            |
| Testing         | Jest + ts-jest + Playwright                                                            |

## Prerequisites

- Node.js ≥ 20 LTS
- pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase` or equivalent) — provides local PostgreSQL + Auth

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your keys:

```env
# Embedding mode: "local" (default, no API key) or "openai"
EMBEDDING_PROVIDER=local

# LLM API keys — only the providers you plan to use
ANTHROPIC_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx
OPENAI_API_KEY=sk-proj-xxx          # also needed if EMBEDDING_PROVIDER=openai

# Default provider shown in the UI
NEXT_PUBLIC_DEFAULT_PROVIDER=claude

# Supabase — filled after step 3
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Prisma — Supabase local PostgreSQL runs on port 54322
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

### 3. Start Supabase (local)

```bash
pnpm sb:start
```

After startup, `pnpm sb:status` prints the local keys — paste them into `.env.local`.

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/auth/signin`; use the email/password you configured in Supabase.

## Usage

### Ingest documents via CLI

```bash
pnpm ingest ./path/to/docs
```

Or upload directly from the UI at `/knowledge`.

### Chat

Go to `/chat/new`, select a provider, and ask questions. Citation markers in the answer are clickable and open a drawer showing the source chunk.

## API Routes

| Method          | Path                             | Description                            |
| --------------- | -------------------------------- | -------------------------------------- |
| `POST`          | `/api/chat`                      | Streaming SSE chat with citations      |
| `GET`           | `/api/documents`                 | List documents (paginated)             |
| `POST`          | `/api/documents`                 | Upload and index a document            |
| `GET`           | `/api/documents/:id`             | Get document details                   |
| `DELETE`        | `/api/documents/:id`             | Delete document and its chunks         |
| `POST`          | `/api/documents/:id/reindex`     | Re-chunk and re-embed a document       |
| `GET` / `POST`  | `/api/sessions`                  | List / create chat sessions            |
| `GET` / `PATCH` / `DELETE` | `/api/sessions/:id`  | Get / update / delete a session        |
| `GET`           | `/api/health`                    | Database connectivity check            |

## Scripts

```bash
pnpm dev           # Start development server
pnpm build         # Production build (runs prisma generate first)
pnpm start         # Start production server
pnpm test          # Run Jest unit tests
pnpm e2e           # Run Playwright E2E tests
pnpm e2e:ui        # Playwright with interactive UI
pnpm ingest        # CLI document ingestion
pnpm eval          # Retrieval quality evaluation script
pnpm lint          # TypeScript check + ESLint with auto-fix
pnpm format        # Prettier
pnpm db:migrate    # Run Prisma migrations (dev)
pnpm db:studio     # Open Prisma Studio
pnpm sb:start      # Start Supabase local stack
pnpm sb:stop       # Stop Supabase local stack
pnpm sb:restart    # Restart Supabase
pnpm sb:status     # Print local Supabase URLs and keys
```

## Project Structure

```
src/
  app/
    api/
      chat/           # Streaming SSE chat endpoint
      documents/      # Document CRUD + reindex
      sessions/       # Chat session CRUD
      health/         # DB health check
    auth/
      signin/         # Email/password sign-in page
      signout/        # Sign-out route handler
    chat/
      [id]/           # Chat page (server-hydrated session)
      new/            # New empty chat
      last/           # Redirect to last active chat
    knowledge/        # Knowledge base management page + server actions
    about/            # Public about page (no auth required)

  components/
    chat/             # ChatWindow, ChatSidebar, MessageBubble, CitationDrawer, ProviderSelect
    knowledge/        # UploadZone, DocumentTable
    layout/           # TopBar, AppSidebar, PageShell
    ui/               # shadcn/ui primitives

  context/
    auth-context.tsx      # Reactive auth state (isAuthenticated)
    page-title-context.tsx
    provider-context.tsx

  lib/
    db/client.ts          # Prisma singleton
    supabase/server.ts    # Supabase SSR + service-role clients
    storage/index.ts      # Supabase Storage helpers
    embeddings/           # bge.ts (local), openai-embed.ts, router.ts (dispatch)
    ingest/               # parse, split, semantic-splitter, pipeline, worker, queue
    lang/detect.ts        # Language detection (franc-min)
    llm/                  # claude.ts, deepseek.ts, openai.ts, router.ts, types.ts, truncate.ts, clients.ts
    retrieval/            # query.ts, vector-search.ts, rerank.ts, cross-encoder.ts
    chat-storage.ts       # Session API wrappers
    config.ts             # Central constants
    rate-limit.ts         # In-memory rate limiter
    logger.ts             # Pino logger

  proxy.ts               # Next.js middleware — Supabase auth guard

prisma/
  schema.prisma           # Document, Chunk, Session, SessionMessage
  migrations/

scripts/
  ingest.ts               # CLI ingestion entrypoint
  eval-retrieval.ts       # Retrieval quality evaluation
```

## Database Schema

```
Document  id, name, mime, content_hash (unique SHA-256), lang, size_bytes,
          status (pending|indexed|failed), error_msg, total_chunks, file_path, created_at

Chunk     id, document_id → Document (cascade), ord, content, embedding vector(1024),
          lang, created_at
          HNSW index on embedding (cosine, m=16, ef_construction=64)

Session        id, title, created_at, updated_at

SessionMessage id, session_id → Session (cascade), role (user|assistant),
               content, citations (Json?), created_at
```

Chunks use `Unsupported("vector(1024)")` in Prisma; all vector writes go through `prisma.$executeRaw` with `::vector` cast. Similarity search uses cosine distance (`<=>`).
