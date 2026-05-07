"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Files } from "lucide-react";

const NAV_ITEMS = [
  { label: "仪表板", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "用户管理", href: "/admin/users", icon: Users, exact: false },
  { label: "文档管理", href: "/admin/documents", icon: Files, exact: false },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-48 shrink-0 flex-col border-r py-2">
      {NAV_ITEMS.map(({ label, href, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`mx-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
