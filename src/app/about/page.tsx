import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/PageShell";

export default async function AboutPage() {
  return (
    <PageShell className="max-w-(--container-app-readable) space-y-6">
      <h1 className="text-app-title font-bold">About FAQ-RAG</h1>
      <p className="text-muted-foreground">
        FAQ-RAG is a local knowledge base Q&amp;A system powered by Retrieval-Augmented Generation. Upload documents in
        English or Chinese, then ask questions in either language and receive streamed answers with cited source chunks.
      </p>

      <div className="space-y-2">
        <h2 className="text-app-section font-semibold">How it works</h2>
        <ol className="text-muted-foreground list-inside list-decimal space-y-1">
          <li>Upload documents (PDF, DOCX, Markdown, or plain text) to the Knowledge Base</li>
          <li>Documents are chunked via semantic splitting and embedded with BGE-M3 (1024-dim)</li>
          <li>Your questions are translated, expanded via HyDE, and embedded in parallel</li>
          <li>Relevant chunks are retrieved by cosine vector search and reranked</li>
          <li>The LLM generates a streamed answer grounded in your documents, with citations</li>
        </ol>
      </div>

      <div className="space-y-2">
        <h2 className="text-app-section font-semibold">Tech stack</h2>
        <ul className="text-muted-foreground list-inside list-disc space-y-1">
          <li>Next.js 16 · React 19 · TypeScript · Tailwind CSS</li>
          <li>PostgreSQL + pgvector · Prisma ORM</li>
          <li>Embeddings: Xenova/bge-m3 (local, multilingual)</li>
          <li>LLM: Claude (Anthropic) or DeepSeek</li>
        </ul>
      </div>

      <Button nativeButton={false} render={<Link href="/chat/last" />}>
        Go to Chat
      </Button>
    </PageShell>
  );
}
