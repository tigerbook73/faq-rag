import { cn } from "@/lib/shared/utils";

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("mx-auto w-full px-(--spacing-app-page-x) py-(--spacing-app-page-y)", className)}>
        {children}
      </div>
    </div>
  );
}
