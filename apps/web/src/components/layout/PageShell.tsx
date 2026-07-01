import { cn } from "@/lib/shared/utils";

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn("px-app-page-x py-app-page-y mx-auto w-full", className)}>{children}</div>
    </div>
  );
}
