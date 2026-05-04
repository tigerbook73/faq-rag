import { Skeleton } from "@/components/ui/skeleton";

export default function KnowledgeLoading() {
  return (
    <div className="mx-auto max-w-(--container-app-workspace) space-y-8 px-(--spacing-app-page-x) py-(--spacing-app-page-y)">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
