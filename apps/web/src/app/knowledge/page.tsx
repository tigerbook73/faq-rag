import { KnowledgeWorkspace } from "@/components/knowledge/KnowledgeWorkspace";
import { PageShell } from "@/components/layout/PageShell";
import { config } from "@/lib/shared/config";

export default function KnowledgePage() {
  const maxBytes = config.embedding.useOpenAI ? config.embedding.maxBytesCloud : config.embedding.maxBytesLocal;
  return (
    <PageShell className="max-w-(--container-app-workspace)">
      <KnowledgeWorkspace maxBytes={maxBytes} />
    </PageShell>
  );
}
