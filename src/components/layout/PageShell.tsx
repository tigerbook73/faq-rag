import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className={cn("mx-auto w-full px-4 py-8", className)}>{children}</div>
    </div>
  );
}
