import { Skeleton } from "@/src/components/ui/skeleton";

export default function KnowledgeLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
