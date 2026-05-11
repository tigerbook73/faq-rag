import { KnowledgeWorkspace } from "@/components/knowledge/KnowledgeWorkspace";
import { PageShell } from "@/components/layout/PageShell";

export default function KnowledgePage() {
  return (
    <PageShell className="max-w-(--container-app-workspace)">
      <KnowledgeWorkspace />
    </PageShell>
  );
}
