"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface AdminUser {
  id: string;
  email: string;
  role: "user" | "admin";
  createdAt: string;
  _count: {
    documents: number;
    sessions: number;
    publicDocumentSelections: number;
  };
}

export interface AdminDocument {
  id: string;
  name: string;
  ownerUserId: string;
  status: string;
  visibility: "private" | "public";
  createdAt: string;
  owner: { email: string };
  _count: { chunks: number; selections: number };
}

interface AdminWorkspaceProps {
  actorId: string;
  initialUsers: AdminUser[];
  initialDocuments: AdminDocument[];
}

export function AdminWorkspace({ actorId, initialUsers, initialDocuments }: AdminWorkspaceProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [documents, setDocuments] = useState(initialDocuments);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteUserTarget, setDeleteUserTarget] = useState<AdminUser | null>(null);
  const [deleteDocumentTarget, setDeleteDocumentTarget] = useState<AdminDocument | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const sortedUsers = useMemo(() => users, [users]);
  const sortedDocuments = useMemo(() => documents, [documents]);

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "user" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Create user failed (${res.status})`);

      setUsers((current) => [
        {
          id: data.id,
          email: data.email,
          role: data.role,
          createdAt: data.createdAt,
          _count: { documents: 0, sessions: 0, publicDocumentSelections: 0 },
        },
        ...current,
      ]);
      setEmail("");
      setPassword("");
      router.refresh();
      toast.success("User created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create user failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteUserTarget) return;
    setDeletingUserId(deleteUserTarget.id);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Delete user failed (${res.status})`);
      }
      setUsers((current) => current.filter((user) => user.id !== deleteUserTarget.id));
      setDocuments((current) => current.filter((document) => document.ownerUserId !== deleteUserTarget.id));
      setDeleteUserTarget(null);
      router.refresh();
      toast.success("User deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete user failed");
    } finally {
      setDeletingUserId(null);
    }
  }

  async function handleDeleteDocument() {
    if (!deleteDocumentTarget) return;
    setDeletingDocumentId(deleteDocumentTarget.id);
    try {
      const res = await fetch(`/api/admin/documents/${deleteDocumentTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Delete document failed (${res.status})`);
      }
      setDocuments((current) => current.filter((document) => document.id !== deleteDocumentTarget.id));
      setDeleteDocumentTarget(null);
      router.refresh();
      toast.success("Document deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete document failed");
    } finally {
      setDeletingDocumentId(null);
    }
  }

  return (
    <>
      <section className="space-y-4">
        <div>
          <h1 className="text-app-title">Admin</h1>
          <p className="text-app-muted">Users and documents across the workspace.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-app-section">Create user</h2>
        <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label htmlFor="admin-create-email">Email</Label>
            <Input
              id="admin-create-email"
              type="email"
              autoComplete="off"
              value={email}
              disabled={creating}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-create-password">Password</Label>
            <Input
              id="admin-create-password"
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={creating}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-app-section">Users</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden sm:table-cell">Documents</TableHead>
              <TableHead className="hidden sm:table-cell">Sessions</TableHead>
              <TableHead className="hidden md:table-cell">Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{user._count.documents}</TableCell>
                <TableCell className="hidden sm:table-cell">{user._count.sessions}</TableCell>
                <TableCell className="text-muted-foreground hidden text-xs md:table-cell">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={user.id === actorId || deletingUserId === user.id}
                    onClick={() => setDeleteUserTarget(user)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-4">
        <h2 className="text-app-section">Documents</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Visibility</TableHead>
              <TableHead className="hidden md:table-cell">Selections</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedDocuments.map((document) => (
              <TableRow key={document.id}>
                <TableCell className="max-w-48 truncate font-medium sm:max-w-80">{document.name}</TableCell>
                <TableCell className="hidden sm:table-cell">{document.owner.email}</TableCell>
                <TableCell>
                  <Badge variant={document.status === "failed" ? "destructive" : "secondary"}>{document.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{document.visibility}</TableCell>
                <TableCell className="hidden md:table-cell">{document._count.selections}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingDocumentId === document.id}
                    onClick={() => setDeleteDocumentTarget(document)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={!!deleteUserTarget} onOpenChange={(open) => !open && setDeleteUserTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This removes the user profile, auth account, chats, documents, indexed chunks, and selections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUserTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!!deletingUserId} onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDocumentTarget} onOpenChange={(open) => !open && setDeleteDocumentTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This removes the document, indexed chunks, storage file, and all public selections.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDocumentTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!!deletingDocumentId} onClick={handleDeleteDocument}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
