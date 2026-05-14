"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/layout/PageShell";
import { type AdminDocumentItem as AdminDocument } from "@/lib/shared/schemas/document";
import { type AdminUserItem as AdminUser } from "@/lib/shared/schemas/user";
import { fetcher } from "@/lib/client/swr";
import { useRouter } from "next/navigation";

function StatCard({ title, value, url }: { title: string; value: number; url?: string }) {
  const router = useRouter();
  return (
    <Card onClick={() => url && router.push(url)} className={url ? "cursor-pointer" : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function UserStatCard({ adminCount, userCount, url }: { adminCount: number; userCount: number; url: string }) {
  const router = useRouter();
  return (
    <Card onClick={() => router.push(url)} className="cursor-pointer">
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        <p className="text-sm">
          Admin: <span className="font-bold">{adminCount}</span>
        </p>
        <p className="text-sm">
          User: <span className="font-bold">{userCount}</span>
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: usersData } = useSWR<{ items: AdminUser[] }>("/api/admin/users", fetcher);
  const { data: docsData } = useSWR<{ items: AdminDocument[]; total: number }>(
    "/api/admin/documents?pageSize=1",
    fetcher,
  );

  const users = usersData?.items ?? [];
  const documents = docsData ?? { items: [], total: 0 };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-6">
      <h1 className="text-app-title">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4">
        <UserStatCard adminCount={adminCount} userCount={userCount} url="/admin/users" />
        <StatCard title="Total Documents" value={documents.total} url="/admin/documents" />
      </div>
    </PageShell>
  );
}
