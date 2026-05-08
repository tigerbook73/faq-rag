"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Files, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/layout/PageShell";
import type { AdminDocument } from "@/components/admin/AdminDocumentsWorkspace";

interface DashboardUser {
  id: string;
  role: string;
}

interface DashboardData {
  users: DashboardUser[];
  documents: { items: AdminDocument[]; total: number };
}

function AdminDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-(--container-app-workspace) space-y-6 px-(--spacing-app-page-x) py-(--spacing-app-page-y)">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/documents?pageSize=5").then((r) => r.json()),
    ]).then(([usersData, docsData]) => {
      setData({
        users: usersData.items ?? [],
        documents: { items: docsData.items ?? [], total: docsData.total ?? 0 },
      });
    });
  }, []);

  if (!data) return <AdminDashboardSkeleton />;

  const adminCount = data.users.filter((u) => u.role === "admin").length;
  const userCount = data.users.filter((u) => u.role === "user").length;

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-6">
      <h1 className="text-app-title">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Users" value={data.users.length} />
        <StatCard title="Admins" value={adminCount} />
        <StatCard title="Users" value={userCount} />
        <StatCard title="Total Documents" value={data.documents.total} />
      </div>

      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/admin/users" />}>
          <Users className="h-4 w-4" />
          Manage Users
        </Button>
        <Button nativeButton={false} variant="outline" render={<Link href="/admin/documents" />}>
          <Files className="h-4 w-4" />
          Manage Documents
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-app-section">Recent Documents</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Filename</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visibility</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.documents.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center text-sm">
                  No documents found.
                </TableCell>
              </TableRow>
            ) : (
              data.documents.items.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{doc.owner.email}</TableCell>
                  <TableCell>
                    <Badge variant={doc.status === "indexed" ? "default" : doc.status === "failed" ? "destructive" : "secondary"}>
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.visibility === "public" ? "outline" : "secondary"}>
                      {doc.visibility}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </PageShell>
  );
}
