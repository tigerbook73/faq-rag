# FAQ RAG

A local FAQ question-answering system built with Retrieval-Augmented Generation. Upload documents in Chinese or English, ask questions in either language, and get answers with cited sources streamed back in real time.

## Features

- **Streaming chat** — SSE-based streaming with inline citation markers `[^n]`
- **Cross-language retrieval** — query expansion translates the question into both languages before vector search, so a Chinese question finds English documents and vice versa
- **Knowledge base management** — upload, list, delete, and re-index documents from the UI
- **Provider switching** — choose between Claude and DeepSeek at query time
- **Supported formats** — `.md`, `.txt`, `.pdf`, `.docx`
- **Idempotent ingestion** — SHA-256 content hash prevents duplicate indexing

## Tech Stack

| Layer           | Technology                                                                      |
| --------------- | ------------------------------------------------------------------------------- |
| Framework       | Next.js 16 (App Router) + React 19 + TypeScript                                 |
| UI              | Tailwind CSS + shadcn/ui                                                        |
| Database        | PostgreSQL 16 + pgvector (Docker)                                               |
| ORM             | Prisma                                                                          |
| Embedding       | `Xenova/bge-m3` via `@huggingface/transformers` (1024-dim, local, multilingual) |
| LLM — default   | DeepSeek `deepseek-chat` via `openai` SDK                                       |
| LLM — alternate | Claude `claude-sonnet-4-6` via `@anthropic-ai/sdk`                              |
| Text splitting  | `@langchain/textsplitters` RecursiveCharacterTextSplitter                       |
| Language detect | `franc-min`                                                                     |
| Testing         | Jest + ts-jest                                                                  |

## Prerequisites

- Node.js ≥ 20 LTS
- pnpm
- Docker (for PostgreSQL)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your API keys:

```env
DATABASE_URL=postgresql://faq:faq@localhost:5432/faq

ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-sonnet-4-6

DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_MODEL=deepseek-chat

EMBEDDING_MODEL=Xenova/bge-m3
EMBEDDING_DIM=1024

UPLOAD_DIR=./data/uploads
```

### 3. Start PostgreSQL

```bash
pnpm db:start
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

### Ingest documents via CLI

```bash
pnpm ingest ./path/to/docs
```

Or upload directly from the UI at `/knowledge`.

### Chat

Go to `/` (the root page), select a provider, and ask questions. Citation markers in the answer are clickable and open a drawer showing the source chunk.

## API Routes

| Method   | Path                         | Description                       |
| -------- | ---------------------------- | --------------------------------- |
| `POST`   | `/api/chat`                  | Streaming SSE chat with citations |
| `GET`    | `/api/documents`             | List documents (paginated)        |
| `POST`   | `/api/documents`             | Upload and index a document       |
| `GET`    | `/api/documents/:id`         | Get document details              |
| `DELETE` | `/api/documents/:id`         | Delete document and its chunks    |
| `POST`   | `/api/documents/:id/reindex` | Re-chunk and re-embed a document  |
| `GET`    | `/api/health`                | Database connectivity check       |

## Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm test         # Run Jest tests
pnpm ingest       # CLI document ingestion
pnpm lint         # ESLint with auto-fix
pnpm format       # Prettier
pnpm db:start     # Start PostgreSQL (Docker)
pnpm db:stop      # Stop PostgreSQL (Docker)
pnpm db:migrate   # Run Prisma migrations (dev)
pnpm db:studio    # Open Prisma Studio
pnpm prisma       # Prisma CLI passthrough
```

## Project Structure

```
app/
  api/chat/           # Streaming chat endpoint
  api/documents/      # Document CRUD + reindex
  api/health/         # Health check
  knowledge/          # Knowledge base management page
  page.tsx            # Chat page

src/
  components/
    chat/             # ChatWindow, MessageBubble, CitationDrawer, ProviderSelect
    knowledge/        # UploadZone, DocumentTable
  lib/
    db/client.ts      # Prisma singleton
    embeddings/bge.ts # Local bge-m3 embedding
    ingest/           # parse, split, pipeline
    lang/detect.ts    # Language detection (franc-min)
    llm/              # claude, deepseek, router, types
    retrieval/        # vector-search, query expansion, rerank

prisma/
  schema.prisma       # Document + Chunk models (pgvector via Unsupported)
  migrations/

scripts/
  ingest.ts           # CLI ingestion entrypoint
```

## Database Schema

```
Document  id, name, mime, content_hash (unique), lang, size_bytes, status, error_msg, created_at
Chunk     id, document_id, ord, content, embedding vector(1024), lang, created_at
```

Chunks are linked to their document with `onDelete: Cascade`. Vector similarity search uses cosine distance via pgvector's `<=>` operator with an HNSW index.
