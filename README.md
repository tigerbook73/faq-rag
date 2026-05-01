# FAQ RAG

A RAG-based FAQ system. Upload documents in Chinese or English, ask questions in either language, and receive streamed answers with cited sources.

> Next.js 16 · Supabase (Auth + Storage + PostgreSQL/pgvector) · Claude / DeepSeek / OpenAI · bge-m3 embeddings

## Features

- Streaming chat with inline citation markers
- Cross-language retrieval (Chinese ↔ English query expansion + HyDE)
- Semantic chunking with cosine-boundary detection
- Knowledge base management — upload, delete, reindex
- Multi-provider LLM switching (Claude, DeepSeek, OpenAI)
- Supabase email/password auth

## Local Setup

### Prerequisites

- Node.js ≥ 20 LTS + pnpm
- [Supabase CLI](https://supabase.com/docs/guides/cli) — spins up a local Supabase stack (PostgreSQL + Auth) via Docker
- Docker

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Supabase

```bash
pnpm sb:start
```

Starts local PostgreSQL (port 54322) and Supabase API (port 54321). Copy the printed keys into `.env.development.local` — see `.env.example` for the full variable list.

### 3. Migrate and configure

```bash
pnpm db:reset
```

Resets the local database, applies all migrations, and writes the ingest webhook config.

### 4. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the default local account: `admin@test.com` / `admin@123`.

## Remote Deployment

### Prerequisites

| Requirement | Notes |
|-------------|-------|
| Vercel account + project linked | `vercel link` once in the project root |
| Supabase Cloud project | Provides Auth, Storage, and PostgreSQL with pgvector |
| Supabase CLI linked locally | `supabase link --project-ref <ref>` once |
| `.env.cloud` configured | `NEXT_PUBLIC_APP_URL`, `INGEST_HOOK_SECRET`, DB connection strings |

> **Without Supabase Cloud**: the Storage webhook (`/api/ingest-hook`) will not fire — files uploaded via the UI won't be indexed automatically. Manual reindex from the UI remains available.
>
> **Without Vercel**: any Node.js-compatible host works, but `deploy:remote` only handles the database side. Configure env vars and deployments separately.

### Steps

1. Push to GitHub → Vercel deploys automatically
2. Sync env vars to Vercel — either via dashboard or:
   ```bash
   pnpm vercel:env:push
   ```
3. Apply DB migrations and configure the webhook:
   ```bash
   pnpm deploy:remote
   ```

## Scripts

```bash
# Dev
pnpm dev / build / start / lint / format

# Test
pnpm test                # Jest unit tests
pnpm e2e / e2e:ui        # Playwright E2E

# Database (local)
pnpm db:migrate          # Apply migrations
pnpm db:reset            # Reset + migrate + hook config
pnpm db:studio           # Prisma Studio

# Supabase local
pnpm sb:start / sb:stop / sb:restart / sb:status

# Webhook config
pnpm hook:set            # Write hook config to local DB
pnpm hook:query          # Read hook config from local DB
pnpm hook:prod:set       # Write hook config to remote DB
pnpm hook:prod:query     # Read hook config from remote DB

# Remote deployment
pnpm deploy:remote       # supabase db push + prisma migrate deploy + hook:prod:set
```

---

For architecture details, data models, and key conventions, see [CLAUDE.md](CLAUDE.md).
