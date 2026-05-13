"use client";

import { useState } from "react";
import useSWR from "swr";
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
import { CreateUserInputSchema, type AdminUserItem as AdminUser } from "@/lib/shared/schemas/user";
import { createUser, deleteUser, updateUserPassword } from "@/lib/client/admin-api";
import { useAuth } from "@/context/auth-context";
import { fetcher } from "@/lib/client/swr";
import { parseZodFieldErrors } from "@/lib/shared/form-utils";
import { useDialog } from "@/hooks/useDialog";

const SWR_KEY = "/api/admin/users";

export function AdminUsersWorkspace() {
  const { id: actorId } = useAuth();
  const { data, mutate } = useSWR<{ items: AdminUser[] }>(SWR_KEY, fetcher);
  const users = data?.items ?? [];

  const createDialog = useDialog();
  const deleteDialog = useDialog<AdminUser>();
  const passwordDialog = useDialog<AdminUser>();

  // Create user form fields
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createErrors, setCreateErrors] = useState<{ email?: string; password?: string }>({});
  const [creating, setCreating] = useState(false);

  // Loading states for async operations
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [changingPasswordId, setChangingPasswordId] = useState<string | null>(null);

  // Change password form fields
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();

  function handleCreateDialogChange(open: boolean) {
    if (!open) {
      setCreateEmail("");
      setCreatePassword("");
      setCreateErrors({});
      createDialog.close();
    }
  }

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();
    const result = CreateUserInputSchema.safeParse({ email: createEmail, password: createPassword });
    if (!result.success) {
      setCreateErrors(parseZodFieldErrors<{ email: string; password: string }>(result.error));
      return;
    }
    setCreateErrors({});
    setCreating(true);
    try {
      await createUser({ email: createEmail, password: createPassword });
      createDialog.close();
      await mutate();
      toast.success("User created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteUser() {
    if (!deleteDialog.data) return;
    setDeletingId(deleteDialog.data.id);
    try {
      await deleteUser(deleteDialog.data.id);
      deleteDialog.close();
      await mutate();
      toast.success("User deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleChangePassword() {
    if (!passwordDialog.data) return;
    const result = CreateUserInputSchema.shape.password.safeParse(newPassword);
    if (!result.success) {
      setPasswordError(result.error.issues[0]?.message);
      return;
    }
    setPasswordError(undefined);
    setChangingPasswordId(passwordDialog.data.id);
    try {
      await updateUserPassword(passwordDialog.data.id, { password: newPassword });
      passwordDialog.close();
      setNewPassword("");
      toast.success("Password updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setChangingPasswordId(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-app-section">Users</h2>
        <Button size="sm" onClick={createDialog.openEmpty}>
          Add User
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden sm:table-cell">Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                {new Date(user.createdAt).toLocaleDateString("en-CA")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      passwordDialog.openWith(user);
                      setNewPassword("");
                      setPasswordError(undefined);
                    }}
                  >
                    Change Password
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={user.id === actorId || deletingId === user.id}
                    onClick={() => deleteDialog.openWith(user)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add User Dialog */}
      <Dialog open={createDialog.open} onOpenChange={handleCreateDialogChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>Create a new user account with role &quot;user&quot;.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                autoComplete="off"
                value={createEmail}
                disabled={creating}
                onChange={(e) => setCreateEmail(e.target.value)}
              />
              {createErrors.email && <p className="text-destructive text-sm">{createErrors.email}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                autoComplete="new-password"
                value={createPassword}
                disabled={creating}
                onChange={(e) => setCreatePassword(e.target.value)}
              />
              {createErrors.password && <p className="text-destructive text-sm">{createErrors.password}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={creating} onClick={createDialog.close}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={deleteDialog.onOpenChange}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete User?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteDialog.data?.email}</strong>&apos;s account, documents,
              sessions, and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={deleteDialog.close}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={!!deletingId} onClick={handleDeleteUser}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={passwordDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            passwordDialog.close();
            setNewPassword("");
            setPasswordError(undefined);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{passwordDialog.data?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                passwordDialog.close();
                setNewPassword("");
                setPasswordError(undefined);
              }}
            >
              Cancel
            </Button>
            <Button disabled={!!changingPasswordId} onClick={handleChangePassword}>
              {changingPasswordId ? "Updating…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
