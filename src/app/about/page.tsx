import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";

export default function AboutPage() {
  return (
    <PageShell className="max-w-(--container-app-readable) space-y-6">
      <div className="space-y-2">
        <h1 className="text-app-title font-bold">FAQ-RAG</h1>
        <p className="text-muted-foreground text-app-body">
          A production-grade Retrieval-Augmented Generation (RAG) system for multilingual document Q&amp;A with
          streaming LLM responses.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-app-section font-semibold">Key Features</h2>
        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
          <li>Upload and manage private knowledge bases (PDF / DOCX / Markdown / TXT)</li>
          <li>Multilingual Q&amp;A (English / Chinese) with real-time streamed answers</li>
          <li>Retrieval with semantic chunking, vector search, and query expansion (HyDE)</li>
          <li>Role-based access control (user / admin separation)</li>
          <li>Document sharing with owner-scoped permissions</li>
          <li>Admin dashboard for users, documents, and indexing operations</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-app-section font-semibold">Architecture Highlights</h2>
        <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
          <li>Hybrid retrieval pipeline: embedding + pgvector similarity search + reranking</li>
          <li>Multi-provider LLM support: OpenAI / Claude / DeepSeek</li>
          <li>Isolated retrieval layer (chunking, embedding, deduplication, citation formatting)</li>
          <li>Event-driven indexing via Supabase webhook + background processing</li>
        </ul>
      </div>

      <div className="space-y-2">
        <h2 className="text-app-section font-semibold">Tech Stack</h2>
        <p className="text-muted-foreground text-sm">
          Next.js · React 19 · TypeScript · Tailwind CSS · Supabase · PostgreSQL · pgvector · Prisma · BGE-M3 · OpenAI ·
          Claude · DeepSeek · Jest · Playwright
        </p>
      </div>
      <Link href="/chat/last" className={buttonVariants()}>
        Go to Chat
      </Link>
    </PageShell>
  );
}
