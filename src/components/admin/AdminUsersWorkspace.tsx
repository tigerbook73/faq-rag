"use client";

import { useState } from "react";
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
}

interface AdminUsersWorkspaceProps {
  actorId: string;
  initialUsers: AdminUser[];
}

export function AdminUsersWorkspace({ actorId, initialUsers }: AdminUsersWorkspaceProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null);

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `创建用户失败 (${res.status})`);
      setUsers((curr) => [
        { id: data.id, email: data.email, role: data.role, createdAt: data.createdAt },
        ...curr,
      ]);
      setEmail("");
      setPassword("");
      router.refresh();
      toast.success("用户已创建");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建用户失败");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `删除用户失败 (${res.status})`);
      }
      setUsers((curr) => curr.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      router.refresh();
      toast.success("用户已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除用户失败");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleChangePassword() {
    if (!passwordTarget) return;
    if (newPassword.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    setChangingPasswordId(passwordTarget.id);
    try {
      const res = await fetch(`/api/admin/users/${passwordTarget.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `修改密码失败 (${res.status})`);
      }
      setPasswordTarget(null);
      setNewPassword("");
      toast.success("密码已修改");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "修改密码失败");
    } finally {
      setChangingPasswordId(null);
    }
  }

  return (
    <>
      <section className="space-y-4">
        <h2 className="text-app-section">创建用户</h2>
        <form
          onSubmit={handleCreateUser}
          className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <div className="space-y-2">
            <Label htmlFor="create-email">邮箱</Label>
            <Input
              id="create-email"
              type="email"
              autoComplete="off"
              value={email}
              disabled={creating}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">密码</Label>
            <Input
              id="create-password"
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={creating}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={creating}>
              {creating ? "创建中…" : "创建"}
            </Button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-app-section">用户列表</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead className="hidden sm:table-cell">注册日期</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground hidden text-sm sm:table-cell">
                  {new Date(user.createdAt).toLocaleDateString("zh-CN")}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPasswordTarget(user);
                        setNewPassword("");
                      }}
                    >
                      改密码
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={user.id === actorId || deletingId === user.id}
                      onClick={() => setDeleteTarget(user)}
                    >
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>删除用户？</DialogTitle>
            <DialogDescription>
              将删除用户 <strong>{deleteTarget?.email}</strong> 的账号、文档、会话及相关数据，此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant="destructive" disabled={!!deletingId} onClick={handleDeleteUser}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!passwordTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordTarget(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              为 <strong>{passwordTarget?.email}</strong> 设置新密码（至少 6 位）。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-password">新密码</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordTarget(null);
                setNewPassword("");
              }}
            >
              取消
            </Button>
            <Button
              disabled={!!changingPasswordId || newPassword.length < 6}
              onClick={handleChangePassword}
            >
              {changingPasswordId ? "修改中…" : "确认修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
