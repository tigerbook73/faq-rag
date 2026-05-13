"use client";

import useSWR from "swr";
import Link from "next/link";
import { Files, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageShell } from "@/components/layout/PageShell";
import { type AdminDocumentItem as AdminDocument } from "@/lib/shared/schemas/document";
import { type AdminUserItem as AdminUser } from "@/lib/shared/schemas/user";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const { data: usersData } = useSWR<{ items: AdminUser[] }>("/api/admin/users", fetcher);
  const { data: docsData } = useSWR<{ items: AdminDocument[]; total: number }>(
    "/api/admin/documents?pageSize=5",
    fetcher,
  );

  const users = usersData?.items ?? [];
  const documents = docsData ?? { items: [], total: 0 };

  const adminCount = users.filter((u) => u.role === "admin").length;
  const userCount = users.filter((u) => u.role === "user").length;

  return (
    <PageShell className="max-w-(--container-app-workspace) space-y-6">
      <h1 className="text-app-title">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Users" value={users.length} />
        <StatCard title="Admins" value={adminCount} />
        <StatCard title="Users" value={userCount} />
        <StatCard title="Total Documents" value={documents.total} />
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
            {documents.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground text-center text-sm">
                  No documents found.
                </TableCell>
              </TableRow>
            ) : (
              documents.items.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{doc.owner.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        doc.status === "indexed" ? "default" : doc.status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={doc.visibility === "public" ? "outline" : "secondary"}>{doc.visibility}</Badge>
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
