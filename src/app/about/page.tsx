import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AboutPage() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-3xl md:w-[80%] w-full mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">About FAQ-RAG</h1>
        <p className="text-muted-foreground">
          FAQ-RAG is a local knowledge base Q&amp;A system powered by Retrieval-Augmented Generation. Upload documents
          in Chinese or English, then ask questions in either language and receive streamed answers with cited source
          chunks.
        </p>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">How it works</h2>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Upload documents (PDF, DOCX, Markdown, or plain text) to the Knowledge Base</li>
            <li>Documents are chunked via semantic splitting and embedded with BGE-M3 (1024-dim)</li>
            <li>Your questions are translated, expanded via HyDE, and embedded in parallel</li>
            <li>Relevant chunks are retrieved by cosine vector search and reranked</li>
            <li>The LLM generates a streamed answer grounded in your documents, with citations</li>
          </ol>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Tech stack</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Next.js 16 · React 19 · TypeScript · Tailwind CSS</li>
            <li>PostgreSQL + pgvector · Prisma ORM</li>
            <li>Embeddings: Xenova/bge-m3 (local, multilingual)</li>
            <li>LLM: Claude (Anthropic) or DeepSeek</li>
          </ul>
        </div>

        <Button render={<Link href="/chat/new" />}>Start Chatting</Button>
      </div>
    </div>
  );
}
