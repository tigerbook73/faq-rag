"use client";

import { useState, useEffect } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminUsersWorkspace, type AdminUser } from "@/components/admin/AdminUsersWorkspace";

function AdminUsersSkeleton() {
  return (
    <div className="mx-auto max-w-(--container-app-workspace) space-y-6 px-(--spacing-app-page-x) py-(--spacing-app-page-y)">
      <Skeleton className="h-8 w-24" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [actorId, setActorId] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([usersData, me]) => {
      setUsers(usersData.items ?? []);
      setActorId(me.id ?? "");
    });
  }, []);

  if (!users) return <AdminUsersSkeleton />;

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-6">
      <h1 className="text-app-title">Users</h1>
      <AdminUsersWorkspace actorId={actorId} initialUsers={users} />
    </PageShell>
  );
}
